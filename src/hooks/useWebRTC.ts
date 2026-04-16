import { useCallback, useEffect, useRef, useState } from 'react'
import type { WSServerMessage } from '@/types'

export interface VoiceParticipant {
  userId: string
  username: string
  stream?: MediaStream
}

export interface AudioDevices {
  mics: MediaDeviceInfo[]
  speakers: MediaDeviceInfo[]
}

interface UseWebRTCOptions {
  roomId: string | null
  myUserId: string
  sendWS: (msg: object) => void
  connected: boolean
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: import.meta.env.VITE_STUN_URL ?? 'stun:stun.l.google.com:19302' },
  ...(import.meta.env.VITE_TURN_URL
    ? [
        {
          urls: import.meta.env.VITE_TURN_URL as string,
          username: import.meta.env.VITE_TURN_USERNAME as string,
          credential: import.meta.env.VITE_TURN_CREDENTIAL as string,
        },
      ]
    : []),
]

// Wraps getUserMedia in a race with a timeout — prevents iOS hanging promises.
async function getUserMediaWithTimeout(constraints: MediaStreamConstraints, ms: number): Promise<MediaStream> {
  return Promise.race([
    navigator.mediaDevices.getUserMedia(constraints),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DOMException('getUserMedia timeout', 'TimeoutError')), ms)
    ),
  ])
}

export function useWebRTC({ roomId, myUserId, sendWS, connected }: UseWebRTCOptions) {
  const [inVoice, setInVoice] = useState(false)
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [muted, setMuted] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [devices, setDevices] = useState<AudioDevices>({ mics: [], speakers: [] })
  const [micDeviceId, setMicDeviceId] = useState('')
  const [speakerDeviceId, setSpeakerDeviceId] = useState('')
  const [voiceDebugLog, setVoiceDebugLog] = useState<string[]>([])
  const localStream = useRef<MediaStream | null>(null)
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map())
  // Tracks user intent — survives brief WS disconnects during iOS permission dialog
  const wantVoiceRef = useRef(false)
  const roomIdRef = useRef(roomId)
  roomIdRef.current = roomId
  const sendWSRef = useRef(sendWS)
  sendWSRef.current = sendWS

  const vlog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const entry = `${ts} ${msg}`
    console.warn('[Voice]', msg)
    setVoiceDebugLog((prev) => [...prev.slice(-49), entry])
  }, [])

  const createPeer = useCallback((targetUserId: string, polite: boolean): RTCPeerConnection => {
    vlog(`createPeer uid=${targetUserId.slice(0,8)} polite=${polite}`)
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.oniceconnectionstatechange = () => vlog(`ICE state ${targetUserId.slice(0,8)}: ${pc.iceConnectionState}`)
    pc.onconnectionstatechange = () => vlog(`PC state ${targetUserId.slice(0,8)}: ${pc.connectionState}`)

    pc.onicecandidate = (e) => {
      if (!e.candidate || !roomIdRef.current) return
      sendWSRef.current({
        type: 'ice_candidate',
        room_id: roomIdRef.current,
        target_user_id: targetUserId,
        candidate: e.candidate.candidate,
        sdp_mid: e.candidate.sdpMid ?? '',
        sdp_m_line_index: e.candidate.sdpMLineIndex ?? 0,
      })
    }

    pc.ontrack = (e) => {
      const stream = e.streams[0]
      vlog(`ontrack ${targetUserId.slice(0,8)} tracks=${stream?.getTracks().length}`)
      setParticipants((prev) =>
        prev.map((p) => p.userId === targetUserId ? { ...p, stream } : p)
      )
    }

    if (localStream.current) {
      const tracks = localStream.current.getTracks()
      vlog(`addTrack ${targetUserId.slice(0,8)} localTracks=${tracks.length} enabled=${tracks.map(t => t.enabled)}`)
      tracks.forEach((t) => pc.addTrack(t, localStream.current!))
    } else {
      vlog(`addTrack ${targetUserId.slice(0,8)} NO localStream`)
    }

    if (!polite && roomIdRef.current) {
      pc.createOffer().then((offer) => {
        vlog(`offer sent → ${targetUserId.slice(0,8)}`)
        pc.setLocalDescription(offer)
        sendWSRef.current({
          type: 'voice_offer',
          room_id: roomIdRef.current!,
          target_user_id: targetUserId,
          sdp: offer.sdp,
          sdp_type: offer.type,
        })
      }).catch((err) => vlog(`offer FAIL ${targetUserId.slice(0,8)}: ${err.message}`))
    }

    return pc
  }, [])

  const joinVoice = useCallback(async () => {
    const rid = roomIdRef.current
    if (!rid) return
    setMicError(null)
    wantVoiceRef.current = true
    setJoining(true)
    vlog(`joinVoice start room=${rid.slice(0,8)} ws=${connected ? 'ON' : 'OFF'}`)
    try {
      let stream: MediaStream
      try {
        vlog('getUserMedia requesting...')
        stream = await getUserMediaWithTimeout(
          {
            audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : { echoCancellation: true, noiseSuppression: true },
            video: false,
          },
          15000,
        )
        vlog(`getUserMedia OK tracks=${stream.getTracks().length} active=${stream.active}`)
      } catch (constraintErr) {
        const n = (constraintErr as DOMException)?.name
        vlog(`getUserMedia fail: ${n} — retrying bare audio`)
        // iOS may reject advanced constraints or hang — retry with bare audio
        if (n === 'OverconstrainedError' || n === 'NotReadableError' || n === 'AbortError' || n === 'TimeoutError') {
          stream = await getUserMediaWithTimeout({ audio: true, video: false }, 10000)
          vlog(`getUserMedia bare OK tracks=${stream.getTracks().length}`)
        } else {
          throw constraintErr
        }
      }
      localStream.current = stream
      const trackState = stream.getAudioTracks().map(t => `${t.label}:enabled=${t.enabled},muted=${t.muted},state=${t.readyState}`)
      vlog(`stream details: ${trackState.join(', ')}`)
      // Join voice first so the user isn't blocked by device enumeration
      setInVoice(true)
      setJoining(false)
      vlog(`sending voice_join room=${rid.slice(0,8)}`)
      sendWSRef.current({ type: 'voice_join', room_id: rid })
      // Non-fatal: enumerate devices for mic/speaker selector (may be limited on iOS)
      try {
        const all = await navigator.mediaDevices.enumerateDevices()
        vlog(`devices: ${all.filter(d => d.kind === 'audioinput').length} mics, ${all.filter(d => d.kind === 'audiooutput').length} speakers`)
        setDevices({
          mics: all.filter((d) => d.kind === 'audioinput'),
          speakers: all.filter((d) => d.kind === 'audiooutput'),
        })
      } catch { vlog('enumerateDevices failed (non-fatal)') }
    } catch (err) {
      setJoining(false)
      const name = (err as DOMException)?.name
      const message = (err as DOMException)?.message ?? String(err)
      vlog(`joinVoice ERROR: ${name} ${message}`)
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          vlog(`permission state: ${perm.state}`)
          setMicError(perm.state === 'denied' ? 'denied-permanent' : 'denied')
        } catch {
          setMicError('denied')
        }
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setMicError('notfound')
      } else {
        setMicError(`unknown: ${name ?? ''} ${message}`.trim())
      }
    }
  }, [micDeviceId, connected, vlog])

  const leaveVoice = useCallback(() => {
    const rid = roomIdRef.current
    if (!rid) return
    wantVoiceRef.current = false
    localStream.current?.getTracks().forEach((t) => t.stop())
    localStream.current = null
    peers.current.forEach((pc) => pc.close())
    peers.current.clear()
    setParticipants([])
    setInVoice(false)
    sendWSRef.current({ type: 'voice_leave', room_id: rid })
  }, [])

  // Switch mic while in voice
  const changeMic = useCallback(async (deviceId: string) => {
    setMicDeviceId(deviceId)
    if (!inVoice) return
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
      video: false,
    })
    localStream.current?.getTracks().forEach((t) => t.stop())
    localStream.current = newStream
    // Replace tracks in all peer connections
    peers.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'audio')
      if (sender) sender.replaceTrack(newStream.getAudioTracks()[0])
    })
    const isMuted = muted
    newStream.getAudioTracks().forEach((t) => { t.enabled = !isMuted })
  }, [inVoice, muted])

  const toggleMute = useCallback(() => {
    if (!localStream.current) return
    const next = !muted
    localStream.current.getAudioTracks().forEach((t) => { t.enabled = !next })
    setMuted(next)
  }, [muted])

  const handleVoiceMessage = useCallback(async (msg: WSServerMessage) => {
    const rid = roomIdRef.current
    if (!rid) return

    if (msg.type === 'voice_participants' && msg.participants) {
      vlog(`voice_participants: ${(msg.participants as string[]).length} peers`)
      const parts: VoiceParticipant[] = (msg.participants as string[]).map((uid) => ({
        userId: uid,
        username: uid.slice(0, 8),
      }))
      setParticipants(parts)
      for (const uid of msg.participants as string[]) {
        if (uid !== myUserId && !peers.current.has(uid)) {
          const pc = createPeer(uid, false)
          peers.current.set(uid, pc)
        }
      }
    }

    if (msg.type === 'voice_joined' && msg.user_id && msg.user_id.toString() !== myUserId) {
      const uid = msg.user_id.toString()
      vlog(`voice_joined: ${uid.slice(0,8)}`)
      setParticipants((prev) => [...prev, { userId: uid, username: msg.username ?? uid }])
      if (!peers.current.has(uid)) {
        const pc = createPeer(uid, true)
        peers.current.set(uid, pc)
      }
    }

    if (msg.type === 'voice_left' && msg.user_id) {
      const uid = msg.user_id.toString()
      vlog(`voice_left: ${uid.slice(0,8)}`)
      peers.current.get(uid)?.close()
      peers.current.delete(uid)
      setParticipants((prev) => prev.filter((p) => p.userId !== uid))
    }

    if (msg.type === 'voice_offer' && msg.user_id && msg.sdp) {
      const uid = msg.user_id.toString()
      vlog(`voice_offer from ${uid.slice(0,8)}`)
      let pc = peers.current.get(uid)
      if (!pc) { pc = createPeer(uid, true); peers.current.set(uid, pc) }
      await pc.setRemoteDescription({ type: msg.sdp_type as RTCSdpType, sdp: msg.sdp })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      vlog(`voice_answer sent → ${uid.slice(0,8)}`)
      sendWSRef.current({ type: 'voice_answer', room_id: rid, target_user_id: uid, sdp: answer.sdp, sdp_type: answer.type })
    }

    if (msg.type === 'voice_answer' && msg.user_id && msg.sdp) {
      vlog(`voice_answer from ${msg.user_id.toString().slice(0,8)}`)
      const pc = peers.current.get(msg.user_id.toString())
      if (pc) await pc.setRemoteDescription({ type: msg.sdp_type as RTCSdpType, sdp: msg.sdp })
    }

    if (msg.type === 'ice_candidate' && msg.user_id && msg.candidate) {
      const pc = peers.current.get(msg.user_id.toString())
      if (pc) await pc.addIceCandidate({ candidate: msg.candidate, sdpMid: msg.sdp_mid, sdpMLineIndex: msg.sdp_m_line_index })
    }
  }, [myUserId, createPeer, vlog])

  // Handle WS disconnect/reconnect. On iOS the WS can briefly drop during the
  // microphone permission dialog, so we preserve the user's intent (wantVoiceRef)
  // and re-register voice_join when the connection comes back.
  const prevConnectedRef = useRef(false)
  useEffect(() => {
    if (!connected && prevConnectedRef.current) {
      vlog(`WS LOST wantVoice=${wantVoiceRef.current} stream=${!!localStream.current}`)
      peers.current.forEach((pc) => pc.close())
      peers.current.clear()
      setParticipants([])
      if (!wantVoiceRef.current) {
        localStream.current?.getTracks().forEach((t) => t.stop())
        localStream.current = null
        setInVoice(false)
      } else {
        vlog('keeping stream alive for reconnect')
      }
    }
    if (connected && !prevConnectedRef.current) {
      vlog(`WS RECONNECT wantVoice=${wantVoiceRef.current} room=${roomIdRef.current?.slice(0,8)} stream=${!!localStream.current}`)
      if (wantVoiceRef.current && roomIdRef.current && localStream.current) {
        const tracks = localStream.current.getAudioTracks()
        vlog(`re-join voice, tracks=${tracks.length} state=${tracks.map(t => t.readyState)}`)
        setInVoice(true)
        sendWSRef.current({ type: 'voice_join', room_id: roomIdRef.current })
      }
    }
    prevConnectedRef.current = connected
  }, [connected, vlog])

  // Cleanup on room change
  useEffect(() => {
    return () => {
      if (inVoice) leaveVoice()
    }
  }, [roomId]) // intentional: only cleanup when room changes

  return {
    inVoice, joining, participants, muted, micError,
    devices, micDeviceId, speakerDeviceId,
    joinVoice, leaveVoice, toggleMute,
    changeMic, setSpeakerDevice: setSpeakerDeviceId,
    handleVoiceMessage, voiceDebugLog,
  }
}
