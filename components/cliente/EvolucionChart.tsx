"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ClienteDetail } from "@/lib/data-utils";
import { formatDate } from "@/lib/utils";

interface EvolucionChartProps {
  detail: ClienteDetail;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-2xl text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>{p.name}</span>
          <span className="font-semibold text-foreground">{p.value} cab.</span>
        </div>
      ))}
    </div>
  );
};

export default function EvolucionChart({ detail }: EvolucionChartProps) {
  const { transacciones, historial } = detail;

  const chartData = transacciones.map((t) => ({
    fecha: formatDate(t.fecha),
    fechaRaw: t.fecha,
    "Cabezas ofertadas": t.cabezas_ofertadas,
    estado: t.ESTADO,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-foreground">
          Evolución de Cabezas
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Línea de tiempo de operaciones · Las líneas verticales indican cambios de comercial
        </p>
      </div>

      {/* Legend for reference lines */}
      <div className="flex items-center gap-4 mb-4 mt-2">
        {historial.map((h) => (
          <div key={h.fecha_asignacion} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block w-3 h-0.5"
              style={{
                background: h.tipo === "NUEVA" ? "hsl(var(--positive))" : "hsl(var(--warning))",
                borderTop: "2px dashed",
              }}
            />
            <span>
              {h.tipo === "NUEVA" ? "Asignación" : "Reasignación"} - {h.AC} ({formatDate(h.fecha_asignacion)})
            </span>
          </div>
        ))}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--borderSecondary))"
              vertical={false}
            />
            <XAxis
              dataKey="fecha"
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
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--borderSecondary))" }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: "hsl(var(--contentSecondary))" }}
            />

            {/* Vertical milestone lines for each assignment */}
            {historial.map((h) => {
              const matchingDate = chartData.find(
                (d) => d.fechaRaw >= h.fecha_asignacion
              );
              if (!matchingDate) return null;
              return (
                <ReferenceLine
                  key={h.fecha_asignacion}
                  x={matchingDate.fecha}
                  stroke={h.tipo === "NUEVA" ? "hsl(var(--positive))" : "hsl(var(--warning))"}
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  label={{
                    value: h.AC.split(" ")[0],
                    position: "top",
                    fill: h.tipo === "NUEVA" ? "hsl(var(--positive))" : "hsl(var(--warning))",
                    fontSize: 10,
                  }}
                />
              );
            })}

            <Line
              type="monotone"
              dataKey="Cabezas ofertadas"
              stroke="hsl(var(--brand))"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--brand))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(var(--brand))", stroke: "hsl(var(--brandSecondary))", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
