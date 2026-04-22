"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { useFilter } from "@/contexts/FilterContext";
import { useData } from "@/lib/useData";
import { cn, normalizeId } from "@/lib/utils";

export default function Navbar() {
  const router = useRouter();
  const { selectedAC, setSelectedAC, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, selectedFuente, setSelectedFuente, clearFilters } = useFilter();
  const { data } = useData();

  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showACDropdown, setShowACDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showFuenteDropdown, setShowFuenteDropdown] = useState(false);
  const [acSearch, setAcSearch] = useState("");
  
  const searchRef = useRef<HTMLDivElement>(null);
  const acRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const fuenteRef = useRef<HTMLDivElement>(null);

  const YEARS = ["2026", "2025", "2024"];
  const MONTHS = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  // Derivamos listas únicas de Sociedades y de ACs para el Autocomplete
  const ASOCIADOS_COMERCIALES = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.sociedades.map((s) => s.asociado_comercial).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Fuentes únicas desde los leads (+ S/D para las sociedades sin lead)
  const FUENTES = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.leads.forEach((l) => {
      if (l.Fuente && l.Fuente.trim()) set.add(l.Fuente.trim());
    });
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    // S/D siempre al final
    return [...arr, "S/D"];
  }, [data]);

  const filteredACs = useMemo(() => {
    return ASOCIADOS_COMERCIALES.filter((ac) =>
      ac.toLowerCase().includes(acSearch.toLowerCase())
    );
  }, [ASOCIADOS_COMERCIALES, acSearch]);

  const societyResults = data
    ? data.sociedades
        .filter((s) => query.length > 1 && s.razon_social.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
    : [];

  const acResults = ASOCIADOS_COMERCIALES.filter(
    (ac) => query.length > 1 && ac.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const hasResults = societyResults.length > 0 || acResults.length > 0;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (acRef.current && !acRef.current.contains(e.target as Node)) {
        setShowACDropdown(false);
        setAcSearch("");
      }
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setShowYearDropdown(false);
      }
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) {
        setShowMonthDropdown(false);
      }
      if (fuenteRef.current && !fuenteRef.current.contains(e.target as Node)) {
        setShowFuenteDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md">
      <div ref={searchRef} className="relative flex-1 max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Buscar sociedad o comercial…"
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => query.length > 1 && setShowResults(true)}
          disabled={!data}
          className={cn(
            "w-full pl-9 pr-4 py-2 rounded-lg text-sm bg-secondary border border-border",
            "text-foreground placeholder:text-muted-foreground disabled:opacity-50",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {showResults && hasResults && (
          <div className="absolute top-full mt-2 w-full rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-slide-up z-50">
            {acResults.length > 0 && (
              <div>
                <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Comerciales
                </p>
                {acResults.map((ac) => (
                  <button
                    key={ac}
                    onClick={() => {
                      setSelectedAC(ac);
                      setQuery("");
                      setShowResults(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {ac.charAt(0)}
                    </span>
                    {ac}
                  </button>
                ))}
              </div>
            )}
            {societyResults.length > 0 && (
              <div className={acResults.length > 0 ? "border-t border-border" : ""}>
                <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Sociedades
                </p>
                {societyResults.map((s) => (
                  <button
                    key={s.cuit}
                    onClick={() => {
                      router.push(`/asignaciones/cliente/${s.cuit}`);
                      setQuery("");
                      setShowResults(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0">
                      {s.cuit}
                    </span>
                    <span className="flex-1 truncate">{s.razon_social}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{s.UN}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div ref={acRef} className="relative">
        <button
          onClick={() => setShowACDropdown(!showACDropdown)}
          disabled={!data}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all disabled:opacity-50",
            selectedAC
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span className="max-w-[140px] truncate">{selectedAC ?? "Todos los AC"}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0", showACDropdown && "rotate-180")} />
        </button>

        {showACDropdown && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-slide-up z-50">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filtrar comercial..."
                  value={acSearch}
                  onChange={(e) => setAcSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedAC(null);
                  setShowACDropdown(false);
                  setAcSearch("");
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                  !selectedAC ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                Todos los comerciales
              </button>
              <div className="border-t border-border" />
              {filteredACs.map((ac) => (
                <button
                  key={ac}
                  onClick={() => {
                    setSelectedAC(ac);
                    setShowACDropdown(false);
                    setAcSearch("");
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors",
                    selectedAC === ac ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {ac}
                </button>
              ))}
              {filteredACs.length === 0 && (
                <p className="px-4 py-3 text-xs text-muted-foreground text-center">
                  No se encontraron resultados
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div ref={yearRef} className="relative">
        <button
          onClick={() => setShowYearDropdown(!showYearDropdown)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
            showYearDropdown ? "border-primary text-primary bg-primary/10" : "border-border bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{selectedYear}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0", showYearDropdown && "rotate-180")} />
        </button>

        {showYearDropdown && (
          <div className="absolute right-0 top-full mt-2 w-32 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-slide-up z-50">
            {YEARS.map((year) => (
              <button
                key={year}
                onClick={() => {
                  setSelectedYear(year);
                  setShowYearDropdown(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                  selectedYear === year ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={monthRef} className="relative">
        <button
          onClick={() => setShowMonthDropdown(!showMonthDropdown)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all min-w-[140px] justify-between",
            selectedMonth ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="truncate">
            {selectedMonth ? MONTHS.find(m => m.value === selectedMonth)?.label : "Todos los meses"}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0", showMonthDropdown && "rotate-180")} />
        </button>

        {showMonthDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-slide-up z-50 max-h-80 overflow-y-auto">
            <button
              onClick={() => {
                setSelectedMonth(null);
                setShowMonthDropdown(false);
              }}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                !selectedMonth ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              Todos los meses
            </button>
            <div className="border-t border-border" />
            {MONTHS.map((m) => (
              <button
                key={m.value}
                onClick={() => {
                  setSelectedMonth(m.value);
                  setShowMonthDropdown(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                  selectedMonth === m.value ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtro Motivo de Asignación */}
      <div ref={fuenteRef} className="relative">
        <button
          onClick={() => setShowFuenteDropdown(!showFuenteDropdown)}
          disabled={!data}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all min-w-[160px] justify-between disabled:opacity-50",
            selectedFuente ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="truncate">{selectedFuente ?? "Todos los motivos"}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0", showFuenteDropdown && "rotate-180")} />
        </button>

        {showFuenteDropdown && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-slide-up z-50 max-h-80 overflow-y-auto">
            <button
              onClick={() => {
                setSelectedFuente(null);
                setShowFuenteDropdown(false);
              }}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                !selectedFuente ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              Todos los motivos
            </button>
            <div className="border-t border-border" />
            {FUENTES.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setSelectedFuente(f);
                  setShowFuenteDropdown(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                  selectedFuente === f ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {(selectedAC || selectedYear !== "2026" || selectedMonth || selectedFuente) && (
        <button
          onClick={() => clearFilters()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
          Limpiar filtro
        </button>
      )}
    </header>
  );
}

