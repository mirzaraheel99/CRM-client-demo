import { useId, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, LabelList, ReferenceLine,
  ComposedChart, Line,
} from "recharts";
import { SERIES } from "../lib/chartTheme";
import { formatCompact } from "../lib/utils";

const gridColor = "var(--color-gridline)";
const axisColor = "var(--color-ink-muted)";
const tickStyle = { fill: axisColor, fontSize: 12 };
const labelStyle = { fill: "var(--color-ink-secondary)", fontSize: 11, fontWeight: 600 };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-[var(--color-surface-2)] px-3 py-2.5 text-xs shadow-[var(--shadow-md)] [border-color:var(--color-border)]">
      {label && <p className="mb-1.5 font-semibold tracking-tight text-[var(--color-ink-primary)]">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color ?? p.fill }} />
          <span className="text-[var(--color-ink-secondary)]">{p.name}:</span>
          <span className="font-medium tabular-nums text-[var(--color-ink-primary)]">{formatCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ToggleLegend({ items, hidden, onToggle }: { items: { name: string; color: string }[]; hidden: Set<string>; onToggle: (name: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2">
      {items.map((item) => {
        const isHidden = hidden.has(item.name);
        return (
          <button
            key={item.name}
            onClick={() => onToggle(item.name)}
            className="flex items-center gap-1.5 text-xs transition-opacity"
            style={{ opacity: isHidden ? 0.4 : 1 }}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
            <span className={isHidden ? "line-through text-[var(--color-ink-muted)]" : "text-[var(--color-ink-secondary)]"}>{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function HorizontalBarChart({
  data, dataKey, categoryKey, color = SERIES[0], height = 260, referenceValue, referenceLabel,
}: {
  data: Record<string, any>[]; dataKey: string; categoryKey: string; color?: string; height?: number;
  referenceValue?: number; referenceLabel?: string;
}) {
  const gid = useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: referenceValue != null ? 18 : 4, bottom: 4 }} barCategoryGap={10}>
        <defs>
          <linearGradient id={`hbar-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.75} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke={gridColor} strokeDasharray="0" />
        <XAxis type="number" tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={false} tickFormatter={formatCompact} />
        <YAxis type="category" dataKey={categoryKey} tick={tickStyle} axisLine={false} tickLine={false} width={110} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip />} />
        {referenceValue != null && (
          <ReferenceLine x={referenceValue} stroke="var(--color-status-serious)" strokeDasharray="4 4" label={{ value: referenceLabel, position: "top", fill: "var(--color-status-serious)", fontSize: 11 }} />
        )}
        <Bar dataKey={dataKey} fill={`url(#hbar-${gid})`} radius={[0, 4, 4, 0]} maxBarSize={18} name={dataKey} animationDuration={600} animationEasing="ease-out">
          <LabelList dataKey={dataKey} position="right" style={labelStyle} formatter={(v: any) => formatCompact(Number(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VerticalBarChart({
  data, dataKey, categoryKey, color = SERIES[0], height = 240, referenceValue, referenceLabel,
}: {
  data: Record<string, any>[]; dataKey: string; categoryKey: string; color?: string; height?: number;
  referenceValue?: number; referenceLabel?: string;
}) {
  const gid = useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 16, bottom: 4 }} barCategoryGap={16}>
        <defs>
          <linearGradient id={`vbar-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey={categoryKey} tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={formatCompact} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip />} />
        {referenceValue != null && (
          <ReferenceLine y={referenceValue} stroke="var(--color-status-serious)" strokeDasharray="4 4" label={{ value: referenceLabel, position: "insideTopRight", fill: "var(--color-status-serious)", fontSize: 11 }} />
        )}
        <Bar dataKey={dataKey} fill={`url(#vbar-${gid})`} radius={[4, 4, 0, 0]} maxBarSize={32} name={dataKey} animationDuration={600} animationEasing="ease-out">
          <LabelList dataKey={dataKey} position="top" style={labelStyle} formatter={(v: any) => formatCompact(Number(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data, height = 220, centerLabel, centerValue,
}: {
  data: { name: string; value: number }[]; height?: number; centerLabel?: string; centerValue?: string;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const items = data.map((d, i) => ({ name: d.name, color: SERIES[i % SERIES.length] }));
  const visible = data.filter((d) => !hidden.has(d.name));

  function toggle(name: string) {
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={visible} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} strokeWidth={2} stroke="var(--color-surface-1)" animationDuration={700} animationEasing="ease-out">
              {visible.map((d) => (
                <Cell key={d.name} fill={SERIES[data.findIndex((x) => x.name === d.name) % SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {centerValue && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums text-[var(--color-ink-primary)]">{centerValue}</span>
            {centerLabel && <span className="text-[11px] text-[var(--color-ink-muted)]">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ToggleLegend items={items} hidden={hidden} onToggle={toggle} />
    </div>
  );
}

export function TrendAreaChart({
  data, dataKey, categoryKey, color = SERIES[0], height = 240, referenceValue, referenceLabel,
}: {
  data: Record<string, any>[]; dataKey: string; categoryKey: string; color?: string; height?: number;
  referenceValue?: number; referenceLabel?: string;
}) {
  const gid = useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id={`trend-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey={categoryKey} tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={formatCompact} />
        <Tooltip content={<ChartTooltip />} />
        {referenceValue != null && (
          <ReferenceLine y={referenceValue} stroke="var(--color-status-serious)" strokeDasharray="4 4" label={{ value: referenceLabel, position: "insideTopRight", fill: "var(--color-status-serious)", fontSize: 11 }} />
        )}
        <Area
          type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#trend-${gid})`}
          dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} name={dataKey}
          animationDuration={700} animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ComboChart({
  data, categoryKey, barKey, lineKey, barColor = SERIES[0], lineColor = SERIES[5], height = 260, referenceValue, referenceLabel,
}: {
  data: Record<string, any>[]; categoryKey: string; barKey: string; lineKey: string;
  barColor?: string; lineColor?: string; height?: number; referenceValue?: number; referenceLabel?: string;
}) {
  const gid = useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 4 }} barCategoryGap={16}>
        <defs>
          <linearGradient id={`combo-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={barColor} stopOpacity={1} />
            <stop offset="100%" stopColor={barColor} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey={categoryKey} tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis yAxisId="left" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={formatCompact} />
        <YAxis yAxisId="right" orientation="right" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={formatCompact} />
        <Tooltip content={<ChartTooltip />} />
        {referenceValue != null && (
          <ReferenceLine yAxisId="right" y={referenceValue} stroke="var(--color-status-serious)" strokeDasharray="4 4" label={{ value: referenceLabel, position: "insideTopRight", fill: "var(--color-status-serious)", fontSize: 11 }} />
        )}
        <Bar yAxisId="left" dataKey={barKey} fill={`url(#combo-${gid})`} radius={[4, 4, 0, 0]} maxBarSize={20} name={barKey} animationDuration={600} animationEasing="ease-out" />
        <Line yAxisId="right" type="monotone" dataKey={lineKey} stroke={lineColor} strokeWidth={2.5} dot={{ r: 3, fill: lineColor, strokeWidth: 0 }} activeDot={{ r: 5 }} name={lineKey} animationDuration={700} animationEasing="ease-out" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, dataKey, color = SERIES[0], height = 36 }: { data: Record<string, any>[]; dataKey: string; color?: string; height?: number }) {
  const gid = useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.75} fill={`url(#spark-${gid})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
