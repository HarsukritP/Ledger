import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { getToken, waitForToken } from "../../hooks/useAuthToken";

interface BriefingPlayerProps {
  audioUrl?: string;
  previewText: string;
  duration?: string;
  className?: string;
  onGenerate?: () => Promise<{ audio_url?: string; content?: string } | null>;
}

export function BriefingPlayer({
  audioUrl,
  previewText,
  duration,
  className,
  onGenerate,
}: BriefingPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(audioUrl);
  const [currentDuration, setCurrentDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }

    if (!currentAudioUrl && onGenerate) {
      setGenerating(true);
      try {
        const result = await onGenerate();
        if (result?.audio_url) {
          setCurrentAudioUrl(result.audio_url);
          await playAudio(result.audio_url);
        } else {
          console.warn("[BRIEFING] No audio_url in response:", result);
        }
      } catch (err) {
        console.error("[BRIEFING] Generation failed:", err);
      } finally {
        setGenerating(false);
      }
      return;
    }

    if (currentAudioUrl) {
      await playAudio(currentAudioUrl);
    }
  };

  const playAudio = async (url: string) => {
    try {
      let token = getToken();
      if (!token) token = await waitForToken();

      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const fullUrl = url.startsWith("http") ? url : `${apiBase}${url}`;

      const resp = await fetch(fullUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Audio fetch failed: ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = new Audio(objectUrl);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onloadedmetadata = () => {
        const dur = audioRef.current?.duration;
        if (dur && isFinite(dur)) {
          const mins = Math.floor(dur / 60);
          const secs = Math.floor(dur % 60);
          setCurrentDuration(`${mins}:${secs.toString().padStart(2, "0")}`);
        }
      };
      await audioRef.current.play();
      setPlaying(true);
    } catch (err) {
      console.error("[BRIEFING] Playback failed:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface p-5",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent" />
      <div className="relative flex items-center gap-4">
        <button
          onClick={toggle}
          disabled={generating}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-black transition-transform hover:scale-105 disabled:opacity-60"
        >
          {generating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : playing ? (
            <Pause size={20} />
          ) : (
            <Play size={20} className="ml-0.5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-text-muted" />
            <span className="text-xs font-medium text-text-muted">
              {generating ? "Generating briefing..." : "Weekly Briefing"}
            </span>
            {currentDuration && !generating && (
              <span className="text-xs text-text-muted">{currentDuration}</span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-text-secondary">
            {previewText}
          </p>
        </div>
      </div>
      {playing && (
        <div className="relative mt-3 flex items-end gap-[2px]">
          {Array.from({ length: 32 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-gold/40"
              animate={{
                height: [4, 8 + Math.random() * 16, 4],
              }}
              transition={{
                duration: 0.6 + Math.random() * 0.4,
                repeat: Infinity,
                delay: i * 0.03,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
