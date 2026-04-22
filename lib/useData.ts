"use client";

import useSWR from "swr";
import { normalizeNumeric } from "./utils";

export interface TransaccionRaw {
  id_sociedad: string;
  cabezas_ofrecidas: number;
  cabezas_ofertadas: number;
  fecha_operacion: string;
  ESTADO: string;
  UN: string;
  cuit?: string;
  // Nuevos campos para el gráfico de evolución (Card 130)
  cuit_vend?: string;
  cuit_comp?: string;
  Cabezas?: number;
  fecha_publicaciones?: string;
  id_lote?: string | number;
  Tipo?: string;
  RS_Vendedora?: string;
  RS_Compradora?: string;
  Estado_Trop?: string;
  Motivo_NC?: string;
  Canal_Venta?: string;
  Canal_compra?: string;
  [key: string]: any;
}

export interface HistorialAsignacionRaw {
  id_sociedad: string;
  fecha_asignacion: string;
  AC: string;
  tipo: "NUEVA" | "REASIGNACION";
  modificado_por?: string;
  cuit?: string;
  razon_social?: string;
}

export interface SociedadRaw {
  id: string;
  razon_social: string;
  asociado_comercial: string; // Cambio solicitado: era comercial_asignado
  UN: string;
  cuit?: string;
  id_ac?: string;
  fecha_creacion?: string;
}

export interface LeadRaw {
  id_sociedad: string;
  id_comercial: string;
  fecha_contacto: string;
  Fuente: string;
  LeadID?: string;
  "CUIT Sociedad"?: string;
}

export interface ComentarioRaw {
  "ID Lead"?: string;
  Fecha?: string;
  [key: string]: any;
}

export interface AppData {
  sociedades: SociedadRaw[];
  transacciones: TransaccionRaw[];
  historial: HistorialAsignacionRaw[];
  leads: LeadRaw[];
  comentarios: ComentarioRaw[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useData() {
  const { data: metabase, error: metaErr, isLoading: metaLoading } = useSWR("/api/asignaciones/metabase", fetcher, { revalidateOnFocus: false });
  const { data: sheets, error: sheetsErr, isLoading: sheetsLoading } = useSWR("/api/asignaciones/sheets", fetcher, { revalidateOnFocus: false });

  const isLoading = metaLoading || sheetsLoading;
  const isError = metaErr || sheetsErr || metabase?.error || sheets?.error;

  const data: AppData | null = metabase && sheets && !metabase.error && !sheets.error ? (() => {
    // Process historial to calculate NUEVA vs REASIGNACION correctly based on chronological order per sociedad
    const rawHistorial: HistorialAsignacionRaw[] = metabase.historialAsignaciones || [];
    
    // Sort array by date ascending
    const sortedHistorial = [...rawHistorial].sort((a, b) => {
      const dateA = a.fecha_asignacion ? new Date(a.fecha_asignacion.includes("T") ? a.fecha_asignacion : a.fecha_asignacion + "T00:00:00").getTime() : 0;
      const dateB = b.fecha_asignacion ? new Date(b.fecha_asignacion.includes("T") ? b.fecha_asignacion : b.fecha_asignacion + "T00:00:00").getTime() : 0;
      return dateA - dateB;
    });

    const seenSociedades = new Set<string>();
    const processedHistorial = sortedHistorial.map(h => {
      const realId = h.id_sociedad || (h as any).id;
      const isReasignacion = seenSociedades.has(realId);
      if (realId) {
        seenSociedades.add(realId);
      }
      return {
        ...h,
        id_sociedad: realId,
        tipo: (isReasignacion ? "REASIGNACION" : "NUEVA") as "REASIGNACION" | "NUEVA"
      };
    });

    // Normalize maestroSociedades to ensure lowercase keys (id, cuit, asociado_comercial, razon_social, UN)
    const rawSociedades: any[] = metabase.maestroSociedades || [];
    const normalizedSociedades: SociedadRaw[] = rawSociedades.map((s) => ({
      id: String(s.id || s.ID || s.id_sociedad || s.ID_SOCIEDAD || ""),
      razon_social: s.razon_social || s.RAZON_SOCIAL || s.nombre || "",
      asociado_comercial: s.asociado_comercial || s.ASOCIADO_COMERCIAL || s.comercial_asignado || s.comercial || "",
      UN: s.UN || s.un || s.UnidadNegocio || "",
      cuit: s.cuit || s.CUIT || s.cuit_sociedad || "",
      id_ac: s.id_ac || s.ID_AC || s.id_comercial || "",
      fecha_creacion: s.fecha_creacion || s.FECHA_CREACION || "",
    }));

    // HYBRID MAESTRO: Merge normalizedSociedades with those found in historial/transacciones
    // Key by normalized CUIT to ensure uniqueness and robust joins
    const maestroMap = new Map<string, SociedadRaw>();

    // 1. Populate with official maestro (Highest priority)
    normalizedSociedades.forEach(s => {
      const normCuit = normalizeNumeric(s.cuit);
      if (normCuit) {
        maestroMap.set(normCuit, s);
      }
    });

    // 2. Supplement with Historial (Harvesting missing societies)
    processedHistorial.forEach(h => {
      const normCuit = normalizeNumeric(h.cuit);
      if (normCuit && !maestroMap.has(normCuit)) {
        maestroMap.set(normCuit, {
          id: h.id_sociedad || "",
          razon_social: h.razon_social || h.id_sociedad || "Sociedad Desconocida",
          asociado_comercial: h.AC || "",
          UN: "S/D",
          cuit: h.cuit,
          id_ac: "",
          fecha_creacion: h.fecha_asignacion
        });
      }
    });

    // 3. Supplement with Transacciones (Harvesting missing societies)
    const rawTransacciones: TransaccionRaw[] = metabase.transacciones || [];
    rawTransacciones.forEach(t => {
      const normCuit = normalizeNumeric(t.cuit);
      if (normCuit && !maestroMap.has(normCuit)) {
        maestroMap.set(normCuit, {
          id: t.id_sociedad || "",
          razon_social: t.id_sociedad || "Sociedad Transaccional",
          asociado_comercial: "",
          UN: t.UN || "S/D",
          cuit: t.cuit,
          id_ac: "",
          fecha_creacion: t.fecha_operacion
        });
      }
    });

    return {
      sociedades: Array.from(maestroMap.values()),
      transacciones: rawTransacciones,
      historial: processedHistorial,
      leads: sheets.leads || [],
      comentarios: sheets.comentarios || [],
    };
  })() : null;

  return { data, isLoading, isError, error: metabase?.error || sheets?.error || metaErr || sheetsErr };
}

