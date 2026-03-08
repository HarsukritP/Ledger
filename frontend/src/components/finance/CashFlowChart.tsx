import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ForecastEvent } from "../../types";

interface CashFlowChartProps {
  historyEvents?: (ForecastEvent & { is_history?: boolean })[];
  forecastEvents?: ForecastEvent[];
  events?: ForecastEvent[];
  startBalance: number;
  dangerThreshold?: number;
  className?: string;
}

const NICE_STEPS = [50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000];

function niceScale(rawMin: number, rawMax: number): { ticks: number[]; niceMin: number; niceMax: number } {
  const range = rawMax - rawMin;
  if (range <= 0) return { ticks: [rawMin], niceMin: rawMin, niceMax: rawMax };

  let step = NICE_STEPS[0];
  for (const s of NICE_STEPS) {
    if (Math.ceil(range / s) <= 8 && Math.ceil(range / s) >= 3) {
      step = s;
      break;
    }
  }

  const niceMin = Math.floor(rawMin / step) * step;
  const niceMax = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax; v += step) ticks.push(v);
  return { ticks, niceMin, niceMax };
}

function parseDate(d: string): number {
  return new Date(d + "T12:00:00").getTime();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PULSE_COLOR = "#3B82F6";
const DANGER_COLOR = "#EF4444";
const HISTORY_COLOR = "var(--color-text-muted)";

export function CashFlowChart({
  historyEvents = [],
  forecastEvents = [],
  events,
  startBalance,
  dangerThreshold = 500,
  className,
}: CashFlowChartProps) {
  const width = 800;
  const height = 320;
  const padding = { top: 20, right: 20, bottom: 45, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const hasHistory = historyEvents.length > 0;
  const effectiveForecast = forecastEvents.length > 0 ? forecastEvents : (events || []);

  const { historyPoints, forecastPoints, minVal, maxVal, timeMin, timeMax, todayTs } = useMemo(() => {
    const hPts: { ts: number; y: number }[] = [];
    const fPts: { ts: number; y: number }[] = [];

    const sortedHistory = hasHistory
      ? [...historyEvents].sort((a, b) => parseDate(a.date) - parseDate(b.date))
      : [];
    const sortedForecast = [...effectiveForecast].sort(
      (a, b) => parseDate(a.date) - parseDate(b.date)
    );

    const now = Date.now();

    if (hasHistory && sortedHistory.length > 0) {
      let balance = startBalance;
      for (const e of sortedHistory) {
        balance += e.type === "income" ? -Math.abs(e.amount) : Math.abs(e.amount);
      }

      let runningBalance = balance;
      const firstTs = parseDate(sortedHistory[0].date);
      hPts.push({ ts: firstTs, y: runningBalance });

      for (const e of sortedHistory) {
        runningBalance += e.type === "income" ? Math.abs(e.amount) : -Math.abs(e.amount);
        hPts.push({ ts: parseDate(e.date), y: runningBalance });
      }
    }

    let forecastBalance = startBalance;
    fPts.push({ ts: now, y: forecastBalance });

    for (const e of sortedForecast) {
      forecastBalance += e.type === "income" ? Math.abs(e.amount) : -Math.abs(e.amount);
      fPts.push({ ts: parseDate(e.date), y: forecastBalance });
    }

    const allTs = [...hPts.map((p) => p.ts), ...fPts.map((p) => p.ts)];
    const tMin = Math.min(...allTs);
    const tMax = Math.max(...allTs);

    const allVals = [...hPts.map((p) => p.y), ...fPts.map((p) => p.y)];
    const rawMin = allVals.length ? Math.min(...allVals) : 0;
    const rawMax = allVals.length ? Math.max(...allVals) : 1000;
    const { niceMin, niceMax } = niceScale(rawMin * 0.95, rawMax * 1.05);

    return {
      historyPoints: hPts,
      forecastPoints: fPts,
      minVal: niceMin,
      maxVal: niceMax,
      timeMin: tMin,
      timeMax: tMax,
      todayTs: now,
    };
  }, [historyEvents, effectiveForecast, startBalance, hasHistory]);

  const yTicks = useMemo(() => niceScale(minVal, maxVal).ticks, [minVal, maxVal]);

  const xDateLabels = useMemo(() => {
    if (timeMax <= timeMin) return [];
    const targetCount = 7;
    const step = (timeMax - timeMin) / targetCount;
    const labels: { ts: number; label: string }[] = [];
    for (let i = 0; i <= targetCount; i++) {
      const ts = timeMin + step * i;
      labels.push({ ts, label: formatDate(ts) });
    }
    return labels.filter((l, i) => i === 0 || l.label !== labels[i - 1].label);
  }, [timeMin, timeMax]);

  const toX = (ts: number) => {
    if (timeMax === timeMin) return padding.left + chartW / 2;
    return padding.left + ((ts - timeMin) / (timeMax - timeMin)) * chartW;
  };
  const toY = (val: number) => {
    if (maxVal === minVal) return padding.top + chartH / 2;
    return padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
  };

  const buildPath = (pts: { ts: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.ts)} ${toY(p.y)}`).join(" ");

  const historyPath = historyPoints.length > 1 ? buildPath(historyPoints) : "";
  const forecastPath = forecastPoints.length > 1 ? buildPath(forecastPoints) : "";

  const forecastAreaPath = forecastPoints.length > 1
    ? `${forecastPath} L ${toX(forecastPoints[forecastPoints.length - 1].ts)} ${toY(minVal)} L ${toX(forecastPoints[0].ts)} ${toY(minVal)} Z`
    : "";

  const historyAreaPath = historyPoints.length > 1
    ? `${historyPath} L ${toX(historyPoints[historyPoints.length - 1].ts)} ${toY(minVal)} L ${toX(historyPoints[0].ts)} ${toY(minVal)} Z`
    : "";

  const dangerY = toY(dangerThreshold);
  const todayX = toX(todayTs);

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {yTicks.map((tick) => (
          <line
            key={`grid-${tick}`}
            x1={padding.left}
            y1={toY(tick)}
            x2={padding.left + chartW}
            y2={toY(tick)}
            stroke="var(--color-chart-grid)"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {dangerThreshold > minVal && (
          <rect
            x={padding.left}
            y={dangerY}
            width={chartW}
            height={Math.max(0, toY(minVal) - dangerY)}
            fill={DANGER_COLOR}
            opacity={0.06}
          />
        )}

        {historyAreaPath && (
          <motion.path
            d={historyAreaPath}
            fill={HISTORY_COLOR}
            opacity={0.06}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.06 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {forecastAreaPath && (
          <motion.path
            d={forecastAreaPath}
            fill={PULSE_COLOR}
            opacity={0.08}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.08 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {historyPath && (
          <motion.path
            d={historyPath}
            fill="none"
            stroke={HISTORY_COLOR}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          />
        )}

        {forecastPath && (
          <motion.path
            d={forecastPath}
            fill="none"
            stroke={PULSE_COLOR}
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.33, 1, 0.68, 1] }}
          />
        )}

        {hasHistory && (
          <>
            <line
              x1={todayX}
              y1={padding.top}
              x2={todayX}
              y2={padding.top + chartH}
              stroke={PULSE_COLOR}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.4}
            />
            <text
              x={todayX}
              y={padding.top - 6}
              textAnchor="middle"
              fill={PULSE_COLOR}
              className="text-[10px] font-medium"
            >
              Today
            </text>
          </>
        )}

        {forecastPoints.map((p, i) => (
          <circle
            key={`f-${i}`}
            cx={toX(p.ts)}
            cy={toY(p.y)}
            r={3}
            fill={p.y < dangerThreshold ? DANGER_COLOR : PULSE_COLOR}
          />
        ))}

        {yTicks.map((tick) => (
          <text
            key={`y-${tick}`}
            x={padding.left - 8}
            y={toY(tick) + 4}
            textAnchor="end"
            fill="var(--color-chart-text)"
            className="text-[10px] font-mono"
          >
            ${tick.toLocaleString()}
          </text>
        ))}

        {xDateLabels.map((d, i) => (
          <text
            key={`x-${i}`}
            x={toX(d.ts)}
            y={padding.top + chartH + 18}
            textAnchor="middle"
            fill="var(--color-chart-text)"
            className="text-[10px]"
          >
            {d.label}
          </text>
        ))}
      </svg>

      {hasHistory && (
        <div className="mt-2 flex items-center justify-center gap-6 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-text-muted" />
            Past
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: PULSE_COLOR }} />
            Projected
          </span>
        </div>
      )}
    </div>
  );
}
