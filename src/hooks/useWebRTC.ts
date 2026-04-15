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

export function useWebRTC({ roomId, myUserId, sendWS, connected }: UseWebRTCOptions) {
  const [inVoice, setInVoice] = useState(false)
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [muted, setMuted] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [devices, setDevices] = useState<AudioDevices>({ mics: [], speakers: [] })
  const [micDeviceId, setMicDeviceId] = useState('')
  const [speakerDeviceId, setSpeakerDeviceId] = useState('')
  const localStream = useRef<MediaStream | null>(null)
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map())

  const createPeer = useCallback((targetUserId: string, polite: boolean): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (e) => {
      if (!e.candidate || !roomId) return
      sendWS({
        type: 'ice_candidate',
        room_id: roomId,
        target_user_id: targetUserId,
        candidate: e.candidate.candidate,
        sdp_mid: e.candidate.sdpMid ?? '',
        sdp_m_line_index: e.candidate.sdpMLineIndex ?? 0,
      })
    }

    pc.ontrack = (e) => {
      const stream = e.streams[0]
      setParticipants((prev) =>
        prev.map((p) => p.userId === targetUserId ? { ...p, stream } : p)
      )
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => pc.addTrack(t, localStream.current!))
    }

    if (!polite && roomId) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer)
        sendWS({
          type: 'voice_offer',
          room_id: roomId,
          target_user_id: targetUserId,
          sdp: offer.sdp,
          sdp_type: offer.type,
        })
      })
    }

    return pc
  }, [roomId, sendWS])

  const joinVoice = useCallback(async () => {
    if (!roomId) return
    setMicError(null)
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : { echoCancellation: true, noiseSuppression: true },
          video: false,
        })
      } catch (constraintErr) {
        const n = (constraintErr as DOMException)?.name
        // iOS may reject advanced constraints — retry with bare audio
        if (n === 'OverconstrainedError' || n === 'NotReadableError' || n === 'AbortError') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        } else {
          throw constraintErr
        }
      }
      localStream.current = stream
      // Join voice first so the user isn't blocked by device enumeration
      setInVoice(true)
      sendWS({ type: 'voice_join', room_id: roomId })
      // Non-fatal: enumerate devices for mic/speaker selector (may be limited on iOS)
      try {
        const all = await navigator.mediaDevices.enumerateDevices()
        setDevices({
          mics: all.filter((d) => d.kind === 'audioinput'),
          speakers: all.filter((d) => d.kind === 'audiooutput'),
        })
      } catch { /* device enumeration optional */ }
    } catch (err) {
      const name = (err as DOMException)?.name
      const message = (err as DOMException)?.message ?? String(err)
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName })
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
  }, [roomId, sendWS, micDeviceId])

  const leaveVoice = useCallback(() => {
    if (!roomId) return
    localStream.current?.getTracks().forEach((t) => t.stop())
    localStream.current = null
    peers.current.forEach((pc) => pc.close())
    peers.current.clear()
    setParticipants([])
    setInVoice(false)
    sendWS({ type: 'voice_leave', room_id: roomId })
  }, [roomId, sendWS])

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
    if (!roomId) return

    if (msg.type === 'voice_participants' && msg.participants) {
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
      setParticipants((prev) => [...prev, { userId: uid, username: msg.username ?? uid }])
      if (!peers.current.has(uid)) {
        const pc = createPeer(uid, true)
        peers.current.set(uid, pc)
      }
    }

    if (msg.type === 'voice_left' && msg.user_id) {
      const uid = msg.user_id.toString()
      peers.current.get(uid)?.close()
      peers.current.delete(uid)
      setParticipants((prev) => prev.filter((p) => p.userId !== uid))
    }

    if (msg.type === 'voice_offer' && msg.user_id && msg.sdp) {
      const uid = msg.user_id.toString()
      let pc = peers.current.get(uid)
      if (!pc) { pc = createPeer(uid, true); peers.current.set(uid, pc) }
      await pc.setRemoteDescription({ type: msg.sdp_type as RTCSdpType, sdp: msg.sdp })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendWS({ type: 'voice_answer', room_id: roomId, target_user_id: uid, sdp: answer.sdp, sdp_type: answer.type })
    }

    if (msg.type === 'voice_answer' && msg.user_id && msg.sdp) {
      const pc = peers.current.get(msg.user_id.toString())
      if (pc) await pc.setRemoteDescription({ type: msg.sdp_type as RTCSdpType, sdp: msg.sdp })
    }

    if (msg.type === 'ice_candidate' && msg.user_id && msg.candidate) {
      const pc = peers.current.get(msg.user_id.toString())
      if (pc) await pc.addIceCandidate({ candidate: msg.candidate, sdpMid: msg.sdp_mid, sdpMLineIndex: msg.sdp_m_line_index })
    }
  }, [roomId, myUserId, createPeer, sendWS])

  // When WS disconnects, the server removes us from all voice rooms.
  // Reset local voice state so joinVoice() fires again on reconnect.
  const prevConnectedRef = useRef(false)
  useEffect(() => {
    if (!connected && prevConnectedRef.current) {
      localStream.current?.getTracks().forEach((t) => t.stop())
      localStream.current = null
      peers.current.forEach((pc) => pc.close())
      peers.current.clear()
      setParticipants([])
      setInVoice(false)
    }
    prevConnectedRef.current = connected
  }, [connected])

  // Cleanup on room change
  useEffect(() => {
    return () => {
      if (inVoice) leaveVoice()
    }
  }, [roomId]) // intentional: only cleanup when room changes

  return {
    inVoice, participants, muted, micError,
    devices, micDeviceId, speakerDeviceId,
    joinVoice, leaveVoice, toggleMute,
    changeMic, setSpeakerDevice: setSpeakerDeviceId,
    handleVoiceMessage,
  }
}
