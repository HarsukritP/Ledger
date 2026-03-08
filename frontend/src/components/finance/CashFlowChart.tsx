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

  const { historyPoints, forecastPoints, minVal, maxVal, todayIndex } = useMemo(() => {
    const hPts: { x: number; y: number; date: string }[] = [];
    const fPts: { x: number; y: number; date: string }[] = [];

    const totalPoints = (hasHistory ? historyEvents.length : 0) + effectiveForecast.length + 1;

    if (hasHistory) {
      let balance = startBalance;
      const sortedHistory = [...historyEvents].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      for (const e of sortedHistory) {
        balance += e.type === "income" ? -Math.abs(e.amount) : Math.abs(e.amount);
      }
      const historyStart = balance;

      let runningBalance = historyStart;
      sortedHistory.forEach((e, i) => {
        if (i === 0) {
          hPts.push({
            x: 0,
            y: runningBalance,
            date: new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          });
        }
        runningBalance += e.type === "income" ? Math.abs(e.amount) : -Math.abs(e.amount);
        hPts.push({
          x: (i + 1) / (totalPoints - 1),
          y: runningBalance,
          date: new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        });
      });
    }

    const todayIdx = hasHistory ? historyEvents.length / (totalPoints - 1) : 0;

    let forecastBalance = startBalance;
    const todayPoint = {
      x: todayIdx,
      y: forecastBalance,
      date: "Today",
    };
    if (hasHistory) {
      fPts.push(todayPoint);
    } else {
      fPts.push({ x: 0, y: forecastBalance, date: "Today" });
    }

    const sortedForecast = [...effectiveForecast].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    sortedForecast.forEach((e, i) => {
      forecastBalance += e.type === "income" ? Math.abs(e.amount) : -Math.abs(e.amount);
      const startIdx = hasHistory ? historyEvents.length + 1 : 1;
      fPts.push({
        x: (startIdx + i) / (totalPoints - 1),
        y: forecastBalance,
        date: new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    });

    const allVals = [...hPts.map((p) => p.y), ...fPts.map((p) => p.y)];
    const rawMin = allVals.length ? Math.min(...allVals) : 0;
    const rawMax = allVals.length ? Math.max(...allVals) : 1000;
    const { niceMin, niceMax } = niceScale(rawMin * 0.95, rawMax * 1.05);

    return {
      historyPoints: hPts,
      forecastPoints: fPts,
      minVal: niceMin,
      maxVal: niceMax,
      todayIndex: todayIdx,
    };
  }, [historyEvents, effectiveForecast, startBalance, hasHistory]);

  const yTicks = useMemo(() => niceScale(minVal, maxVal).ticks, [minVal, maxVal]);

  const xDateLabels = useMemo(() => {
    const all = [...historyPoints, ...forecastPoints];
    if (all.length <= 1) return [];
    const seen = new Set<string>();
    const unique = all.filter((p) => {
      if (seen.has(p.date)) return false;
      seen.add(p.date);
      return true;
    });
    const targetCount = Math.min(8, unique.length);
    if (targetCount <= 0) return [];
    const step = Math.max(1, Math.floor(unique.length / targetCount));
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < unique.length; i += step) {
      labels.push({ x: unique[i].x, label: unique[i].date });
    }
    const last = unique[unique.length - 1];
    if (labels.length > 0 && labels[labels.length - 1].label !== last.label) {
      labels.push({ x: last.x, label: last.label });
    }
    return labels;
  }, [historyPoints, forecastPoints]);

  const toX = (pct: number) => padding.left + pct * chartW;
  const toY = (val: number) => {
    if (maxVal === minVal) return padding.top + chartH / 2;
    return padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
  };

  const buildPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.x)} ${toY(p.y)}`).join(" ");

  const historyPath = historyPoints.length > 1 ? buildPath(historyPoints) : "";
  const forecastPath = forecastPoints.length > 1 ? buildPath(forecastPoints) : "";

  const forecastAreaPath = forecastPoints.length > 1
    ? `${forecastPath} L ${toX(forecastPoints[forecastPoints.length - 1].x)} ${toY(minVal)} L ${toX(forecastPoints[0].x)} ${toY(minVal)} Z`
    : "";

  const historyAreaPath = historyPoints.length > 1
    ? `${historyPath} L ${toX(historyPoints[historyPoints.length - 1].x)} ${toY(minVal)} L ${toX(historyPoints[0].x)} ${toY(minVal)} Z`
    : "";

  const dangerY = toY(dangerThreshold);
  const todayX = toX(todayIndex);

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Horizontal gridlines */}
        {yTicks.map((tick) => (
          <line
            key={`grid-${tick}`}
            x1={padding.left}
            y1={toY(tick)}
            x2={padding.left + chartW}
            y2={toY(tick)}
            stroke="#27272A"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Danger zone */}
        {dangerThreshold > minVal && (
          <rect
            x={padding.left}
            y={dangerY}
            width={chartW}
            height={Math.max(0, toY(minVal) - dangerY)}
            fill="#EF4444"
            opacity={0.06}
          />
        )}

        {/* History area fill */}
        {historyAreaPath && (
          <motion.path
            d={historyAreaPath}
            fill="#A1A1AA"
            opacity={0.06}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.06 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {/* Forecast area fill */}
        {forecastAreaPath && (
          <motion.path
            d={forecastAreaPath}
            fill="#D4A853"
            opacity={0.08}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.08 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {/* History line */}
        {historyPath && (
          <motion.path
            d={historyPath}
            fill="none"
            stroke="#71717A"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          />
        )}

        {/* Forecast line */}
        {forecastPath && (
          <motion.path
            d={forecastPath}
            fill="none"
            stroke="#D4A853"
            strokeWidth={1.5}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.33, 1, 0.68, 1] }}
          />
        )}

        {/* Today vertical line */}
        {hasHistory && (
          <>
            <line
              x1={todayX}
              y1={padding.top}
              x2={todayX}
              y2={padding.top + chartH}
              stroke="#D4A853"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.4}
            />
            <text
              x={todayX}
              y={padding.top - 6}
              textAnchor="middle"
              className="fill-gold text-[10px] font-medium"
            >
              Today
            </text>
          </>
        )}

        {/* Forecast dots */}
        {forecastPoints.map((p, i) => (
          <circle
            key={`f-${i}`}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={3}
            fill={p.y < dangerThreshold ? "#EF4444" : "#D4A853"}
          />
        ))}

        {/* Y-axis labels (nice ticks) */}
        {yTicks.map((tick) => (
          <text
            key={`y-${tick}`}
            x={padding.left - 8}
            y={toY(tick) + 4}
            textAnchor="end"
            className="fill-text-muted text-[10px] font-mono"
          >
            ${tick.toLocaleString()}
          </text>
        ))}

        {/* X-axis date labels */}
        {xDateLabels.map((d, i) => (
          <text
            key={`x-${i}`}
            x={toX(d.x)}
            y={padding.top + chartH + 18}
            textAnchor="middle"
            className="fill-text-muted text-[10px]"
          >
            {d.label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      {hasHistory && (
        <div className="mt-2 flex items-center justify-center gap-6 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-zinc-500" />
            Past
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-gold" />
            Projected
          </span>
        </div>
      )}
    </div>
  );
}
