import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface MoneyTextProps {
  value: number;
  animated?: boolean;
  showSign?: boolean;
  className?: string;
  duration?: number;
}

export function MoneyText({
  value,
  animated = false,
  showSign = false,
  className,
  duration = 1200,
}: MoneyTextProps) {
  const [display, setDisplay] = useState(animated ? 0 : value);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!animated) {
      setDisplay(value);
      return;
    }

    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [value, animated, duration]);

  const abs = Math.abs(display);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = display < 0 ? "-" : showSign && display > 0 ? "+" : "";

  const colorClass =
    value > 0 && showSign
      ? "text-income"
      : value < 0
        ? "text-danger"
        : "text-gold";

  return (
    <span className={cn("font-mono font-medium", colorClass, className)}>
      {prefix}${formatted}
    </span>
  );
}
