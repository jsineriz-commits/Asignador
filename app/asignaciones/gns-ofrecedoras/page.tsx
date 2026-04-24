"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  ClipboardList,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  Store,
  AlertCircle,
  X,
  MapPin,
  User,
  BarChart2,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Ofrecedora = {
  cuit_vend: string;
  soc_vend: string;
  decision: string;
  ac_vend: string;
  repre_vend: string;
  prov_sv: string;
  part_sv: string;
  segmento_cliente: string;
  Q_OFREC: string;
  Q_VENTAS: string;
  kt: string;
  kv: string;
  responsable: string;
  [key: string]: string;
};

const PAGE_SIZE = 15;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: "blue" | "indigo" | "emerald";
  isLoading: boolean;
}) {
  const accentMap = {
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      icon: "text-blue-400",
      value: "text-white",
    },
    indigo: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      icon: "text-indigo-400",
      value: "text-white",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: "text-emerald-400",
      value: "text-emerald-400",
    },
  };
  const a = accentMap[accent];

  if (isLoading) {
    return (
      <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 flex items-center shadow-sm animate-pulse h-[100px]">
        <div className={cn("p-3 rounded-lg h-fit mr-4 border", a.bg, a.border)}>
          <div className="w-5 h-5 rounded bg-white/10" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/5 rounded w-1/2" />
          <div className="h-7 bg-white/5 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 flex items-center shadow-sm hover:border-white/10 hover:bg-white/[0.02] transition-colors">
      <div className={cn("p-3 rounded-lg h-fit mr-4 border shrink-0", a.bg, a.border)}>
        <Icon className={cn("w-5 h-5", a.icon)} />
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <p className="text-[12px] text-gray-400 font-medium mb-1 tracking-wide uppercase truncate">
          {label}
        </p>
        <div className={cn("text-[28px] leading-tight font-semibold", a.value)}>
          {typeof value === "number" ? value.toLocaleString("es-AR") : value}
        </div>
        {sub && <p className="text-[12px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Segmento Badge ───────────────────────────────────────────────────────────
function SegmentoBadge({ segmento }: { segmento: string }) {
  if (!segmento) return <span className="text-muted-foreground/40">-</span>;
  const s = segmento.trim().toUpperCase();
  const cls = s.includes("NUEVO")
    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
    : s.includes("RECUPERADO")
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-secondary text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider whitespace-nowrap",
        cls
      )}
    >
      {segmento}
    </span>
  );
}

// ─── Decision Badge ───────────────────────────────────────────────────────────
function DecisionBadge({ decision }: { decision: string }) {
  if (!decision) return <span className="text-muted-foreground/40">-</span>;
  const d = decision.trim().toUpperCase();
  const cls = d.includes("ASIGNAR")
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : "bg-amber-500/15 text-amber-400 border-amber-500/30"; // Validar OP
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider whitespace-nowrap",
        cls
      )}
    >
      {decision}
    </span>
  );
}

// ─── Sort types ───────────────────────────────────────────────────────────────
type SortDir = "asc" | "desc" | null;

const COLUMNS: { label: string; key: keyof Ofrecedora | null; numeric?: boolean }[] = [
  { label: "KT",           key: "kt",               numeric: true },
  { label: "KV",           key: "kv",               numeric: true },
  { label: "SOCIEDAD",     key: "soc_vend" },
  { label: "DECISIÓN",     key: "decision" },
  { label: "AC",           key: "ac_vend" },
  { label: "REP",          key: "repre_vend" },
  { label: "PROVINCIA",    key: "prov_sv" },
  { label: "PARTIDO",      key: "part_sv" },
  { label: "SEGMENTO",     key: "segmento_cliente" },
  { label: "Q OFREC",      key: "Q_OFREC",          numeric: true },
  { label: "Q VENTAS",     key: "Q_VENTAS",          numeric: true },
  { label: "DECISIÓN FÓRMULA", key: "responsable" },
];

// ─── Sort Icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: keyof Ofrecedora | null; sortKey: keyof Ofrecedora | null; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  if (sortDir === "asc") return <ChevronUp className="w-3 h-3 text-primary" />;
  if (sortDir === "desc") return <ChevronDown className="w-3 h-3 text-primary" />;
  return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GNSOfrecedorasPage() {
  const [ofrecedoras, setOfrecedoras] = useState<Ofrecedora[]>([]);
  const [activeTab, setActiveTab] = useState<"ofrecedoras" | "gestionadas">("ofrecedoras");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Ofrecedora | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: keyof Ofrecedora | null) => {
    if (!key) return;
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  };

  useEffect(() => {
    fetch("/api/asignaciones/ofrecedoras")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        // Convertir todos los campos numéricos a string para consistencia con el tipo
        const parsed: Ofrecedora[] = (d.ofrecedoras || []).map((o: Record<string, unknown>) => ({
          cuit_vend:        String(o.cuit_vend ?? ""),
          soc_vend:         String(o.soc_vend ?? ""),
          decision:         String(o.decision ?? "Validar OP"),
          ac_vend:          String(o.ac_vend ?? ""),
          repre_vend:       String(o.repre_vend ?? ""),
          prov_sv:          String(o.prov_sv ?? ""),
          part_sv:          String(o.part_sv ?? ""),
          segmento_cliente: String(o.segmento_cliente ?? ""),
          Q_OFREC:          String(o.Q_OFREC ?? "0"),
          Q_VENTAS:         String(o.Q_VENTAS ?? "0"),
          kt:               String(o.kt ?? "0"),
          kv:               String(o.kv ?? "0"),
          responsable:      String(o.responsable ?? ""),
        }));
        setOfrecedoras(parsed);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalSociedades = ofrecedoras.length;
    const totalOfrec = ofrecedoras.reduce((acc, o) => acc + (parseFloat(o.Q_OFREC) || 0), 0);
    const totalVentas = ofrecedoras.reduce((acc, o) => acc + (parseFloat(o.Q_VENTAS) || 0), 0);
    return { totalSociedades, totalOfrec, totalVentas };
  }, [ofrecedoras]);

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return ofrecedoras;
    const q = search.toLowerCase();
    return ofrecedoras.filter(
      (o) =>
        o.soc_vend?.toLowerCase().includes(q) ||
        o.ac_vend?.toLowerCase().includes(q) ||
        o.repre_vend?.toLowerCase().includes(q) ||
        o.prov_sv?.toLowerCase().includes(q) ||
        o.part_sv?.toLowerCase().includes(q) ||
        o.segmento_cliente?.toLowerCase().includes(q) ||
        o.decision?.toLowerCase().includes(q) ||
        o.responsable?.toLowerCase().includes(q) ||
        o.cuit_vend?.includes(q)
    );
  }, [ofrecedoras, search]);

  // ── Ordenamiento ─────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const col = COLUMNS.find((c) => c.key === sortKey);
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      let cmp: number;
      if (col?.numeric) {
        cmp = (parseFloat(av) || 0) - (parseFloat(bv) || 0);
      } else {
        cmp = av.toString().localeCompare(bv.toString(), "es", { sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Reset page on search change
  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Store className="w-6 h-6 text-primary" />
            GNS Ofrecedoras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo y gestión de sociedades ofrecedoras de GNS.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          icon={Building2}
          label="Cantidad de Sociedades"
          value={isLoading ? "-" : kpis.totalSociedades}
          sub="Total de sociedades ofrecedoras"
          accent="blue"
          isLoading={isLoading}
        />
        <KPICard
          icon={ClipboardList}
          label="Q Ofrecimientos"
          value={isLoading ? "-" : kpis.totalOfrec}
          sub="Suma total de ofrecimientos"
          accent="indigo"
          isLoading={isLoading}
        />
        <KPICard
          icon={TrendingUp}
          label="Q Ventas"
          value={isLoading ? "-" : kpis.totalVentas}
          sub="Suma total de ventas concretadas"
          accent="emerald"
          isLoading={isLoading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>
            <strong>Error al cargar datos:</strong> {error}
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Tab switcher + búsqueda */}
        <div className="px-5 pt-4 pb-0 border-b border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="flex items-end gap-0">
            <button
              onClick={() => { setActiveTab("ofrecedoras"); setPage(1); }}
              className={cn(
                "px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                activeTab === "ofrecedoras"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Listado de Sociedades Ofrecedoras
              {!isLoading && (
                <span className="ml-2 text-xs font-normal opacity-60">
                  ({ofrecedoras.length})
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("gestionadas"); setPage(1); }}
              className={cn(
                "px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                activeTab === "gestionadas"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Listado de Sociedades Gestionadas
            </button>
          </div>

          {/* Búsqueda (solo en tab ofrecedoras) */}
          {activeTab === "ofrecedoras" && (
            <div className="relative w-full sm:w-64 shrink-0 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar sociedad, AC, provincia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Tab: Ofrecedoras ─────────────────────────────────────────────── */}
        {activeTab === "ofrecedoras" && (
          <>
            {/* Loading skeleton */}
            {isLoading && (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 bg-white/[0.03] rounded-lg animate-pulse" />
                ))}
              </div>
            )}

            {/* Tabla de datos */}
            {!isLoading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {COLUMNS.map((col) => (
                        <th
                          key={col.label}
                          onClick={() => col.key && handleSort(col.key)}
                          className={cn(
                            "px-3 py-3 text-left font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-[10px] select-none",
                            col.key && "cursor-pointer hover:text-foreground transition-colors"
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {col.key && (
                              <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.length === 0 ? (
                      <tr>
                        <td
                          colSpan={COLUMNS.length}
                          className="px-4 py-16 text-center text-muted-foreground text-sm"
                        >
                          <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          {search ? "No hay resultados para la búsqueda." : "Sin sociedades ofrecedoras registradas."}
                        </td>
                      </tr>
                    ) : (
                      paginated.map((o, i) => (
                        <tr
                          key={`${o.cuit_vend}-${i}`}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          {/* KT */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-foreground font-semibold">
                            {o.kt && parseFloat(o.kt) > 0
                              ? Number(o.kt).toLocaleString("es-AR")
                              : <span className="text-muted-foreground/40">-</span>}
                          </td>
                          {/* KV */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-foreground font-semibold">
                            {o.kv && parseFloat(o.kv) > 0
                              ? Number(o.kv).toLocaleString("es-AR")
                              : <span className="text-muted-foreground/40">-</span>}
                          </td>
                          {/* Sociedad */}
                          <td className="px-3 py-2.5 max-w-[200px]">
                            <span className="font-semibold text-foreground truncate block" title={o.soc_vend}>
                              {o.soc_vend || <span className="text-muted-foreground/40">-</span>}
                            </span>
                            {o.cuit_vend && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {o.cuit_vend}
                              </span>
                            )}
                          </td>
                          {/* Decisión */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <DecisionBadge decision={o.decision} />
                          </td>
                          {/* AC */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                            {o.ac_vend || <span className="text-muted-foreground/40">-</span>}
                          </td>
                          {/* REP */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                            {o.repre_vend || <span className="text-muted-foreground/40">-</span>}
                          </td>
                          {/* Provincia */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">
                            {o.prov_sv || <span className="text-muted-foreground/40">-</span>}
                          </td>
                          {/* Partido */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">
                            {o.part_sv || <span className="text-muted-foreground/40">-</span>}
                          </td>
                          {/* Segmento */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <SegmentoBadge segmento={o.segmento_cliente} />
                          </td>
                          {/* Q Ofrecimientos */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold font-mono text-[11px]">
                              {parseFloat(o.Q_OFREC) > 0
                                ? Number(o.Q_OFREC).toLocaleString("es-AR")
                                : "0"}
                            </span>
                          </td>
                          {/* Q Ventas */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold font-mono text-[11px]">
                              {parseFloat(o.Q_VENTAS) > 0
                                ? Number(o.Q_VENTAS).toLocaleString("es-AR")
                                : "0"}
                            </span>
                          </td>
                          {/* Responsable */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                            {o.responsable || <span className="text-muted-foreground/40">-</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {!isLoading && !error && sorted.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
                <p className="text-xs text-muted-foreground">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de{" "}
                  <span className="font-semibold text-foreground">{sorted.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p =
                      totalPages <= 5
                        ? i + 1
                        : page <= 3
                        ? i + 1
                        : page >= totalPages - 2
                        ? totalPages - 4 + i
                        : page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "w-7 h-7 rounded-lg text-xs font-semibold transition-colors",
                          page === p
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Gestionadas (placeholder) ──────────────────────────────── */}
        {activeTab === "gestionadas" && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <BarChart2 className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">Próximamente</p>
            <p className="text-xs opacity-60">El listado de sociedades gestionadas estará disponible en la próxima iteración.</p>
          </div>
        )}
      </div>
    </div>
  );
}
