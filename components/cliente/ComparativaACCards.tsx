"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import type { ClienteDetail } from "@/lib/data-utils";

interface ComparativaACCardsProps {
  detail: ClienteDetail;
}

export default function ComparativaACCards({ detail }: ComparativaACCardsProps) {
  const { acActual, acAnterior, variacionPct } = detail;

  const isPositive = variacionPct !== null && variacionPct > 0;
  const isNegative = variacionPct !== null && variacionPct < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* AC Actual */}
      <div className="rounded-xl border border-positive/30 bg-card p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-positive/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-positive" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              AC Actual
            </p>
          </div>
          <p className="text-lg font-bold text-foreground">{acActual.nombre}</p>
          <p className="text-3xl font-bold text-positive mt-2">
            {formatNumber(acActual.volumen)}
            <span className="text-base font-normal text-muted-foreground ml-1">cab.</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Volumen concretado desde su asignación
          </p>

          {/* Variation badge */}
          {variacionPct !== null && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-sm font-semibold",
                isPositive && "bg-positive/15 text-positive",
                isNegative && "bg-negative/15 text-negative",
                !isPositive && !isNegative && "bg-muted text-muted-foreground"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : isNegative ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              {isPositive ? "+" : ""}
              {variacionPct}% vs. AC anterior
            </div>
          )}
        </div>
      </div>

      {/* AC Anterior */}
      {acAnterior ? (
        <div className="rounded-xl border border-border bg-card p-5 relative overflow-hidden">
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                AC Anterior
              </p>
            </div>
            <p className="text-lg font-bold text-muted-foreground">{acAnterior.nombre}</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {formatNumber(acAnterior.volumen)}
              <span className="text-base font-normal text-muted-foreground ml-1">cab.</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Volumen concretado durante su período
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-5 flex flex-col items-center justify-center text-center gap-2">
          <span className="text-2xl opacity-30">○</span>
          <p className="text-sm text-muted-foreground">Sin AC anterior registrado</p>
          <p className="text-xs text-muted-foreground/60">
            Esta fue la primera asignación de la sociedad
          </p>
        </div>
      )}
    </div>
  );
}
