import { useEffect, useRef, useState } from 'react'
import type { VoiceParticipant, AudioDevices } from '@/hooks/useWebRTC'

interface Props {
  participants: VoiceParticipant[]
  muted: boolean
  devices: AudioDevices
  micDeviceId: string
  speakerDeviceId: string
  onChangeMic: (id: string) => void
  onChangeSpeaker: (id: string) => void
  onToggleMute: () => void
  onLeave: () => void
}

function RemoteAudio({ stream, sinkId }: { stream: MediaStream; sinkId: string }) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.srcObject = stream
    // iOS requires explicit play() even with autoPlay attribute
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

export function VoicePanel({
  participants, muted,
  devices, micDeviceId, speakerDeviceId,
  onChangeMic, onChangeSpeaker,
  onToggleMute, onLeave,
}: Props) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="shrink-0 border-t border-[#1e1f22] bg-[#232428] px-3 py-2">
      {/* Hidden audio elements — this is what actually plays remote audio */}
      {participants.map((p) =>
        p.stream ? <RemoteAudio key={p.userId} stream={p.stream} sinkId={speakerDeviceId} /> : null
      )}

      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#3ba55d] animate-pulse" />
          <span className="text-xs font-semibold text-[#3ba55d]">Voice Connected</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings((v) => !v)}
            title="Audio settings"
            className={`rounded p-1 transition-colors ${showSettings ? 'text-[#dbdee1] bg-[#35373c]' : 'text-[#80848e] hover:text-[#dbdee1]'}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
          <button
            onClick={onLeave}
            title="Leave voice"
            className="rounded p-1 text-[#f04747] hover:bg-[#f0474720] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08C.11 12.9 0 12.65 0 12.38c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-2 space-y-2 rounded bg-[#1e1f22] p-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#949ba4]">
              Microphone
            </label>
            <select
              value={micDeviceId}
              onChange={(e) => onChangeMic(e.target.value)}
              className="w-full rounded bg-[#2b2d31] px-2 py-1 text-xs text-[#dbdee1] outline-none focus:ring-1 focus:ring-[#5865f2]"
            >
              {devices.mics.length === 0 && <option value="">Default</option>}
              {devices.mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#949ba4]">
              Speaker
            </label>
            <select
              value={speakerDeviceId}
              onChange={(e) => onChangeSpeaker(e.target.value)}
              className="w-full rounded bg-[#2b2d31] px-2 py-1 text-xs text-[#dbdee1] outline-none focus:ring-1 focus:ring-[#5865f2]"
            >
              <option value="">Default</option>
              {devices.speakers.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Speaker ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {participants.map((p) => (
          <div key={p.userId} className="flex items-center gap-1 rounded bg-[#35373c] px-2 py-1">
            <div className="flex size-5 items-center justify-center rounded-full bg-[#5865f2] text-[9px] font-bold text-white">
              {p.username[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-[#dbdee1]">{p.username}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={onToggleMute}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${muted ? 'bg-[#f04747] text-white' : 'bg-[#35373c] text-[#dbdee1] hover:bg-[#404249]'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            {muted
              ? <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
              : <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            }
          </svg>
          {muted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </div>
  )
}
