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
  const wantVoiceRef = useRef(false)
  const roomIdRef = useRef(roomId)
  roomIdRef.current = roomId
  const sendWSRef = useRef(sendWS)
  sendWSRef.current = sendWS

  const createPeer = useCallback((targetUserId: string, polite: boolean): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

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
      setParticipants((prev) =>
        prev.map((p) => p.userId === targetUserId ? { ...p, stream } : p)
      )
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => pc.addTrack(t, localStream.current!))
    }

    if (!polite && roomIdRef.current) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer)
        sendWSRef.current({
          type: 'voice_offer',
          room_id: roomIdRef.current!,
          target_user_id: targetUserId,
          sdp: offer.sdp,
          sdp_type: offer.type,
        })
      }).catch(() => {})
    }

    return pc
  }, [])

  const joinVoice = useCallback(async (overrideRoomId?: string) => {
    const rid = overrideRoomId ?? roomIdRef.current
    if (!rid) return

    // CRITICAL: call getUserMedia FIRST, before ANY state updates.
    // iOS WebKit revokes transient activation after setState calls,
    // causing getUserMedia to fail with NotAllowedError silently.
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: micDeviceId
          ? { deviceId: { exact: micDeviceId } }
          : { echoCancellation: true, noiseSuppression: true },
        video: false,
      })
    } catch (firstErr) {
      const n = (firstErr as DOMException)?.name
      if (n === 'OverconstrainedError' || n === 'NotReadableError' || n === 'AbortError') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        } catch (bareErr) {
          const name = (bareErr as DOMException)?.name
          const message = (bareErr as DOMException)?.message ?? String(bareErr)
          setMicError(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : `unknown: ${name ?? ''} ${message}`.trim())
          return
        }
      } else {
        const name = (firstErr as DOMException)?.name
        const message = (firstErr as DOMException)?.message ?? String(firstErr)
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setMicError('denied')
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setMicError('notfound')
        } else {
          setMicError(`unknown: ${name ?? ''} ${message}`.trim())
        }
        return
      }
    }

    setMicError(null)
    wantVoiceRef.current = true
    localStream.current = stream
    setInVoice(true)
    sendWSRef.current({ type: 'voice_join', room_id: rid })
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices({
        mics: all.filter((d) => d.kind === 'audioinput'),
        speakers: all.filter((d) => d.kind === 'audiooutput'),
      })
    } catch { /* device enumeration optional */ }
  }, [micDeviceId])

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

  const changeMic = useCallback(async (deviceId: string) => {
    setMicDeviceId(deviceId)
    if (!inVoice) return
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
      video: false,
    })
    localStream.current?.getTracks().forEach((t) => t.stop())
    localStream.current = newStream
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
      sendWSRef.current({ type: 'voice_answer', room_id: rid, target_user_id: uid, sdp: answer.sdp, sdp_type: answer.type })
    }

    if (msg.type === 'voice_answer' && msg.user_id && msg.sdp) {
      const pc = peers.current.get(msg.user_id.toString())
      if (pc) await pc.setRemoteDescription({ type: msg.sdp_type as RTCSdpType, sdp: msg.sdp })
    }

    if (msg.type === 'ice_candidate' && msg.user_id && msg.candidate) {
      const pc = peers.current.get(msg.user_id.toString())
      if (pc) await pc.addIceCandidate({ candidate: msg.candidate, sdpMid: msg.sdp_mid, sdpMLineIndex: msg.sdp_m_line_index })
    }
  }, [myUserId, createPeer])

  const prevConnectedRef = useRef(false)
  useEffect(() => {
    if (!connected && prevConnectedRef.current) {
      peers.current.forEach((pc) => pc.close())
      peers.current.clear()
      setParticipants([])
      if (!wantVoiceRef.current) {
        localStream.current?.getTracks().forEach((t) => t.stop())
        localStream.current = null
        setInVoice(false)
      }
    }
    if (connected && !prevConnectedRef.current) {
      if (wantVoiceRef.current && roomIdRef.current && localStream.current) {
        setInVoice(true)
        sendWSRef.current({ type: 'voice_join', room_id: roomIdRef.current })
      }
    }
    prevConnectedRef.current = connected
  }, [connected])

  return {
    inVoice, participants, muted, micError,
    devices, micDeviceId, speakerDeviceId,
    joinVoice, leaveVoice, toggleMute,
    changeMic, setSpeakerDevice: setSpeakerDeviceId,
    handleVoiceMessage,
  }
}
