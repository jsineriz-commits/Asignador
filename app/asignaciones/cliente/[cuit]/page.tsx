"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, User, Fingerprint, ShieldCheck, MessageSquare, ChevronDown, ChevronUp, Table as TableIcon } from "lucide-react";
import { 
  BarChart, 
  Bar,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine
} from "recharts";
import { getClienteDetail } from "@/lib/data-utils";
import { useData } from "@/lib/useData";

interface Props {
  params: { cuit: string };
}

const STATUS_COLORS: Record<string, string> = {
  "CONCRETADA": "hsl(var(--primary))",
  "PUBLICADO": "#3b82f6",
  "OFRECIMIENTOS": "#f59e0b",
  "NO CONCRETADAS": "#ef4444",
  "BAJA": "#94a3b8",
  "OTRO": "#6366f1",
  "S/D": "#cbd5e1"
};

export default function ClientePage({ params }: Props) {
  const { data, isLoading, isError } = useData();
  const [selectedEstado, setSelectedEstado] = useState("Todos");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activeCommentsPopup, setActiveCommentsPopup] = useState<any[] | null>(null);
  const [rolView, setRolView] = useState<"Vendedor" | "Comprador">("Vendedor");
  const [showDetalleTropas, setShowDetalleTropas] = useState(false);

  const detail = useMemo(() => {
    if (!data) return null;
    return getClienteDetail(data, params.cuit);
  }, [data, params.cuit]);

  const { uniqueEstados, chartData, assignmentDateKey, availableStatuses } = useMemo(() => {
    if (!detail) return { uniqueEstados: [], chartData: [], assignmentDateKey: null, availableStatuses: [] };
    
    const isDrillDown = !!selectedMonth;

    // 1. Filtrar los estados disponibles globalmente para la leyenda
    let baseFilteredGlobal = rolView === "Vendedor" ? detail.transaccionesEvolucionVendedor : detail.transaccionesEvolucionComprador;
    if (selectedEstado !== "Todos") {
      baseFilteredGlobal = baseFilteredGlobal.filter((t: any) => t.estado === selectedEstado);
    }
    const extractedStatuses = Array.from(new Set(baseFilteredGlobal.map((t: any) => t.estado))).sort() as string[];
    const allStatuses = extractedStatuses.length > 0 ? extractedStatuses : ["S/D"];

    // 2. GENERAR ESTRUCTURA BASE (Filling Gaps)
    const aggregated = new Map<string, Record<string, any>>();
    
    if (isDrillDown) {
      // Todos los días del mes
      const [year, month] = selectedMonth.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const key = `${selectedMonth}-${String(d).padStart(2, "0")}`;
        const baseEntry: any = { fecha: key, total: 0 };
        allStatuses.forEach(s => baseEntry[s] = 0);
        aggregated.set(key, baseEntry);
      }
    } else {
      // Últimos 12 meses
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().substring(0, 7);
        const baseEntry: any = { fecha: key, total: 0 };
        allStatuses.forEach(s => baseEntry[s] = 0);
        aggregated.set(key, baseEntry);
      }
    }

    // 3. Mezclar datos reales
    const currentViewData = isDrillDown 
      ? baseFilteredGlobal.filter((t: any) => t.fecha.startsWith(selectedMonth))
      : baseFilteredGlobal;

    currentViewData.forEach((t: any) => {
      const key = isDrillDown ? t.fecha : t.fecha.substring(0, 7);
      // Solo agregamos si la fecha entra en el rango generado (ej: los 12 meses)
      if (aggregated.has(key)) {
        const entry = aggregated.get(key)!;
        entry[t.estado] = (entry[t.estado] || 0) + t.cabezas;
        entry.total = (entry.total || 0) + t.cabezas;
      }
    });

    // 4. Inyectar hito de asignación
    let assignmentKey = null;
    if (detail.acActual.fechaAsignacion) {
      // Usar fecha local firme para que coincida 100% con el UI
      const safeAsig = detail.acActual.fechaAsignacion.includes("T") 
        ? detail.acActual.fechaAsignacion 
        : detail.acActual.fechaAsignacion + "T00:00:00";
      const asigDate = new Date(safeAsig);
      
      if (!isNaN(asigDate.getTime())) {
        const yy = asigDate.getFullYear();
        const mm = String(asigDate.getMonth() + 1).padStart(2, "0");
        const dd = String(asigDate.getDate()).padStart(2, "0");
        assignmentKey = isDrillDown ? `${yy}-${mm}-${dd}` : `${yy}-${mm}`;
      } else {
        assignmentKey = detail.acActual.fechaAsignacion.substring(0, isDrillDown ? 10 : 7);
      }

      // Evitar romper el eje X si la fecha de asignación no pertenece a la vista actual
      if (isDrillDown && selectedMonth && !assignmentKey.startsWith(selectedMonth)) {
        assignmentKey = null;
      } else {
        if (assignmentKey && !aggregated.has(assignmentKey)) {
          aggregated.set(assignmentKey, { fecha: assignmentKey, isAssignment: true });
        }
      }
    }

    // 5. Inyectar comentarios en el gráfico
    if (detail.comentarios && detail.comentarios.length > 0) {
      detail.comentarios.forEach((c) => {
        if (!c.Fecha) return;
        const d = new Date(c.Fecha);
        if (!isNaN(d.getTime())) {
          const yy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          
          const key = isDrillDown 
            ? `${yy}-${mm}-${dd}`
            : `${yy}-${mm}`;
            
          if (aggregated.has(key)) {
            const entry = aggregated.get(key)!;
            if (!entry.comentariosData) entry.comentariosData = [];
            entry.comentariosData.push(c);
          }
        }
      });
    }

    const dataArr = Array.from(aggregated.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    const evolutionArray = rolView === "Vendedor" ? detail.transaccionesEvolucionVendedor : detail.transaccionesEvolucionComprador;

    return { 
      uniqueEstados: Array.from(new Set(evolutionArray.map((t: any) => t.estado))).sort() as string[], 
      chartData: dataArr, 
      assignmentDateKey: assignmentKey,
      availableStatuses: allStatuses
    };
  }, [detail, selectedEstado, selectedMonth, rolView]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-fade-in text-muted-foreground">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p>Cargando perfil de sociedad...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-20 text-center animate-fade-in">
        <h2 className="text-xl font-bold text-foreground">Error de Datos</h2>
        <p className="text-muted-foreground mt-2">
          No se pudieron cargar los datos del sistema.
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-20 text-center animate-fade-in flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-rose-400/10 flex items-center justify-center mb-4 text-rose-400 text-2xl">
          ×
        </div>
        <h2 className="text-xl font-bold text-foreground">Sociedad no encontrada</h2>
        <p className="text-muted-foreground mt-2 max-w-sm mb-6">
          La sociedad con CUIT "{params.cuit}" no existe en el maestro comercial o los datos son inconsistentes.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  const { sociedad } = detail;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Navegación / Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{sociedad.razon_social}</span>
        </div>
      </div>

      {/* Tarjeta Principal de Datos Básicos */}
      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Perfil de la Sociedad</h2>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Razón Social */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Razón Social</p>
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {sociedad.razon_social}
              </h1>
            </div>

            {/* CUIT */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identificación (CUIT)</p>
              <div className="flex items-center gap-2 text-foreground">
                <Fingerprint className="w-4 h-4 text-muted-foreground" />
                <span className="text-xl font-mono tracking-tight bg-secondary px-2 py-0.5 rounded leading-none">
                  {sociedad.cuit || "No registrado"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-border" />
                ID Interno: {sociedad.id}
              </p>
            </div>

            {/* Asesor Comercial */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asociado Comercial Asignado</p>
                {detail.acActual.fechaAsignacion && (
                  <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 shadow-sm flex flex-col items-end">
                    <span className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5">Fecha de Asignación</span>
                    <span className="text-sm font-mono whitespace-nowrap">
                      {new Date(detail.acActual.fechaAsignacion.includes("T") ? detail.acActual.fechaAsignacion : detail.acActual.fechaAsignacion + "T00:00:00").toLocaleDateString("es-AR")}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-none mb-1.5">
                    {detail.acActual.nombre || "Sin asignar"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Asignado por <span className="font-medium text-foreground/80">{detail.acActual.modificadoPor || "Sistema"}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Evolución de Cabezas Ofrecidas (Últimos 365 días) */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground leading-none mb-1">
                    {rolView === "Vendedor" ? "Evolución de cabezas ofrecidas" : "Evolución de cabezas ofertadas"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    {selectedMonth 
                      ? `Detalle Diario: ${new Date(selectedMonth + "-02T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" })}` 
                      : "Vista Mensual — Últimos 365 días"}
                  </p>
                </div>
              </div>
              {selectedMonth && (
                <button 
                  onClick={() => setSelectedMonth(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold hover:bg-secondary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver a vista mensual
                </button>
              )}
            </div>
            {/* Toggle de Rol y Filtro de Estado */}
            <div className="flex items-center gap-4">
              <div className="flex p-0.5 bg-secondary/50 rounded-lg border border-border shadow-sm">
                <button
                  onClick={() => setRolView("Vendedor")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                    rolView === "Vendedor" 
                      ? "bg-primary text-primary-foreground shadow" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  Como Vendedor
                </button>
                <button
                  onClick={() => setRolView("Comprador")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                    rolView === "Comprador" 
                      ? "bg-primary text-primary-foreground shadow" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  Como Comprador
                </button>
              </div>

              {!selectedMonth && uniqueEstados.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estado:</span>
                  <select 
                    value={selectedEstado} 
                    onChange={(e) => setSelectedEstado(e.target.value)}
                    className="text-xs bg-background border border-border rounded-md px-2 py-1 outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-primary transition-all font-medium pr-6 relative"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.75rem' }}
                  >
                    <option value="Todos">Todos</option>
                    {uniqueEstados.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="p-8">
            {chartData && chartData.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData} 
                    margin={{ top: 25, right: 30, left: 0, bottom: 20 }}
                    onClick={(data) => {
                      if (data && data.activeLabel && !selectedMonth) {
                        setSelectedMonth(String(data.activeLabel));
                      }
                    }}
                    style={{ cursor: !selectedMonth ? 'pointer' : 'default' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="fecha" 
                      axisLine={false} 
                      tickLine={false}
                      minTickGap={selectedMonth ? 0 : 30}
                      interval={selectedMonth ? 0 : "preserveStartEnd"}
                      tick={({ x, y, payload }) => {
                        const str = payload.value;
                        let formatted = "";
                        if (str.length === 10) {
                          formatted = new Date(str + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit" });
                        } else {
                          const d = new Date(str + "-02T00:00:00");
                          formatted = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
                        }
                        
                        const entry = chartData.find((d: any) => d.fecha === str);
                        const hasComments = entry?.comentariosData && entry.comentariosData.length > 0;

                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
                              {formatted}
                            </text>
                            {hasComments && (
                              <g 
                                transform="translate(0, 30)" 
                                style={{ cursor: "pointer", pointerEvents: "all" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCommentsPopup(entry.comentariosData);
                                }}
                              >
                                <text x={0} y={0} textAnchor="middle" fontSize={14} alignmentBaseline="middle">
                                  💬
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(val: number) => val.toLocaleString("es-AR")}
                      domain={[0, (dataMax: number) => (isNaN(dataMax) || dataMax === -Infinity || dataMax === 0) ? 10 : dataMax]}
                    />
                    <Tooltip 
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))", 
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                      }}
                      labelFormatter={(label: any) => {
                        if (!label) return "";
                        const str = String(label);
                        if (str.length === 10) {
                          return new Date(str + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
                        }
                        return new Date(str + "-02T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" });
                      }}
                      formatter={(val: any, name: any) => [Number(val).toLocaleString("es-AR") + " cabezas", String(name)]}
                    />
                    
                    {availableStatuses.map((status) => (
                      <Bar 
                        key={status}
                        dataKey={status} 
                        stackId="a" 
                        fill={STATUS_COLORS[status] || STATUS_COLORS["OTRO"]} 
                        animationDuration={1000}
                        radius={[0, 0, 0, 0]}
                      />
                    ))}

                    {/* Línea de Asignación pintada delante de las barras */}
                    {assignmentDateKey && (
                      <ReferenceLine 
                        x={assignmentDateKey} 
                        stroke="#f43f5e" 
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{ 
                          value: "Asignación", 
                          position: "top", 
                          fill: "#f43f5e", 
                          fontSize: 10,
                          fontWeight: "bold",
                          offset: 10
                        }} 
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No hay datos de evolución para este periodo</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">No se encontraron lotes para el estado seleccionado en los últimos 365 días.</p>
              </div>
            )}
            
            {/* Leyenda de Colores */}
            <div className="mt-6 pt-6 border-t border-border flex flex-wrap justify-center gap-x-6 gap-y-3">
              {availableStatuses.map(status => (
                <div key={status} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[status] || STATUS_COLORS["OTRO"] }} 
                  />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase opacity-80">{status}</span>
                </div>
              ))}
            </div>

            {/* Detalle Tropas Toggle Button & Table */}
            <div className="mt-8">
              <button
                onClick={() => setShowDetalleTropas(!showDetalleTropas)}
                className="w-full py-3 bg-secondary/30 hover:bg-secondary/50 border border-border shadow-sm rounded-xl flex items-center justify-center gap-2 transition-all group"
              >
                <TableIcon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-foreground/90">
                  {showDetalleTropas ? "Ocultar detalle de tropas" : "Ver detalle de tropas"}
                </span>
                {showDetalleTropas ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                )}
              </button>

              {showDetalleTropas && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
                  {chartData.length > 0 ? (() => {
                    const rawData = rolView === "Vendedor" ? detail?.transaccionesEvolucionVendedor : detail?.transaccionesEvolucionComprador;
                    if (!rawData) return null;
                    
                    let baseData = [...rawData];
                    if (selectedEstado !== "Todos") {
                      baseData = baseData.filter((t: any) => t.estado === selectedEstado);
                    }
                    if (selectedMonth) {
                      baseData = baseData.filter((t: any) => t.fecha && t.fecha.startsWith(selectedMonth));
                    }
                    
                    // Ordenar de más reciente a más antigua
                    baseData.sort((a: any, b: any) => b.fecha.localeCompare(a.fecha));

                    if (baseData.length === 0) {
                      return (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          No hay tropas para los filtros seleccionados
                        </div>
                      );
                    }

                    return (
                      <table className="w-full text-[11px] text-left whitespace-nowrap">
                        <thead className="bg-secondary/40 uppercase text-muted-foreground border-b border-border">
                          <tr>
                            <th className="px-3 py-3 font-semibold">Lote ID</th>
                            <th className="px-3 py-3 font-semibold">F. Publicación</th>
                            <th className="px-3 py-3 font-semibold">F. Operación</th>
                            <th className="px-3 py-3 font-semibold">Tipo</th>
                            <th className="px-3 py-3 font-semibold">UN</th>
                            <th className="px-3 py-3 font-semibold">R.S. Vendedora</th>
                            <th className="px-3 py-3 font-semibold">R.S. Compradora</th>
                            <th className="px-3 py-3 font-semibold text-right">Cabezas</th>
                            <th className="px-3 py-3 font-semibold">Estado</th>
                            <th className="px-3 py-3 font-semibold">Estado Tropa</th>
                            <th className="px-3 py-3 font-semibold">Motivo NC</th>
                            <th className="px-3 py-3 font-semibold">Canal Venta</th>
                            <th className="px-3 py-3 font-semibold">Canal Compra</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {baseData.map((t: any, idx: number) => {
                            const puDate = t.fecha_publicaciones && t.fecha_publicaciones.length > 5 ? new Date(t.fecha_publicaciones.includes("T") ? t.fecha_publicaciones : t.fecha_publicaciones + "T00:00:00").toLocaleDateString("es-AR", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "S/D";
                            const opDate = t.fecha_operacion && t.fecha_operacion.length > 5 ? new Date(t.fecha_operacion.includes("T") ? t.fecha_operacion : t.fecha_operacion + "T00:00:00").toLocaleDateString("es-AR", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "S/D";
                            return (
                              <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-3 py-2.5 font-mono text-muted-foreground">{t.id_lote || "S/D"}</td>
                                <td className="px-3 py-2.5 text-foreground/80">{puDate}</td>
                                <td className="px-3 py-2.5 text-foreground/80">{opDate}</td>
                                <td className="px-3 py-2.5 text-foreground/80">{t.Tipo || "S/D"}</td>
                                <td className="px-3 py-2.5 text-foreground/80">{t.UN || "S/D"}</td>
                                <td className="px-3 py-2.5 text-foreground font-medium max-w-[150px] truncate" title={t.RS_Vendedora || ""}>{t.RS_Vendedora || "S/D"}</td>
                                <td className="px-3 py-2.5 text-foreground font-medium max-w-[150px] truncate" title={t.RS_Compradora || ""}>{t.RS_Compradora || "S/D"}</td>
                                <td className="px-3 py-2.5 text-foreground font-semibold text-right">{t.cabezas?.toLocaleString("es-AR") || "0"}</td>
                                <td className="px-3 py-2.5">
                                  <span 
                                    className="px-2 py-0.5 rounded text-[10px] font-bold shadow-sm border align-middle whitespace-nowrap"
                                    style={{
                                      backgroundColor: `${STATUS_COLORS[t.estado] || STATUS_COLORS["OTRO"]}15`,
                                      color: STATUS_COLORS[t.estado] || STATUS_COLORS["OTRO"],
                                      borderColor: `${STATUS_COLORS[t.estado] || STATUS_COLORS["OTRO"]}30`
                                    }}
                                  >
                                    {t.estado}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-foreground/80 truncate max-w-[120px]" title={t.Estado_Trop || ""}>{t.Estado_Trop || "S/D"}</td>
                                <td className="px-3 py-2.5 text-foreground/80 truncate max-w-[150px]" title={t.Motivo_NC || ""}>{t.Motivo_NC || "S/D"}</td>
                                <td className="px-3 py-2.5 text-foreground/80 truncate max-w-[120px]" title={t.Canal_Venta || ""}>{t.Canal_Venta || "S/D"}</td>
                                <td className="px-3 py-2.5 text-foreground/80 truncate max-w-[120px]" title={t.Canal_compra || ""}>{t.Canal_compra || "S/D"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })() : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- COMENTARIOS CRM --- */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-foreground leading-none">Comentarios del CRM</h3>
            </div>
            <div className="text-[10px] font-semibold tracking-wider uppercase bg-secondary px-2 py-0.5 rounded text-muted-foreground mr-1">
              Últimas Actividades
            </div>
          </div>
          
          <div className="p-0 flex flex-col">
            {(() => {
              const asigStr = detail.acActual.fechaAsignacion;
              const asigTime = asigStr ? new Date(asigStr.includes("T") ? asigStr : asigStr + "T00:00:00").getTime() : 0;
              
              const postAsig: typeof detail.comentarios = [];
              const preAsig: typeof detail.comentarios = [];
              
              (detail.comentarios || []).forEach(c => {
                const cTime = c.Fecha ? new Date(c.Fecha).getTime() : 0;
                if (asigTime > 0 && cTime >= asigTime) postAsig.push(c);
                else preAsig.push(c);
              });

              const renderRows = (comments: typeof detail.comentarios) => {
                return comments.map((c, idx) => {
                  const fecha = c.Fecha 
                    ? new Date(c.Fecha).toLocaleDateString("es-AR", { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : "S/D";
                  const texto = c.Comentario || "Sin contenido";
                  const autor = c.Usuario || "S/D";
                  return (
                    <tr key={idx} className="hover:bg-secondary/10 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-muted-foreground/80 group-hover:text-foreground/80 transition-colors">
                        {fecha}
                      </td>
                      <td className="px-6 py-4 text-foreground/90 font-medium">
                        {String(texto)}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-muted-foreground/80 space-x-2">
                         <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                             {autor !== "S/D" ? autor.substring(0, 1).toUpperCase() : "?"}
                           </div>
                           <span className="truncate max-w-[100px]">{autor}</span>
                         </div>
                      </td>
                    </tr>
                  );
                });
              };

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-semibold w-[120px]">Fecha</th>
                        <th className="px-6 py-4 font-semibold">Comentario</th>
                        <th className="px-6 py-4 font-semibold w-[150px]">Autor</th>
                      </tr>
                    </thead>
                    
                    {/* Post Asignación Segment */}
                    <tbody>
                      <tr className="bg-primary/5">
                        <td colSpan={3} className="px-6 py-2 text-xs font-bold text-primary uppercase tracking-wider">
                          Post Asignación
                        </td>
                      </tr>
                      {postAsig.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground text-sm italic opacity-80">
                            No hubo comentarios luego de la asignación en el CRM
                          </td>
                        </tr>
                      ) : (
                        renderRows(postAsig)
                      )}
                    </tbody>

                    {/* Pre Asignación Segment */}
                    {preAsig.length > 0 && (
                      <tbody className="border-t border-border">
                        <tr className="bg-secondary/30">
                          <td colSpan={3} className="px-6 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Previos a la Asignación
                          </td>
                        </tr>
                        {renderRows(preAsig)}
                      </tbody>
                    )}
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* --- MODAL POPUP DE COMENTARIOS DEL GRÁFICO --- */}
      {activeCommentsPopup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in" 
          onClick={() => setActiveCommentsPopup(null)}
        >
          <div 
            className="bg-card border border-border shadow-lg rounded-xl w-full max-w-md overflow-hidden relative" 
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-secondary/50 px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span className="text-lg leading-none">💬</span>
                Comentarios en el período
              </h3>
              <button 
                onClick={() => setActiveCommentsPopup(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
              {activeCommentsPopup.map((c, idx) => (
                <div key={idx} className="bg-secondary/20 rounded-lg p-4 border border-border/50 shadow-sm relative group">
                  <div className="flex flex-col gap-1 mb-2">
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                         {(c.Usuario || "S/D").substring(0, 1).toUpperCase()}
                       </div>
                       <span className="text-sm font-semibold text-primary">{c.Usuario || "S/D"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono ml-7">
                      {c.Fecha ? new Date(c.Fecha).toLocaleDateString("es-AR", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "S/D"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed font-medium mt-2 whitespace-pre-wrap ml-7">
                    {c.Comentario || "Sin contenido"}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border bg-secondary/20 flex justify-end">
               <button 
                 onClick={() => setActiveCommentsPopup(null)}
                 className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
               >
                 Cerrar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
