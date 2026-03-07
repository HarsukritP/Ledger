import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(
  value: number,
  opts?: { showSign?: boolean; compact?: boolean }
): string {
  const { showSign = false, compact = false } = opts ?? {};
  const abs = Math.abs(value);
  const formatted = compact && abs >= 1000
    ? `${(abs / 1000).toFixed(1)}k`
    : abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const prefix = value < 0 ? "-" : showSign && value > 0 ? "+" : "";
  return `${prefix}$${formatted}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
