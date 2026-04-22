"use client";

import { Users, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { KPIs } from "@/lib/data-utils";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  kpis: KPIs;
}

const CARDS = [
  {
    key: "coberturaPct" as const,
    title: "Cobertura de Cuentas",
    subtitle: "Sociedades con AC asignado",
    icon: Users,
    suffix: "%",
    color: "text-[hsl(var(--brand))]",
    bg: "bg-[hsl(var(--brand))]/10",
    border: "border-[hsl(var(--brand))]/20",
    glow: "hover:shadow-[hsl(var(--brand))]/5",
    trend: (v: number) => (v >= 80 ? "↑ Buena cobertura" : "↓ Requiere atención"),
    trendColor: (v: number) => (v >= 80 ? "text-[hsl(var(--positive))]" : "text-[hsl(var(--warning))]"),
  },
  {
    key: "tiempoPromedioReasignacion" as const,
    title: "Tiempo Prom. Reasignación",
    subtitle: "Días entre reasignaciones",
    icon: Clock,
    suffix: " días",
    color: "text-[hsl(var(--primary))]",
    bg: "bg-[hsl(var(--primary))]/10",
    border: "border-[hsl(var(--primary))]/20",
    glow: "hover:shadow-[hsl(var(--primary))]/5",
    trend: (v: number) => (v < 90 ? "↑ Ciclo ágil" : "↓ Ciclo prolongado"),
    trendColor: (v: number) => (v < 90 ? "text-[hsl(var(--positive))]" : "text-[hsl(var(--warning))]"),
  },
  {
    key: "volumenMesActual" as const,
    title: "Volumen Red (Mes)",
    subtitle: "Cabezas concretadas en el mes",
    icon: TrendingUp,
    suffix: " cab.",
    color: "text-[hsl(var(--positive))]",
    bg: "bg-[hsl(var(--positive))]/10",
    border: "border-[hsl(var(--positive))]/20",
    glow: "hover:shadow-[hsl(var(--positive))]/10",
    trend: () => "↑ Mes en curso",
    trendColor: () => "text-[hsl(var(--positive))]",
  },
  {
    key: "sinAsignar" as const,
    title: "Sin Asignar",
    subtitle: "Sociedades sin AC activo",
    icon: AlertCircle,
    suffix: "",
    color: "text-[hsl(var(--negative))]",
    bg: "bg-[hsl(var(--negative))]/10",
    border: "border-[hsl(var(--negative))]/20",
    glow: "hover:shadow-[hsl(var(--negative))]/10",
    trend: (v: number) => (v === 0 ? "✓ Cobertura total" : `${v} pendientes`),
    trendColor: (v: number) => (v === 0 ? "text-[hsl(var(--positive))]" : "text-[hsl(var(--negative))]"),
  },
];

export default function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {CARDS.map(({ key, title, subtitle, icon: Icon, suffix, color, bg, border, glow, trend, trendColor }) => {
        const value = kpis[key];
        return (
          <div
            key={key}
            className={cn(
              "relative rounded-xl border p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-xl cursor-default animate-fade-in",
              "bg-card",
              border,
              glow
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className={cn("p-2.5 rounded-lg", bg)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", bg, color)}>
                {trendColor(value) === "text-[hsl(var(--positive))]" ? "●" : "●"} {trend(value)}
              </span>
            </div>

            {/* Value */}
            <div>
              <p className="text-3xl font-bold text-foreground tracking-tight">
                {key === "volumenMesActual"
                  ? formatNumber(value)
                  : value}
                <span className="text-lg font-normal text-muted-foreground ml-1">
                  {suffix}
                </span>
              </p>
              <p className="text-sm font-medium text-foreground mt-0.5">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>

            {/* Progress bar for coverage */}
            {key === "coberturaPct" && (
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-[hsl(var(--brand))] transition-all duration-700"
                  style={{ width: `${value}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
