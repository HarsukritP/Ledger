import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface BriefingPlayerProps {
  audioUrl?: string;
  previewText: string;
  duration?: string;
  className?: string;
}

export function BriefingPlayer({
  audioUrl,
  previewText,
  duration = "0:42",
  className,
}: BriefingPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current && audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
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
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-black transition-transform hover:scale-105"
        >
          {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-text-muted" />
            <span className="text-xs font-medium text-text-muted">
              Weekly Briefing
            </span>
            <span className="text-xs text-text-muted">{duration}</span>
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
