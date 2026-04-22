"use client";

import { UserPlus, RefreshCw } from "lucide-react";
import type { ClienteDetail } from "@/lib/data-utils";
import { formatDate, cn } from "@/lib/utils";

interface AsignacionTimelineProps {
  detail: ClienteDetail;
}

export default function AsignacionTimeline({ detail }: AsignacionTimelineProps) {
  const { historial } = detail;
  const sorted = [...historial].sort((a, b) =>
    b.fecha_asignacion.localeCompare(a.fecha_asignacion)
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Historial de Asignaciones
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-5">
          {sorted.map((item, i) => {
            const isFirst = i === 0;
            return (
              <div key={item.fecha_asignacion} className="flex gap-4 pl-2 relative">
                {/* Dot */}
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0",
                    item.tipo === "NUEVA"
                      ? "border-positive bg-positive/15"
                      : "border-warning bg-warning/15"
                  )}
                >
                  {item.tipo === "NUEVA" ? (
                    <UserPlus className="w-3 h-3 text-positive" />
                  ) : (
                    <RefreshCw className="w-3 h-3 text-warning" />
                  )}
                </div>

                {/* Content */}
                <div className={cn("flex-1 pb-1", !isFirst && "opacity-80")}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {item.AC}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        item.tipo === "NUEVA"
                          ? "bg-positive/10 text-positive"
                          : "bg-warning/10 text-warning"
                      )}
                    >
                      {item.tipo === "NUEVA" ? "Nueva asignación" : "Reasignación"}
                    </span>
                    {isFirst && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(item.fecha_asignacion)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
