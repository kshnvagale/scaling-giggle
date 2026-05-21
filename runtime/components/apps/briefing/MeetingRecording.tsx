"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MeetingRecording as MeetingRecordingType,
  MeetingParticipant,
  MeetingSegment,
} from "@/lib/types";

interface Props {
  recording: MeetingRecordingType;
}

// Deterministic tile color per participant — Google Meet-style background
// behind the initials when their camera is off.
const TILE_COLORS = [
  "#1f3a5f", // deep blue
  "#3a5a40", // forest green
  "#7c3a52", // mulberry
  "#b8651a", // burnt orange
  "#5b3a8c", // violet
  "#0f5e6e", // teal
  "#8a4a1f", // brown
  "#3d3d6b", // indigo
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TILE_COLORS[hash % TILE_COLORS.length];
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRecordedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Pick a grid layout that fits N tiles cleanly.
function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-3";
  return "grid-cols-4";
}

function findActiveSegment(
  segments: MeetingSegment[] | undefined,
  t: number,
): MeetingSegment | undefined {
  if (!segments || segments.length === 0) return undefined;
  return segments.find((s) => t >= s.startSeconds && t < s.endSeconds);
}

interface TileProps {
  participant: MeetingParticipant;
  isActive: boolean;
  isSelf: boolean;
  amplitude: number; // 0-1, driven by real audio waveform
  tileColor?: string;
}

function ParticipantTile({ participant, isActive, isSelf, amplitude, tileColor }: TileProps) {
  const bg = tileColor || colorFor(participant.name);

  // Derive visual intensities from the live amplitude (only when active)
  const a = isActive ? amplitude : 0;
  const borderWidth = 2 + a * 3;          // 2px → 5px
  const glowSpread = 4 + a * 18;          // 4px → 22px
  const glowOpacity = 0.15 + a * 0.65;    // subtle → vivid
  const micScale = 1 + a * 0.35;          // 1x → 1.35x
  const medallionBg = isActive ? `rgba(255,255,255,${0.15 + a * 0.15})` : "rgba(255,255,255,0.15)";

  // Equalizer bar heights driven by amplitude with slight offsets for visual variety
  const bar1 = Math.max(15, Math.min(100, a * 130 + 10));
  const bar2 = Math.max(15, Math.min(100, a * 110 + 20));
  const bar3 = Math.max(15, Math.min(100, a * 150));

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-lg"
      style={{
        backgroundColor: bg,
        boxShadow: isActive
          ? `0 0 0 ${borderWidth}px rgba(59,130,246,${0.5 + a * 0.5}), 0 0 ${glowSpread}px ${glowSpread / 2}px rgba(96,165,250,${glowOpacity})`
          : "none",
        transition: isActive ? "box-shadow 0.05s linear" : "box-shadow 0.3s ease-out",
      }}
    >
      {/* Subtle inner gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-black/30" />

      {/* Centered initials medallion */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold tracking-wide text-white backdrop-blur-sm sm:h-16 sm:w-16 sm:text-xl"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.25)",
            backgroundColor: medallionBg,
            transition: isActive ? "background-color 0.05s linear" : "background-color 0.3s ease-out",
          }}
        >
          {initials(participant.name)}
        </div>
      </div>

      {/* Name pill — bottom-left */}
      <div className="absolute bottom-2 left-2 flex max-w-[80%] items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
        {/* Mic icon — scales with amplitude */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={isActive ? "text-emerald-400" : "text-white/70"}
          style={{
            transform: `scale(${micScale})`,
            transition: isActive ? "transform 0.05s linear" : "transform 0.3s ease-out",
          }}
        >
          <path d="M8 1.5a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0V4A2.5 2.5 0 0 0 8 1.5zm-4 6.5a.5.5 0 0 0-1 0 5 5 0 0 0 4.5 4.975V14H6a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H8.5v-1.025A5 5 0 0 0 13 8a.5.5 0 0 0-1 0 4 4 0 0 1-8 0z" />
        </svg>
        <span className="truncate">{isSelf ? "You" : participant.name}</span>
      </div>

      {/* Active-speaker badge with amplitude-driven equalizer — top-right */}
      {isActive && (
        <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-blue-500/90 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
          {/* Equalizer bars driven by real amplitude */}
          <span className="inline-flex items-end gap-[2px] h-[10px]">
            <span className="w-[2px] rounded-full bg-white" style={{ height: `${bar1}%`, transition: "height 0.06s linear" }} />
            <span className="w-[2px] rounded-full bg-white" style={{ height: `${bar2}%`, transition: "height 0.06s linear" }} />
            <span className="w-[2px] rounded-full bg-white" style={{ height: `${bar3}%`, transition: "height 0.06s linear" }} />
          </span>
          Speaking
        </div>
      )}
    </div>
  );
}

export function MeetingRecording({ recording }: Props) {
  const {
    title,
    recordedAt,
    durationSeconds,
    audioUrl,
    participants,
    summary,
    transcript,
    segments,
  } = recording;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const transcriptListRef = useRef<HTMLDivElement | null>(null);

  // Web Audio API refs for real-time amplitude analysis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(durationSeconds);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [amplitude, setAmplitude] = useState(0); // 0-1 from real audio waveform

  // Real-audio events
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setAudioDuration(el.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  // Set up Web Audio API analyser for real-time amplitude
  const initAnalyser = useCallback(() => {
    const el = audioRef.current;
    if (!el || sourceRef.current) return; // already connected
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      const source = ctx.createMediaElementSource(el);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Web Audio not supported or already connected — silently degrade
    }
  }, []);

  // rAF loop: read amplitude from the analyser ~60fps, setState at ~30fps
  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !dataArrayRef.current) {
      // Decay amplitude to 0 when paused
      if (!isPlaying && amplitude > 0) setAmplitude(0);
      return;
    }
    let frame = 0;
    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataArrayRef.current;
      if (!analyser || !data) return;
      analyser.getByteTimeDomainData(data as any);
      // Compute RMS amplitude (0-1)
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128; // normalize to -1..1
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      // Only update state every other frame (~30fps) to avoid excess re-renders
      frame++;
      if (frame % 2 === 0) {
        // Boost the RMS to make it more visually dramatic (speech is low amplitude)
        const boosted = Math.min(1, rms * 4);
        setAmplitude(boosted);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Fallback timer when there's no audio file but the user wants to "play" the recording
  // (so the active-speaker highlighting still works as a simulation).
  useEffect(() => {
    if (audioUrl) return; // real audio path handles itself
    if (!isPlaying) {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = window.setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.25;
        if (next >= durationSeconds) {
          setIsPlaying(false);
          return durationSeconds;
        }
        return next;
      });
    }, 250);
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isPlaying, audioUrl, durationSeconds]);

  const activeSegment = useMemo(
    () => findActiveSegment(segments, currentTime),
    [segments, currentTime],
  );

  // Progressive subtitle text based on current playback progress in the active segment
  const activeSegmentText = useMemo(() => {
    if (!activeSegment) return "";
    const { text, startSeconds, endSeconds } = activeSegment;
    const duration = endSeconds - startSeconds;
    if (duration <= 0) return text;
    
    const progress = (currentTime - startSeconds) / duration;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    // Split the text into words
    const words = text.split(" ");
    if (words.length <= 1) return text;
    
    // Calculate how many words to show (at least 1 word)
    const wordsToShow = Math.ceil(clampedProgress * words.length);
    return words.slice(0, Math.max(1, wordsToShow)).join(" ");
  }, [activeSegment, currentTime]);

  // Auto-scroll transcript to active segment
  useEffect(() => {
    if (!transcriptOpen || !activeSegment) return;
    const el = transcriptListRef.current?.querySelector<HTMLElement>(
      `[data-seg-start="${activeSegment.startSeconds}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeSegment, transcriptOpen]);

  const togglePlay = () => {
    if (audioUrl) {
      const el = audioRef.current;
      if (!el) return;
      if (isPlaying) {
        el.pause();
        setIsPlaying(false);
      } else {
        initAnalyser(); // lazy-init on first play (requires user gesture)
        if (audioCtxRef.current?.state === "suspended") {
          void audioCtxRef.current.resume();
        }
        void el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    } else {
      // No audio file — drive fallback timer
      if (currentTime >= durationSeconds) setCurrentTime(0);
      setIsPlaying((p) => !p);
    }
  };

  const seekTo = (t: number) => {
    const clamped = Math.max(0, Math.min(t, audioDuration || durationSeconds));
    setCurrentTime(clamped);
    if (audioUrl && audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(e.target.value));
  };

  const totalDuration = audioDuration || durationSeconds;
  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const activeSpeakerName = activeSegment?.speakerName;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-stone-100 bg-gradient-to-br from-stone-50 to-white px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            Meeting recording
          </div>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-stone-900">{title}</h2>
          <div className="mt-0.5 text-[11px] text-stone-500">
            {formatRecordedAt(recordedAt)} · {participants.length} participants ·{" "}
            {formatTime(durationSeconds)}
          </div>
        </div>
      </div>

      {/* Audio element (hidden) */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
      )}

      {/* Video frame — Google Meet style */}
      <div className="bg-stone-900 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        {/* Participant grid */}
        <div className={`grid gap-2 ${gridClass(participants.length)}`}>
          {participants.map((p, idx) => (
            <ParticipantTile
              key={`${p.name}-${p.role}`}
              participant={p}
              isActive={p.name === activeSpeakerName}
              isSelf={p.name.toLowerCase() === "you"}
              amplitude={p.name === activeSpeakerName ? amplitude : 0}
              tileColor={TILE_COLORS[idx % TILE_COLORS.length]}
            />
          ))}
        </div>

        {/* Live caption strip */}
        <div className="mt-3 min-h-[44px] rounded-md bg-black/40 px-3 py-2 text-[13px] leading-snug text-white/95">
          {activeSegment ? (
            <>
              <span className="mr-2 text-[11px] font-medium uppercase tracking-wide text-blue-300">
                {activeSegment.speakerName.toLowerCase() === "you"
                  ? "You"
                  : activeSegment.speakerName}
              </span>
              <span>{activeSegmentText}</span>
            </>
          ) : (
            <span className="text-white/40">
              {isPlaying ? "…" : "Press play to start the recording"}
            </span>
          )}
        </div>

        {/* Control bar */}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition hover:bg-stone-100"
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="3.5" height="12" rx="0.5" />
                <rect x="8.5" y="1" width="3.5" height="12" rx="0.5" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 1.5v11l9-5.5z" />
              </svg>
            )}
          </button>

          <span className="font-mono text-[11px] tabular-nums text-white/70">
            {formatTime(currentTime)}
          </span>

          <div className="relative h-1 flex-1 rounded-full bg-white/20">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-blue-400"
              style={{ width: `${progressPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={totalDuration || 0}
              step={0.1}
              value={currentTime}
              onChange={onScrub}
              aria-label="Seek"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <span className="font-mono text-[11px] tabular-nums text-white/70">
            {formatTime(totalDuration)}
          </span>

          {!audioUrl && (
            <span
              className="ml-1 hidden text-[10px] font-medium uppercase tracking-wide text-amber-300/80 sm:inline"
              title="No audio file at the configured URL — visual simulation only"
            >
              Sim
            </span>
          )}
        </div>
      </div>

      {/* Below-the-fold: summary + transcript */}
      <div className="px-5 py-4">
        <p className="text-sm leading-relaxed text-stone-600">{summary}</p>

        <button
          type="button"
          onClick={() => setTranscriptOpen((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={`transition-transform ${transcriptOpen ? "rotate-90" : ""}`}
          >
            <path d="M3 1.5l4 3.5-4 3.5z" fill="currentColor" />
          </svg>
          {transcriptOpen ? "Hide transcript" : "Show transcript"}
        </button>

        {transcriptOpen && (
          <div
            ref={transcriptListRef}
            className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-stone-100 bg-stone-50 p-3"
          >
            {segments && segments.length > 0 ? (
              segments.map((seg) => {
                const isActive =
                  activeSegment?.startSeconds === seg.startSeconds &&
                  activeSegment?.speakerName === seg.speakerName;
                return (
                  <button
                    key={`${seg.startSeconds}-${seg.speakerName}`}
                    type="button"
                    data-seg-start={seg.startSeconds}
                    onClick={() => seekTo(seg.startSeconds)}
                    className={`block w-full rounded-md px-2.5 py-2 text-left text-xs leading-relaxed transition ${
                      isActive
                        ? "bg-blue-50 ring-1 ring-blue-200"
                        : "hover:bg-white"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] tabular-nums text-stone-400">
                        {formatTime(seg.startSeconds)}
                      </span>
                      <span className="font-medium text-stone-900">
                        {seg.speakerName.toLowerCase() === "you"
                          ? "You"
                          : seg.speakerName}
                      </span>
                    </div>
                    <p className="mt-0.5 text-stone-700">{seg.text}</p>
                  </button>
                );
              })
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-stone-700">
                {transcript}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
