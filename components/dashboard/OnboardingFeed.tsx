"use client";

import Link from "next/link";
import { ArrowRight, UserPlus, RefreshCw } from "lucide-react";
import type { OnboardingItem } from "@/lib/data-utils";
import { formatDate, cn } from "@/lib/utils";

interface OnboardingFeedProps {
  data: OnboardingItem[];
}

const AC_INITIALS: Record<string, string> = {
  "Lucas Fernández": "LF",
  "Martina Gómez": "MG",
  "Carlos Ruiz": "CR",
  "Valeria Torres": "VT",
  "Diego Méndez": "DM",
};

const AC_COLORS: Record<string, string> = {
  "Lucas Fernández": "bg-positive/20 text-positive",
  "Martina Gómez": "bg-primary/20 text-primary",
  "Carlos Ruiz": "bg-brand/20 text-brand",
  "Valeria Torres": "bg-warning/20 text-warning",
  "Diego Méndez": "bg-notice/20 text-notice",
};

export default function OnboardingFeed({ data }: OnboardingFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-sm font-bold text-[hsl(var(--positive))] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--positive))]" />
            Últimas Asignaciones
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Asignaciones del período seleccionado
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[hsl(var(--positive))] text-white shadow-sm">
          {data.length} registros
        </span>
      </div>

      {/* Feed */}
      <div className="divide-y divide-border overflow-y-auto max-h-[400px]">
        {data.map((item, i) => {
          const initials = AC_INITIALS[item.AC] ?? item.AC.slice(0, 2).toUpperCase();
          const color = AC_COLORS[item.AC] ?? "bg-muted text-muted-foreground";
          return (
            <div
              key={`${item.id_sociedad}-${i}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors group animate-fade-in"
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  color
                )}
              >
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/cliente/${item.cuit}`}
                    className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate"
                  >
                    {item.razon_social}
                  </Link>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      item.tipo === "NUEVA"
                        ? "bg-positive/10 text-positive"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    {item.tipo === "NUEVA" ? (
                      <UserPlus className="w-2.5 h-2.5" />
                    ) : (
                      <RefreshCw className="w-2.5 h-2.5" />
                    )}
                    {item.tipo === "NUEVA" ? "Nueva" : "Reasig."}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Asignado a <span className="text-foreground">{item.AC}</span>
                  {" · "}
                  {formatDate(item.fecha_asignacion)}
                </p>
              </div>

              {/* Arrow */}
              <Link
                href={`/cliente/${item.cuit}`}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
