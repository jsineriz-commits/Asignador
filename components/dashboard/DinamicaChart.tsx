"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DinamicaMes } from "@/lib/data-utils";

interface DinamicaChartProps {
  data: DinamicaMes[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-2xl text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: p.color }}
          />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DinamicaChart({ data }: DinamicaChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Dinámica de Asignaciones
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nuevas asignaciones vs. reasignaciones por mes
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            barCategoryGap="30%"
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--borderSecondary))"
              vertical={false}
            />
            <XAxis
              dataKey="mes"
              tick={{ fill: "hsl(var(--contentSecondary))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--contentSecondary))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--backgroundTertiary))" }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: "hsl(var(--contentSecondary))" }}
            />
            <Bar
              dataKey="nuevas"
              name="Nuevas"
              fill="hsl(var(--brand))"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="reasignaciones"
              name="Reasignaciones"
              fill="hsl(var(--backgroundSelected))"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
