"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  UserX,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  Beef,
  AlertCircle,
  X,
  MapPin,
  User,
  Tag,
  BarChart2,
  ShoppingCart,
  Clock,
  Hash,
  CheckCircle2,
  XCircle,
  Bell,
  ExternalLink,
  CheckSquare,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Ofertante = {
  Kt: string;
  Kv: string;
  sociedad: string;
  usuario: string;
  AC: string;
  REP: string;
  NOSIS: string;
  facturacion: string;
  q_ofertas: string;
  q_compras: string;
  provincia: string;
  partido: string;
  ultima_oferta: string;
  cuit: string;
  [key: string]: string;
};

type Oferta = {
  fecha: string;
  id_lote: string;
  estado_tropa: string;
  tipo: string;
  operador: string;
  cantidad: string;
  peso: string;
  precio_of: string;
  precio_pub: string;
  cat_abrev: string;
  raza_pub: string;
  [key: string]: string;
};

const PAGE_SIZE = 15;

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  accent: "blue" | "indigo" | "rose";
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
    rose: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      icon: "text-rose-400",
      value: "text-rose-400",
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

// â”€â”€â”€ Gestionado Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type Responsable = { nombre: string; mail: string };

function GestionadoModal({
  cuit,
  onClose,
  onSuccess,
}: {
  cuit: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loadingResp, setLoadingResp] = useState(true);
  const [selectedMail, setSelectedMail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/ofertantes/responsables")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setResponsables(d.responsables || []);
        if ((d.responsables ?? []).length > 0) setSelectedMail(d.responsables[0].mail);
      })
      .catch((e) => setSubmitError(e.message))
      .finally(() => setLoadingResp(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedMail || !motivo.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/ofertantes/informados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuit, responsable: selectedMail, motivo }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al guardar");
      setSubmitted(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md bg-[#161b27] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#1a1f2e]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-500/15 border border-violet-500/25">
              <CheckSquare className="w-4 h-4 text-violet-400" />
            </div>
            <h3 className="text-base font-bold text-white">Marcar como Gestionado</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300">Â¡Registrado correctamente!</p>
            </div>
          ) : (
            <>
              {/* Responsable */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Responsable
                </label>
                {loadingResp ? (
                  <div className="flex items-center gap-2 h-10 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando...
                  </div>
                ) : (
                  <select
                    value={selectedMail}
                    onChange={(e) => setSelectedMail(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  >
                    {responsables.length === 0 && (
                      <option value="">Sin responsables disponibles</option>
                    )}
                    {responsables.map((r, i) => (
                      <option key={i} value={r.mail}>
                        {r.nombre} â€” {r.mail}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Motivo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Motivo
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="DescribÃ­ brevemente el motivo de la gestiÃ³n..."
                  rows={3}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
                />
              </div>

              {/* Error */}
              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {submitError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10 bg-[#1a1f2e]">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedMail || !motivo.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold text-white"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><Send className="w-4 h-4" /> Confirmar</>  
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Admin Reminder Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminReminderModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onConfirm}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-[#161b27] border border-amber-500/30 rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 shrink-0">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-white">Recordatorio</h3>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          No te olvides de asignar la sociedad en el{" "}
          <a
            href="https://admin.decampoacampo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
          >
            ADMIN
            <ExternalLink className="w-3 h-3" />
          </a>
          .
        </p>

        <button
          onClick={onConfirm}
          className="mt-1 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 transition-colors text-sm font-semibold text-black"
        >
          Entendido, continuar
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ CRM Status Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CrmStatusBanner({
  crmStatus,
  crmData,
  onAsignar,
  onCrearTarea,
}: {
  crmStatus: "loading" | "found" | "not_found" | "error";
  crmData: { acEmail?: string; leadId?: string } | null;
  onAsignar: () => void;
  onCrearTarea: () => void;
}) {
  if (crmStatus === "loading") {
    return (
      <div className="mx-6 mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 animate-pulse">
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
        <span className="text-sm text-slate-400">Verificando en CRM...</span>
      </div>
    );
  }

  if (crmStatus === "found") {
    return (
      <div className="mx-6 mt-4 flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-300">Esta sociedad ya estÃ¡ en el CRM</p>
          {crmData?.acEmail && (
            <p className="text-xs text-emerald-400/70 mt-0.5 truncate">
              AC asignado: <span className="font-medium text-emerald-300">{crmData.acEmail}</span>
            </p>
          )}
        </div>
        <button
          onClick={onCrearTarea}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-xs font-bold text-white uppercase tracking-wider"
        >
          Crear Tarea
        </button>
      </div>
    );
  }

  if (crmStatus === "not_found") {
    return (
      <div className="mx-6 mt-4 flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
        <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-300">Esta sociedad no estÃ¡ en el CRM</p>
          <p className="text-xs text-amber-400/70 mt-0.5">AÃºn no tiene un comercial asignado en el sistema.</p>
        </div>
        <button
          onClick={onAsignar}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors text-xs font-bold text-black uppercase tracking-wider"
        >
          Asignar en CRM
        </button>
      </div>
    );
  }

  // error â€” sin acciÃ³n
  return (
    <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
      <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
      <span className="text-xs text-slate-500">No se pudo verificar el estado en el CRM.</span>
    </div>
  );
}

// â”€â”€â”€ Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OfertanteModal({
  ofertante,
  onClose,
}: {
  ofertante: Ofertante;
  onClose: () => void;
}) {
  const router = useRouter();
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(true);
  const [errorOfertas, setErrorOfertas] = useState<string | null>(null);

  // CRM check state
  const [crmStatus, setCrmStatus] = useState<"loading" | "found" | "not_found" | "error">("loading");
  const [crmData, setCrmData] = useState<{ acEmail?: string; leadId?: string } | null>(null);
  // "asignar" = viene de not_found (sin AC), "tarea" = viene de found (con AC)
  const [adminReminderMode, setAdminReminderMode] = useState<"asignar" | "tarea" | null>(null);
  const [showGestionado, setShowGestionado] = useState(false);

  const sinAC =
    !ofertante.AC ||
    ofertante.AC.trim() === "" ||
    ofertante.AC.trim().toUpperCase() === "SIN ASIGNAR";

  // Fetch ofertas + CRM check en paralelo
  useEffect(() => {
    if (!ofertante.cuit) {
      setLoadingOfertas(false);
      setErrorOfertas("Esta sociedad no tiene CUIT registrado.");
      setCrmStatus("error");
      return;
    }

    // Ofertas
    fetch(`/api/ofertantes/ofertas?cuit=${encodeURIComponent(ofertante.cuit)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setOfertas(d.ofertas || []);
      })
      .catch((e) => setErrorOfertas(e.message))
      .finally(() => setLoadingOfertas(false));

    // CRM check (paralelo, no bloquea las ofertas)
    fetch(`/api/ofertantes/crm-check?cuit=${encodeURIComponent(ofertante.cuit)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setCrmStatus("error"); return; }
        setCrmStatus(d.found ? "found" : "not_found");
        if (d.found) setCrmData(d.lead || null);
      })
      .catch(() => setCrmStatus("error"));
  }, [ofertante.cuit]);

  // Navega a Crear Lead sin AC (sociedad no estÃ¡ en CRM) â€” luego del recordatorio
  const handleAsignarConfirm = useCallback(() => {
    setAdminReminderMode(null);
    router.push(`/crear-lead?cuit=${encodeURIComponent(ofertante.cuit ?? "")}`);
    onClose();
  }, [router, ofertante.cuit, onClose]);

  // Navega a Crear Lead con CUIT + AC pre-completados (sociedad ya estÃ¡ en CRM)
  const handleCrearTareaConfirm = useCallback(() => {
    setAdminReminderMode(null);
    const params = new URLSearchParams();
    if (ofertante.cuit) params.set("cuit", ofertante.cuit);
    if (crmData?.acEmail) params.set("ac", crmData.acEmail);
    router.push(`/crear-lead?${params.toString()}`);
    onClose();
  }, [router, ofertante.cuit, crmData, onClose]);

  // Close on backdrop click / Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const nosisVal = parseFloat(ofertante.NOSIS);
  const nosisColor = isNaN(nosisVal)
    ? "bg-secondary text-muted-foreground"
    : nosisVal < 300
    ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
    : nosisVal <= 500
    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";

  const factVal = parseFloat(ofertante.facturacion);
  const factFormatted = !isNaN(factVal)
    ? `$${(factVal / 1000).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
    : "â€”";

  const OFERTA_COLS = [
    { label: "Fecha Oferta", key: "fecha" },
    { label: "ID Lote", key: "id_lote" },
    { label: "Estado", key: "estado_tropa" },
    { label: "CategorÃ­a", key: "cat_abrev" },
    { label: "Raza", key: "raza_pub" },
    { label: "Tipo", key: "tipo" },
    { label: "OP", key: "operador" },
    { label: "Cabezas", key: "cantidad" },
    { label: "Peso", key: "peso" },
    { label: "Precio Oferta", key: "precio_of" },
    { label: "Precio PublicaciÃ³n", key: "precio_pub" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0d1117] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/10 bg-[#161b27] shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight truncate uppercase">
              {ofertante.sociedad || "Sociedad sin nombre"}
            </h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {ofertante.cuit && (
                <span className="text-xs text-slate-400 font-mono">
                  CUIT: {ofertante.cuit}
                </span>
              )}
              {ofertante.cuit && ofertante.usuario && (
                <span className="text-slate-600 text-xs">Â·</span>
              )}
              {ofertante.usuario && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {ofertante.usuario}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CRM Status Banner */}
        <CrmStatusBanner
          crmStatus={crmStatus}
          crmData={crmData}
          onAsignar={() => setAdminReminderMode("asignar")}
          onCrearTarea={handleCrearTareaConfirm}
        />

        {/* Admin Reminder Modal */}
        {adminReminderMode && (
          <AdminReminderModal
            onConfirm={
              adminReminderMode === "tarea" ? handleCrearTareaConfirm : handleAsignarConfirm
            }
          />
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 bg-[#0d1117]">

          {/* 4 Metric Cards */}
          <div className="px-6 pt-5 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3">

            {/* KT */}
            <div className="bg-[#161b27] border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">KT</p>
              <p className="text-3xl font-extrabold text-white leading-none">
                {ofertante.Kt ? Number(ofertante.Kt).toLocaleString("es-AR") : "â€”"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">cabezas</p>
            </div>

            {/* KV */}
            <div className="bg-[#161b27] border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">KV</p>
              <p className="text-3xl font-extrabold text-white leading-none">
                {ofertante.Kv ? Number(ofertante.Kv).toLocaleString("es-AR") : "â€”"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">vacas</p>
            </div>

            {/* NOSIS */}
            <div className="bg-[#161b27] border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">NOSIS</p>
              {!ofertante.NOSIS || isNaN(nosisVal) ? (
                <p className="text-3xl font-extrabold text-slate-600 leading-none">N/A</p>
              ) : (
                <>
                  <p className={cn("text-3xl font-extrabold leading-none",
                    nosisVal < 300 ? "text-rose-400" :
                    nosisVal <= 500 ? "text-amber-400" :
                    "text-emerald-400"
                  )}>
                    {Math.round(nosisVal).toLocaleString("es-AR")}
                  </p>
                  <div className="mt-1 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all",
                        nosisVal < 300 ? "bg-rose-500" :
                        nosisVal <= 500 ? "bg-amber-500" :
                        "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, Math.round(nosisVal / 10))}%` }}
                    />
                  </div>
                </>
              )}
              <p className="text-[10px] text-slate-500">score / 1000</p>
            </div>

            {/* FacturaciÃ³n */}
            <div className="bg-[#161b27] border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">FacturaciÃ³n</p>
              <p className="text-3xl font-extrabold text-white leading-none">
                {factFormatted}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">estimada</p>
            </div>
          </div>

          {/* Pills row */}
          <div className="px-6 pb-4 flex flex-wrap gap-2">
            {/* Provincia + Partido */}
            {(ofertante.provincia || ofertante.partido) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                {[ofertante.provincia, ofertante.partido].filter(Boolean).join(", ")}
              </span>
            )}
            {/* REP */}
            {ofertante.REP && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-slate-500 mr-0.5">REP:</span>{ofertante.REP}
              </span>
            )}
            {/* Ãšltima Oferta */}
            {ofertante.ultima_oferta && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                Ãšltima oferta: <span className="font-medium ml-0.5">{ofertante.ultima_oferta}</span>
              </span>
            )}
            {/* Q Ofertas */}
            {ofertante.q_ofertas && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                <ClipboardList className="w-3 h-3 shrink-0" />
                {ofertante.q_ofertas} oferta{Number(ofertante.q_ofertas) !== 1 ? "s" : ""}
              </span>
            )}
            {/* Q Compras */}
            {ofertante.q_compras && Number(ofertante.q_compras) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <ShoppingCart className="w-3 h-3 shrink-0" />
                {ofertante.q_compras} compra{Number(ofertante.q_compras) !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="mx-6 border-t border-white/8" />

          {/* Ofertas Table */}
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-400" />
              Historial de Ofertas
              {!loadingOfertas && (
                <span className="ml-1 text-xs text-slate-400 font-normal">
                  ({ofertas.length} registros)
                </span>
              )}
            </h3>

            {loadingOfertas && (
              <div className="flex items-center gap-2 py-8 justify-center text-slate-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                Cargando ofertas...
              </div>
            )}

            {!loadingOfertas && errorOfertas && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorOfertas}
              </div>
            )}

            {!loadingOfertas && !errorOfertas && ofertas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Sin ofertas registradas para esta sociedad.</p>
              </div>
            )}

            {!loadingOfertas && !errorOfertas && ofertas.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      {OFERTA_COLS.map((c) => (
                        <th
                          key={c.key}
                          className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap text-[10px]"
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ofertas.map((oferta, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                          {oferta.fecha || "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-primary font-semibold">
                          {oferta.id_lote || "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <EstadoBadge estado={oferta.estado_tropa} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                          {oferta.cat_abrev || "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                          {oferta.raza_pub || "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                          {oferta.tipo || "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                          {oferta.operador || "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-center font-mono text-white font-semibold">
                          {oferta.cantidad || "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-center font-mono text-slate-300">
                          {oferta.peso || "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono text-emerald-300 font-semibold">
                          {oferta.precio_of
                            ? `$${parseFloat(oferta.precio_of).toLocaleString("es-AR")}`
                            : "â€”"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono text-slate-400">
                          {oferta.precio_pub
                            ? `$${parseFloat(oferta.precio_pub).toLocaleString("es-AR")}`
                            : "â€”"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer: Gestionado */}
          <div className="px-6 py-4 border-t border-white/10 bg-[#161b27] flex justify-end shrink-0">
            <button
              onClick={() => setShowGestionado(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 hover:border-violet-500/50 transition-all text-sm font-semibold text-violet-300"
            >
              <CheckSquare className="w-4 h-4" />
              Gestionado
            </button>
          </div>
        </div>
      </div>

      {/* Gestionado Modal */}
      {showGestionado && ofertante.cuit && (
        <GestionadoModal
          cuit={ofertante.cuit}
          onClose={() => setShowGestionado(false)}
          onSuccess={() => setShowGestionado(false)}
        />
      )}
    </div>
  );
}

// â”€â”€â”€ Info Tile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function InfoTile({
  icon: Icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "primary" | "emerald";
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold truncate",
          mono && "font-mono",
          highlight === "primary" && "text-primary",
          highlight === "emerald" && "text-emerald-300",
          !highlight && "text-white"
        )}
      >
        {value}
      </p>
    </div>
  );
}

// â”€â”€â”€ Estado Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EstadoBadge({ estado }: { estado: string }) {
  if (!estado) return <span className="text-muted-foreground/40">â€”</span>;
  const e = estado.trim().toUpperCase();
  const cls =
    e.includes("VENDIDO") || e.includes("COMPRADO")
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : e.includes("RETIR") || e.includes("CANCEL")
      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
      : e.includes("PENDIENTE") || e.includes("OFERTADO")
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-secondary text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider whitespace-nowrap",
        cls
      )}
    >
      {estado}
    </span>
  );
}

// â”€â”€â”€ Sort types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type SortDir = "asc" | "desc" | null;

const COLUMNS: { label: string; key: keyof Ofertante | null; numeric?: boolean }[] = [
  { label: "KT",            key: "Kt",          numeric: true },
  { label: "KV",            key: "Kv",          numeric: true },
  { label: "SOCIEDAD",      key: "sociedad" },
  { label: "USUARIO",       key: "usuario" },
  { label: "AC",            key: "AC" },
  { label: "REP",           key: "REP" },
  { label: "NOSIS",         key: "NOSIS",        numeric: true },
  { label: "FACT",          key: "facturacion",  numeric: true },
  { label: "Q OFERTAS",     key: "q_ofertas",    numeric: true },
  { label: "Q COMPRAS",     key: "q_compras",    numeric: true },
  { label: "PROVINCIA",     key: "provincia" },
  { label: "PARTIDO",       key: "partido" },
  { label: "ÃšLTIMA OFERTA", key: "ultima_oferta" },
];

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function GNSOfertantesPage() {
  const [ofertantes, setOfertantes] = useState<Ofertante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Ofertante | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selectedOfertante, setSelectedOfertante] = useState<Ofertante | null>(null);

  const handleSort = (key: keyof Ofertante | null) => {
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

  const handleCloseModal = useCallback(() => setSelectedOfertante(null), []);

  useEffect(() => {
    fetch("/api/ofertantes")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setOfertantes(d.ofertantes || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const total = ofertantes.length;
    const totalOfertas = ofertantes.reduce(
      (acc, o) => acc + (parseInt(o.q_ofertas, 10) || 0),
      0
    );
    const sinAC = ofertantes.filter(
      (o) => !o.AC || o.AC.trim() === "" || o.AC.trim().toUpperCase() === "SIN ASIGNAR"
    ).length;
    return { total, totalOfertas, sinAC };
  }, [ofertantes]);

  // Filtro de bÃºsqueda
  const filtered = useMemo(() => {
    if (!search.trim()) return ofertantes;
    const q = search.toLowerCase();
    return ofertantes.filter(
      (o) =>
        o.sociedad?.toLowerCase().includes(q) ||
        o.usuario?.toLowerCase().includes(q) ||
        o.AC?.toLowerCase().includes(q) ||
        o.REP?.toLowerCase().includes(q) ||
        o.provincia?.toLowerCase().includes(q) ||
        o.partido?.toLowerCase().includes(q) ||
        o.Kt?.toLowerCase().includes(q) ||
        o.Kv?.toLowerCase().includes(q)
    );
  }, [ofertantes, search]);

  // Ordenamiento
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

  // Reset page on search
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Beef className="w-6 h-6 text-primary" />
            GNS Ofertantes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo y gestiÃ³n de sociedades ofertantes sin SAC.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          icon={Building2}
          label="Cantidad de Sociedades"
          value={isLoading ? "â€”" : kpis.total}
          sub="Total de ofertantes registrados"
          accent="blue"
          isLoading={isLoading}
        />
        <KPICard
          icon={ClipboardList}
          label="Cantidad de Ofertas"
          value={isLoading ? "â€”" : kpis.totalOfertas}
          sub="Suma total de ofertas realizadas"
          accent="indigo"
          isLoading={isLoading}
        />
        <KPICard
          icon={UserX}
          label="Sin Comercial Asignado"
          value={isLoading ? "â€”" : kpis.sinAC}
          sub="Sociedades sin AC activo"
          accent="rose"
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
        {/* Header tabla */}
        <div className="px-5 py-4 border-b border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground text-sm">
              Listado de Sociedades Ofertantes
            </h2>
            {!isLoading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Mostrando {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}â€“
                {Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} resultados
                <span className="ml-2 text-muted-foreground/50">Â· HacÃ© clic en una fila para ver el detalle</span>
              </p>
            )}
          </div>
          {/* Buscador */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar sociedad, AC, provincia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm">Cargando ofertantes y verificando CRM...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">Sin resultados</p>
            <p className="text-sm mt-1">
              {search ? "ProbÃ¡ con otro tÃ©rmino de bÃºsqueda." : "No hay datos disponibles."}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  {COLUMNS.map((col) => {
                    const isActive = sortKey === col.key;
                    const SortIcon = isActive
                      ? sortDir === "asc"
                        ? ChevronUp
                        : ChevronDown
                      : ChevronsUpDown;
                    return (
                      <th
                        key={col.label}
                        className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                      >
                        <button
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            "flex items-center gap-1 group/sort transition-colors hover:text-foreground",
                            isActive && "text-primary"
                          )}
                        >
                          {col.label}
                          <SortIcon
                            className={cn(
                              "w-3 h-3 transition-opacity",
                              isActive ? "opacity-100" : "opacity-30 group-hover/sort:opacity-70"
                            )}
                          />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginated.map((o, idx) => {
                  const sinAC =
                    !o.AC || o.AC.trim() === "" || o.AC.trim().toUpperCase() === "SIN ASIGNAR";
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedOfertante(o)}
                      className="hover:bg-secondary/40 transition-colors group cursor-pointer"
                    >
                      {/* KT */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {o.Kt ? (
                          <span className="text-xs font-mono font-semibold text-primary">
                            {o.Kt}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">â€”</span>
                        )}
                      </td>
                      {/* KV */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {o.Kv ? (
                          <span className="text-xs font-mono text-foreground/70">
                            {o.Kv}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">â€”</span>
                        )}
                      </td>
                      {/* Sociedad */}
                      <td className="px-3 py-3 min-w-[160px]">
                        <span className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                          {o.sociedad || <span className="text-muted-foreground/40">â€”</span>}
                        </span>
                      </td>
                      {/* Usuario */}
                      <td className="px-3 py-3 min-w-[140px]">
                        <span className="text-xs text-muted-foreground">
                          {o.usuario || <span className="opacity-40">â€”</span>}
                        </span>
                      </td>
                      {/* AC */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {sinAC ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider whitespace-nowrap">
                            Sin Asignar
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="text-xs text-foreground">{o.AC}</span>
                          </span>
                        )}
                      </td>
                      {/* REP */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-foreground/80">
                          {o.REP || <span className="text-muted-foreground/40">â€”</span>}
                        </span>
                      </td>
                      {/* NOSIS */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {(() => {
                          const n = parseFloat(o.NOSIS);
                          if (!o.NOSIS || isNaN(n)) return <span className="text-muted-foreground/40 text-xs">N/A</span>;
                          const color =
                            n < 300
                              ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                              : n <= 500
                              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
                          return (
                            <span className={cn("inline-block text-[11px] font-semibold px-2 py-0.5 rounded border font-mono", color)}>
                              {o.NOSIS}
                            </span>
                          );
                        })()}
                      </td>
                      {/* FACT */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {(() => {
                          const n = parseFloat(o.facturacion);
                          if (!o.facturacion || isNaN(n)) return <span className="text-muted-foreground/40 text-xs">â€”</span>;
                          const millions = (n / 1000).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                          return <span className="text-xs text-foreground/70 font-mono">${millions}M</span>;
                        })()}
                      </td>
                      {/* Q Ofertas */}
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-primary">
                          {o.q_ofertas || "0"}
                        </span>
                      </td>
                      {/* Q Compras */}
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-emerald-400">
                          {o.q_compras || "0"}
                        </span>
                      </td>
                      {/* Provincia */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-foreground/80">
                          {o.provincia || <span className="text-muted-foreground/40">â€”</span>}
                        </span>
                      </td>
                      {/* Partido */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground">
                          {o.partido || <span className="opacity-40">â€”</span>}
                        </span>
                      </td>
                      {/* Ãšltima Oferta */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground font-medium">
                          {o.ultima_oferta || <span className="opacity-40">â€”</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PaginaciÃ³n */}
        {!isLoading && !error && sorted.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-secondary/20">
            <p className="text-xs text-muted-foreground">
              PÃ¡gina {page} de {totalPages} Â· {sorted.length} filas
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) {
                  p = i + 1;
                } else if (page <= 3) {
                  p = i + 1;
                } else if (page >= totalPages - 2) {
                  p = totalPages - 4 + i;
                } else {
                  p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all",
                      p === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedOfertante && (
        <OfertanteModal ofertante={selectedOfertante} onClose={handleCloseModal} />
      )}
    </div>
  );
}


