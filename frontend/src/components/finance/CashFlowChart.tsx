import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ForecastEvent } from "../../types";

interface CashFlowChartProps {
  events: ForecastEvent[];
  startBalance: number;
  dangerThreshold?: number;
  className?: string;
}

export function CashFlowChart({
  events,
  startBalance,
  dangerThreshold = 500,
  className,
}: CashFlowChartProps) {
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { points, minVal, maxVal } = useMemo(() => {
    let balance = startBalance;
    const pts = [{ x: 0, y: balance, date: "Today" }];
    const sorted = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    sorted.forEach((e, i) => {
      balance += e.type === "income" ? Math.abs(e.amount) : -Math.abs(e.amount);
      pts.push({
        x: (i + 1) / sorted.length,
        y: balance,
        date: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    });
    const vals = pts.map((p) => p.y);
    return {
      points: pts,
      minVal: Math.min(...vals) * 0.9,
      maxVal: Math.max(...vals) * 1.1,
    };
  }, [events, startBalance]);

  const toX = (pct: number) => padding.left + pct * chartW;
  const toY = (val: number) =>
    padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.x)} ${toY(p.y)}`)
    .join(" ");

  const areaPath = `${linePath} L ${toX(points[points.length - 1].x)} ${toY(minVal)} L ${toX(0)} ${toY(minVal)} Z`;

  const dangerY = toY(dangerThreshold);

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {dangerThreshold > minVal && (
          <rect
            x={padding.left}
            y={dangerY}
            width={chartW}
            height={toY(minVal) - dangerY}
            fill="#EF4444"
            opacity={0.06}
          />
        )}

        <motion.path
          d={areaPath}
          fill="#D4A853"
          opacity={0.08}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          transition={{ duration: 0.8 }}
        />

        <motion.path
          d={linePath}
          fill="none"
          stroke="#D4A853"
          strokeWidth={1.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={3}
            fill={p.y < dangerThreshold ? "#EF4444" : "#D4A853"}
          />
        ))}

        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = minVal + pct * (maxVal - minVal);
          return (
            <text
              key={pct}
              x={padding.left - 8}
              y={toY(val) + 4}
              textAnchor="end"
              className="fill-text-muted text-[10px] font-mono"
            >
              ${Math.round(val).toLocaleString()}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
