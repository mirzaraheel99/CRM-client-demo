import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { SERIES } from "../lib/chartTheme";

const gridColor = "var(--color-gridline)";
const axisColor = "var(--color-ink-muted)";
const tickStyle = { fill: axisColor, fontSize: 12 };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-xs shadow-lg [border-color:var(--color-border)]">
      {label && <p className="mb-1 font-medium text-[var(--color-ink-primary)]">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color ?? p.fill }} />
          <span className="text-[var(--color-ink-secondary)]">{p.name}:</span>
          <span className="font-medium tabular-nums text-[var(--color-ink-primary)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function HorizontalBarChart({
  data, dataKey, categoryKey, color = SERIES[0], height = 260, valueFormatter,
}: {
  data: Record<string, any>[]; dataKey: string; categoryKey: string; color?: string; height?: number;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke={gridColor} strokeDasharray="0" />
        <XAxis type="number" tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey={categoryKey} tick={tickStyle} axisLine={false} tickLine={false} width={110} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip />} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} name={dataKey}>
          {valueFormatter && null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VerticalBarChart({
  data, dataKey, categoryKey, color = SERIES[0], height = 240,
}: {
  data: Record<string, any>[]; dataKey: string; categoryKey: string; color?: string; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 4, bottom: 4 }} barCategoryGap={16}>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey={categoryKey} tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip />} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} name={dataKey} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data, height = 220, centerLabel, centerValue,
}: {
  data: { name: string; value: number }[]; height?: number; centerLabel?: string; centerValue?: string;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} strokeWidth={2} stroke="var(--color-surface-1)">
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES[i % SERIES.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs text-[var(--color-ink-secondary)]">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 36 }}>
          <span className="text-xl font-semibold tabular-nums text-[var(--color-ink-primary)]">{centerValue}</span>
          {centerLabel && <span className="text-[11px] text-[var(--color-ink-muted)]">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function TrendAreaChart({
  data, dataKey, categoryKey, color = SERIES[0], height = 240,
}: {
  data: Record<string, any>[]; dataKey: string; categoryKey: string; color?: string; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey={categoryKey} tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill="url(#trendFill)" dot={false} name={dataKey} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
