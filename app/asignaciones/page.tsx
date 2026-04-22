"use client";

import { useState, useMemo } from "react";
import { useFilter } from "@/contexts/FilterContext";
import { useData } from "@/lib/useData";
import {
  getDinamicaAsignaciones,
  getDistribucionMotivos,
  getSilencioComercial,
  getOnboardingFeed,
  getDashboardKPIs,
} from "@/lib/data-utils";
import DinamicaChart from "@/components/dashboard/DinamicaChart";
import MotivosChart from "@/components/dashboard/MotivosChart";
import SilencioTable from "@/components/dashboard/SilencioTable";
import OnboardingFeed from "@/components/dashboard/OnboardingFeed";
import KPIBoard from "@/components/dashboard/KPIBoard";

// Pantalla de error general/cargando básica
function LoaderState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-20 animate-fade-in text-muted-foreground">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ error }: { error: any }) {
  return (
    <div className="p-20 text-center animate-fade-in">
      <div className="inline-block px-4 py-2 rounded-lg bg-rose-400/10 border border-rose-400/20 text-rose-400 mb-2">
        Aviso
      </div>
      <h2 className="text-xl font-bold text-foreground">Falta Conexión de Datos</h2>
      <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
        Por favor configura tus variables <code>.env.local</code> según las instrucciones del <code>CONTEXT.md</code> para levantar Metabase y Sheets.
      </p>
      <div className="mt-4 p-4 rounded bg-background border border-border text-xs text-left max-w-lg mx-auto overflow-auto font-mono text-rose-400/80">
        {String(error)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { selectedAC, selectedYear, selectedMonth, selectedFuente } = useFilter();
  const { data, isLoading, isError, error } = useData();

  const [selectedModificadoPor, setSelectedModificadoPor] = useState<string | null>(null);

  const ALLOWED_RESPONSABLES = [
    "Agustin Rivas",
    "Juan Segundo  Tonon",
    "Juan Sineriz",
    "Santos Dewey",
    "Paulina Taffarel"
  ];

  const responsables = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.historial.map((h) => h.modificado_por).filter(Boolean) as string[]);
    // Filter the dynamic list to ONLY include the allowed names (and maintain intersection in case one has no logic, though returning the hardcode is also fine)
    return ALLOWED_RESPONSABLES.filter(r => set.has(r)).sort();
  }, [data]);

  if (isLoading) return <LoaderState message="Obteniendo datos en tiempo real..." />;
  if (isError || !data) return <ErrorState error={error} />;

  // Derived filtered data
  // NOTA: getDistribucionMotivos NO recibe filtroFuente → el donut siempre muestra el panorama completo
  const dinamica = getDinamicaAsignaciones(data, selectedAC ?? undefined, selectedModificadoPor ?? undefined, selectedFuente ?? undefined);
  const motivos = getDistribucionMotivos(data, selectedAC ?? undefined, selectedYear, selectedMonth ?? undefined, selectedModificadoPor ?? undefined);
  const silencio = getSilencioComercial(data, selectedAC ?? undefined, selectedYear, selectedMonth ?? undefined, selectedModificadoPor ?? undefined, selectedFuente ?? undefined);
  const onboarding = getOnboardingFeed(data, selectedAC ?? undefined, selectedYear, selectedMonth ?? undefined, selectedModificadoPor ?? undefined, selectedFuente ?? undefined);
  const kpis = getDashboardKPIs(data, selectedAC ?? undefined, selectedYear, selectedMonth ?? undefined, selectedModificadoPor ?? undefined, selectedFuente ?? undefined);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {selectedAC ? (
              <>
                Dashboard ·{" "}
                <span className="text-gradient">{selectedAC}</span>
              </>
            ) : (
              "Dashboard General"
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {selectedAC
              ? "Vista filtrada por asociado comercial"
              : "Monitoreo integral de la red comercial agronegocios"}
          </p>
        </div>

        {/* Current date */}
        <div className="hidden sm:block text-right">
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-positive"></span>
            </span>
            <p className="text-[10px] text-positive/80 uppercase font-semibold tracking-wider">
              En Vivo (SWR)
            </p>
          </div>
        </div>
      </div>

      {responsables.length > 0 && (
        <div className="flex items-center gap-3 bg-card/50 p-2.5 rounded-lg border border-border mt-2 w-fit">
          <label htmlFor="modificador-select" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Resp. Asignación:
          </label>
          <select 
            id="modificador-select"
            value={selectedModificadoPor || ""}
            onChange={(e) => setSelectedModificadoPor(e.target.value === "" ? null : e.target.value)}
            className="w-[220px] px-2.5 py-1.5 text-sm rounded-md bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="">Todos los responsables</option>
            {responsables.map((r) => (
              <option key={r} value={r}>{r.replace(/\s+/g, " ").trim()}</option>
            ))}
          </select>
        </div>
      )}

      <KPIBoard data={kpis} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 300 }}>
        <div className="lg:col-span-2 h-[300px]">
          <DinamicaChart data={dinamica} />
        </div>
        <div className="h-[300px]">
          <MotivosChart data={motivos} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SilencioTable data={silencio} />
        <OnboardingFeed data={onboarding} />
      </div>
    </div>
  );
}

