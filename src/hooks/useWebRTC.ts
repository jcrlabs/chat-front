import { useCallback, useEffect, useRef, useState } from 'react'
import type { WSServerMessage } from '@/types'

export interface VoiceParticipant {
  userId: string
  username: string
  stream?: MediaStream
}

interface UseWebRTCOptions {
  roomId: string | null
  myUserId: string
  sendWS: (msg: object) => void
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

export function useWebRTC({ roomId, myUserId, sendWS }: UseWebRTCOptions) {
  const [inVoice, setInVoice] = useState(false)
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [muted, setMuted] = useState(false)
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
      setParticipants((prev) =>
        prev.map((p) => p.userId === targetUserId ? { ...p, stream: e.streams[0] } : p)
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStream.current = stream
      setInVoice(true)
      sendWS({ type: 'voice_join', room_id: roomId })
    } catch {
      alert('Microphone access denied')
    }
  }, [roomId, sendWS])

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

  const toggleMute = useCallback(() => {
    if (!localStream.current) return
    const enabled = !muted
    localStream.current.getAudioTracks().forEach((t) => { t.enabled = enabled })
    setMuted(!enabled)
  }, [muted])

  const handleVoiceMessage = useCallback(async (msg: WSServerMessage) => {
    if (!roomId) return

    if (msg.type === 'voice_participants' && msg.participants) {
      const parts: VoiceParticipant[] = (msg.participants as string[]).map((uid) => ({
        userId: uid,
        username: uid.slice(0, 8),
      }))
      setParticipants(parts)
      // Initiate connections to existing participants
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
      // Polite peer — wait for offer
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

  // Cleanup on room change
  useEffect(() => {
    return () => {
      if (inVoice) leaveVoice()
    }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { inVoice, participants, muted, joinVoice, leaveVoice, toggleMute, handleVoiceMessage }
}
