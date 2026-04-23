"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { SilencioItem } from "@/lib/data-utils";
import { formatDate, cn } from "@/lib/utils";

interface SilencioTableProps {
  data: SilencioItem[];
}

function DiasBadge({ dias }: { dias: number }) {
  const level = dias >= 20 ? "critical" : dias >= 10 ? "warning" : "alert";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        level === "critical" && "bg-negative/15 text-negative",
        level === "warning" && "bg-warning/15 text-warning",
        level === "alert" && "bg-notice/15 text-notice"
      )}
    >
      <AlertTriangle className="w-3 h-3" />
      {dias}d
    </span>
  );
}

export default function SilencioTable({ data }: SilencioTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-sm font-bold text-[hsl(var(--negative))] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--negative))] animate-pulse" />
            Silencio Comercial
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Asignados en el período seleccionado sin contacto en CRM
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[hsl(var(--negative))] text-white shadow-sm">
          {data.length} alertas
        </span>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
          <span className="text-2xl">✓</span>
          <p className="text-sm">Sin alertas de silencio activas</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sociedad
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Comercial
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Asignación
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Motivo
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Silencio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((item) => (
                <tr
                  key={item.id_sociedad}
                  className="hover:bg-secondary/40 transition-colors group"
                >
                  <td className="px-5 py-3">
                    {item.cuit ? (
                      <Link
                        href={`/asignaciones/cliente/${item.cuit}`}
                        className="font-medium text-foreground group-hover:text-primary transition-colors"
                      >
                        {item.razon_social}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{item.razon_social}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">
                    {item.asociado_comercial}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">
                    {formatDate(item.fecha_asignacion)}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell max-w-[150px] truncate">
                    {item.fuente || "S/D"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DiasBadge dias={item.dias_desde_asignacion} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
