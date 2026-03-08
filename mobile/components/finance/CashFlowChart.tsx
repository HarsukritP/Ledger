import { useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Path, Circle, Rect, Line, Text as SvgText } from "react-native-svg";
import type { ForecastEvent } from "../../types";

interface CashFlowChartProps {
  events: ForecastEvent[];
  startBalance: number;
  dangerThreshold?: number;
}

export function CashFlowChart({
  events,
  startBalance,
  dangerThreshold = 500,
}: CashFlowChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - 32;
  const height = 200;
  const padding = { top: 16, right: 16, bottom: 24, left: 52 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { points, minVal, maxVal } = useMemo(() => {
    let balance = startBalance;
    const pts = [{ x: 0, y: balance }];
    const sorted = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    sorted.forEach((e, i) => {
      balance +=
        e.type === "income" ? Math.abs(e.amount) : -Math.abs(e.amount);
      pts.push({ x: (i + 1) / sorted.length, y: balance });
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

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((pct) =>
    Math.round(minVal + pct * (maxVal - minVal))
  );

  return (
    <View
      className="rounded-2xl border border-border bg-surface overflow-hidden"
      style={{ height }}
    >
      <Svg width={width} height={height}>
        {dangerThreshold > minVal && (
          <Rect
            x={padding.left}
            y={dangerY}
            width={chartW}
            height={toY(minVal) - dangerY}
            fill="#EF4444"
            opacity={0.06}
          />
        )}

        <Path d={areaPath} fill="#D4A853" opacity={0.08} />

        <Path
          d={linePath}
          fill="none"
          stroke="#D4A853"
          strokeWidth={1.5}
        />

        {points.map((p, i) => (
          <Circle
            key={i}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={3}
            fill={p.y < dangerThreshold ? "#EF4444" : "#D4A853"}
          />
        ))}

        {yLabels.map((val, i) => (
          <SvgText
            key={i}
            x={padding.left - 4}
            y={toY(val) + 4}
            textAnchor="end"
            fill="#71717A"
            fontSize={9}
            fontFamily="monospace"
          >
            ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
          </SvgText>
        ))}

        <Line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartH}
          stroke="#27272A"
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}
