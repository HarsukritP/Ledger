export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatMoney(
  value: number,
  opts?: { showSign?: boolean; decimals?: number }
): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: opts?.decimals ?? 2,
    maximumFractionDigits: opts?.decimals ?? 2,
  });
  const prefix =
    value < 0 ? "-" : opts?.showSign && value > 0 ? "+" : "";
  return `${prefix}$${formatted}`;
}

export function formatDate(
  dateStr: string,
  opts?: Intl.DateTimeFormatOptions
): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...opts,
  });
}
