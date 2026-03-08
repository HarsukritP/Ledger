import { useMemo } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import Svg, { Path, Circle, Rect, Line, Text as SvgText } from "react-native-svg";
import type { ForecastEvent } from "../../types";
import { useTheme } from "../../lib/theme";

interface CashFlowChartProps {
  historyEvents?: (ForecastEvent & { is_history?: boolean })[];
  forecastEvents?: ForecastEvent[];
  events?: ForecastEvent[];
  startBalance: number;
  dangerThreshold?: number;
}

const NICE_STEPS = [50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000];

function niceScale(rawMin: number, rawMax: number): { ticks: number[]; niceMin: number; niceMax: number } {
  const range = rawMax - rawMin;
  if (range <= 0) return { ticks: [rawMin], niceMin: rawMin, niceMax: rawMax };
  let step = NICE_STEPS[0];
  for (const s of NICE_STEPS) {
    if (Math.ceil(range / s) <= 8 && Math.ceil(range / s) >= 3) { step = s; break; }
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

export function CashFlowChart({
  historyEvents = [],
  forecastEvents = [],
  events,
  startBalance,
  dangerThreshold = 500,
}: CashFlowChartProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - 32;
  const height = 220;
  const padding = { top: 20, right: 16, bottom: 40, left: 52 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const hasHistory = historyEvents.length > 0;
  const effectiveForecast = forecastEvents.length > 0 ? forecastEvents : (events || []);

  const { historyPoints, forecastPoints, minVal, maxVal, timeMin, timeMax, todayTs, yTicks } = useMemo(() => {
    const hPts: { ts: number; y: number }[] = [];
    const fPts: { ts: number; y: number }[] = [];
    const now = Date.now();

    const sortedHistory = hasHistory
      ? [...historyEvents].sort((a, b) => parseDate(a.date) - parseDate(b.date))
      : [];
    const sortedForecast = [...effectiveForecast].sort((a, b) => parseDate(a.date) - parseDate(b.date));

    if (hasHistory && sortedHistory.length > 0) {
      let balance = startBalance;
      for (const e of sortedHistory) {
        balance += e.type === "income" ? -Math.abs(e.amount) : Math.abs(e.amount);
      }
      let running = balance;
      hPts.push({ ts: parseDate(sortedHistory[0].date), y: running });
      for (const e of sortedHistory) {
        running += e.type === "income" ? Math.abs(e.amount) : -Math.abs(e.amount);
        hPts.push({ ts: parseDate(e.date), y: running });
      }
    }

    let forecastBalance = startBalance;
    fPts.push({ ts: now, y: forecastBalance });
    for (const e of sortedForecast) {
      forecastBalance += e.type === "income" ? Math.abs(e.amount) : -Math.abs(e.amount);
      fPts.push({ ts: parseDate(e.date), y: forecastBalance });
    }

    const allTs = [...hPts.map((p) => p.ts), ...fPts.map((p) => p.ts)];
    const tMin = allTs.length ? Math.min(...allTs) : now;
    const tMax = allTs.length ? Math.max(...allTs) : now + 86400000 * 30;

    const allVals = [...hPts.map((p) => p.y), ...fPts.map((p) => p.y)];
    const rawMin = allVals.length ? Math.min(...allVals) : 0;
    const rawMax = allVals.length ? Math.max(...allVals) : 1000;
    const { niceMin, niceMax, ticks } = niceScale(rawMin * 0.95, rawMax * 1.05);

    return {
      historyPoints: hPts, forecastPoints: fPts, minVal: niceMin, maxVal: niceMax,
      timeMin: tMin, timeMax: tMax, todayTs: now, yTicks: ticks,
    };
  }, [historyEvents, effectiveForecast, startBalance, hasHistory]);

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

  const dangerY = toY(dangerThreshold);
  const todayX = toX(todayTs);

  const xLabels = useMemo(() => {
    if (timeMax <= timeMin) return [];
    const count = 5;
    const step = (timeMax - timeMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const ts = timeMin + step * i;
      return { ts, label: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }), x: toX(ts) };
    });
  }, [timeMin, timeMax]);

  const visibleYTicks = yTicks.filter((_, i) => i % 2 === 0);

  return (
    <View style={{ height, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
      <Svg width={width} height={height}>
        {yTicks.map((tick) => (
          <Line key={`g-${tick}`} x1={padding.left} y1={toY(tick)} x2={padding.left + chartW} y2={toY(tick)}
            stroke={colors.border} strokeWidth={0.5} opacity={0.5} />
        ))}

        {dangerThreshold > minVal && (
          <Rect x={padding.left} y={dangerY} width={chartW} height={Math.max(0, toY(minVal) - dangerY)}
            fill={colors.danger} opacity={0.06} />
        )}

        {historyPath ? (
          <Path
            d={`${historyPath} L ${toX(historyPoints[historyPoints.length - 1].ts)} ${toY(minVal)} L ${toX(historyPoints[0].ts)} ${toY(minVal)} Z`}
            fill={colors.textMuted} opacity={0.06} />
        ) : null}

        {forecastAreaPath ? <Path d={forecastAreaPath} fill={colors.pulse} opacity={0.08} /> : null}

        {historyPath ? (
          <Path d={historyPath} fill="none" stroke={colors.textMuted} strokeWidth={1.5} strokeDasharray="4,3" />
        ) : null}

        {forecastPath ? (
          <Path d={forecastPath} fill="none" stroke={colors.pulse} strokeWidth={2} />
        ) : null}

        {hasHistory && (
          <>
            <Line x1={todayX} y1={padding.top} x2={todayX} y2={padding.top + chartH}
              stroke={colors.pulse} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
            <SvgText x={todayX} y={padding.top - 6} textAnchor="middle" fill={colors.pulse} fontSize={9} fontWeight="500">
              Today
            </SvgText>
          </>
        )}

        {forecastPoints.map((p, i) => (
          <Circle key={`fd-${i}`} cx={toX(p.ts)} cy={toY(p.y)} r={2.5}
            fill={p.y < dangerThreshold ? colors.danger : colors.pulse} />
        ))}

        {visibleYTicks.map((tick) => (
          <SvgText key={`y-${tick}`} x={padding.left - 4} y={toY(tick) + 4}
            textAnchor="end" fill={colors.textMuted} fontSize={9} fontFamily="monospace">
            ${tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
          </SvgText>
        ))}

        {xLabels.map((d, i) => (
          <SvgText key={`x-${i}`} x={d.x} y={padding.top + chartH + 16}
            textAnchor="middle" fill={colors.textMuted} fontSize={9}>
            {d.label}
          </SvgText>
        ))}
      </Svg>

      {hasHistory && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, paddingBottom: 6, paddingTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 16, height: 1, borderStyle: "dashed", borderWidth: 1, borderColor: colors.textMuted }} />
            <Text style={{ fontSize: 10, color: colors.textMuted }}>Past</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 16, height: 2, backgroundColor: colors.pulse }} />
            <Text style={{ fontSize: 10, color: colors.textMuted }}>Projected</Text>
          </View>
        </View>
      )}
    </View>
  );
}
