import { useEffect, useRef } from 'react'
import type { VoiceParticipant } from '@/hooks/useWebRTC'

interface Props {
  participants: VoiceParticipant[]
  speakerDeviceId: string
}

function RemoteAudio({ stream, sinkId }: { stream: MediaStream; sinkId: string }) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.srcObject = stream
    el.play().catch(() => {})
  }, [stream])

  useEffect(() => {
    const el = ref.current
    if (!el || !sinkId) return
    if ('setSinkId' in el) {
      ;(el as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
        .setSinkId(sinkId)
        .catch(() => {})
    }
  }, [sinkId])

  return <audio ref={ref} autoPlay playsInline className="hidden" />
}

export function VoicePanel({ participants, speakerDeviceId }: Props) {
  return (
    <>
      {participants.map((p) =>
        p.stream ? <RemoteAudio key={p.userId} stream={p.stream} sinkId={speakerDeviceId} /> : null
      )}
    </>
  )
}
