"use client";

import { useState } from "react";
import { Building2, Activity, VolumeX, Clock } from "lucide-react";
import type { DashboardKPIs } from "@/lib/data-utils";
import KPIDrawer, { KPIDrawerType } from "./KPIDrawer";

interface KPIBoardProps {
  data: DashboardKPIs | null;
  isLoading: boolean;
}

export default function KPIBoard({ data, isLoading }: KPIBoardProps) {
  const [drawerType, setDrawerType] = useState<KPIDrawerType>(null);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 flex items-center shadow-sm animate-pulse h-[116px]"
          >
            <div className="w-10 h-10 rounded-lg bg-white/5 mr-4" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-white/5 rounded w-1/2" />
              <div className="h-8 bg-white/5 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const {
    totalAsignadas,
    nuevas,
    reasignadas,
    activadas,
    pctActivacion,
    silencioComercialPct,
    silencioComercialAbs,
    tiempoPromedioActivacion,
  } = data;

  // Determinar color de silencio comercial
  let silencioColor = "text-emerald-400"; // < 20%
  if (silencioComercialPct >= 50) silencioColor = "text-rose-500";
  else if (silencioComercialPct >= 20) silencioColor = "text-amber-400";

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
      {/* Tarjeta 1 - Total Sociedades Asignadas */}
      <div 
        onClick={() => setDrawerType("asignadas")}
        className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 flex shadow-sm hover:border-white/10 hover:bg-white/[0.02] cursor-pointer transition-colors"
      >
        <div className="bg-blue-500/10 p-3 rounded-lg h-fit mr-4 border border-blue-500/20">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[13px] text-gray-400 font-medium mb-1 tracking-wide uppercase">
            Total Asignadas
          </p>
          <div className="text-[32px] leading-tight font-semibold text-white mb-1.5">
            {totalAsignadas}
          </div>
          <div className="flex items-center gap-3 text-[13px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{nuevas} Nuevas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{reasignadas} Reasig.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta 2 - Sociedades Activadas */}
      <div 
        onClick={() => setDrawerType("activadas")}
        className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 flex shadow-sm hover:border-white/10 hover:bg-white/[0.02] cursor-pointer transition-colors"
      >
        <div className="bg-emerald-500/10 p-3 rounded-lg h-fit mr-4 border border-emerald-500/20">
          <Activity className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[13px] text-gray-400 font-medium mb-1 tracking-wide uppercase">
            Sociedades Activadas
          </p>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[32px] leading-tight font-semibold text-white">
              {activadas}
            </span>
            <span className="text-emerald-400 text-sm font-medium">
              ({pctActivacion}%)
            </span>
          </div>
          <p className="text-[13px] text-gray-400">
            Con operaciones registradas
          </p>
        </div>
      </div>

      {/* Tarjeta 3 - Tasa de Silencio Comercial */}
      <div 
        onClick={() => setDrawerType("silencios")}
        className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 flex shadow-sm hover:border-white/10 hover:bg-white/[0.02] cursor-pointer transition-colors"
      >
        <div className="bg-rose-500/10 p-3 rounded-lg h-fit mr-4 border border-rose-500/20">
          <VolumeX className="w-5 h-5 text-rose-400" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[13px] text-gray-400 font-medium mb-1 tracking-wide uppercase">
            Silencio Comercial
          </p>
          <div className="text-[32px] leading-tight font-semibold text-white mb-1.5 flex items-center gap-2">
            <span className={silencioColor}>{silencioComercialPct}%</span>
          </div>
          <p className="text-[13px] text-gray-400">
            {silencioComercialAbs} de {data.totalAsignadas} sociedades
          </p>
        </div>
      </div>

      {/* Tarjeta 4 - Tiempo Promedio hasta Primera Activación */}
      <div 
        onClick={() => setDrawerType("tiempo")}
        className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 flex shadow-sm hover:border-white/10 hover:bg-white/[0.02] cursor-pointer transition-colors"
      >
        <div className="bg-violet-500/10 p-3 rounded-lg h-fit mr-4 border border-violet-500/20">
          <Clock className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[13px] text-gray-400 font-medium mb-1 tracking-wide uppercase uppercase">
            T. Prom. Activación
          </p>
          <div className="text-[32px] leading-tight font-semibold text-white mb-1.5 flex items-baseline gap-1">
            {tiempoPromedioActivacion !== null ? (
              <>
                {tiempoPromedioActivacion} <span className="text-lg text-gray-400 font-normal">días</span>
              </>
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </div>
          <p className="text-[13px] text-gray-400">
            Desde la asignación
          </p>
        </div>
      </div>
      </div>

      <KPIDrawer 
        isOpen={!!drawerType} 
        onClose={() => setDrawerType(null)} 
        type={drawerType} 
        data={data} 
      />
    </>
  );
}
