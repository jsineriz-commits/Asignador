import { daysBetween, normalizeId, normalizeNumeric } from "./utils";
import type { AppData, SociedadRaw, HistorialAsignacionRaw, LeadRaw, TransaccionRaw, ComentarioRaw } from "./useData";

export interface KPIs {
  coberturaPct: number;
  tiempoPromedioReasignacion: number;
  volumenMesActual: number;
  sinAsignar: number;
}

/**
 * Busca una sociedad en el maestro de forma robusta por ID o por CUIT como fallback.
 */
function findSociedad(data: AppData, id?: string | number, cuit?: string | number): SociedadRaw | undefined {
  const targetId = id !== undefined && id !== null ? normalizeId(id) : null;
  const targetCuit = cuit !== undefined && cuit !== null ? normalizeNumeric(cuit) : null;

  // 1. Intentar por ID (Mapeo directo) - Solo si se proveyó ID
  if (targetId && targetId !== "") {
    const byId = data.sociedades.find((s) => 
      normalizeId(s.id) === targetId || 
      normalizeId((s as any).ID) === targetId ||
      normalizeId((s as any).id_sociedad) === targetId
    );
    if (byId) return byId;
  }

  // 2. Si falla y tenemos CUIT, intentar por CUIT (Join por CUIT)
  if (targetCuit && targetCuit !== "") {
    return data.sociedades.find((s) => 
      normalizeNumeric(s.cuit) === targetCuit ||
      normalizeNumeric((s as any).CUIT) === targetCuit
    );
  }

  return undefined;
}

export function getKPIs(data: AppData, filtroAC?: string): KPIs {
  const dbSociedades: SociedadRaw[] = filtroAC
    ? data.sociedades.filter((s) => normalizeId(s.asociado_comercial) === normalizeId(filtroAC))
    : data.sociedades;

  const conAsignado = dbSociedades.filter((s) => s.asociado_comercial).length;
  // evitamos división por 0
  const coberturaPct = dbSociedades.length > 0 ? Math.round((conAsignado / dbSociedades.length) * 100) : 0;
  const sinAsignar = dbSociedades.length - conAsignado;

  const reasignaciones = data.historial.filter((h) => h.tipo === "REASIGNACION");
  const tiempoPromedioReasignacion =
    reasignaciones.length > 0
      ? Math.round(
          reasignaciones.reduce((acc, r) => {
            const prevAsig = data.historial
              .filter(
                (h) => h.id_sociedad === r.id_sociedad && h.fecha_asignacion < r.fecha_asignacion
              )
              .sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion))[0];
            if (!prevAsig || !r.fecha_asignacion) return acc;
            const safeCurrent = r.fecha_asignacion.includes("T") ? r.fecha_asignacion : r.fecha_asignacion + "T00:00:00";
            return acc + daysBetween(prevAsig.fecha_asignacion, new Date(safeCurrent));
          }, 0) / reasignaciones.length
        )
      : 0;

  const now = new Date();
  const mes = now.getMonth();
  const anio = now.getFullYear();
  const idsSociedades = new Set(dbSociedades.map((s) => s.id));
  const volumenMesActual = data.transacciones
    .filter((t) => {
      if (!t.fecha_operacion) return false;
      const safeDate = t.fecha_operacion.includes("T") ? t.fecha_operacion : t.fecha_operacion + "T00:00:00";
      const d = new Date(safeDate);
      return (
        t.ESTADO === "CONCRETADA" &&
        d.getMonth() === mes &&
        d.getFullYear() === anio &&
        idsSociedades.has(t.id_sociedad)
      );
    })
    .reduce((sum, t) => sum + (Number(t.cabezas_ofertadas) || 0), 0);

  return { coberturaPct, tiempoPromedioReasignacion, volumenMesActual, sinAsignar };
}

export interface DinamicaMes {
  mes: string;
  nuevas: number;
  reasignaciones: number;
}

export function getDinamicaAsignaciones(data: AppData, filtroAC?: string, filtroModificador?: string, filtroFuente?: string): DinamicaMes[] {
  // Pre-build CUIT -> Fuente map for fuente filtering
  const fuenteByCuitDin = new Map<string, string>();
  if (filtroFuente) {
    data.leads.forEach((l) => {
      const cuit = normalizeNumeric(l["CUIT Sociedad"]);
      if (cuit && l.Fuente && !fuenteByCuitDin.has(cuit)) fuenteByCuitDin.set(cuit, l.Fuente);
    });
  }

  const historial = data.historial.filter((h) => {
    if (filtroAC && h.AC !== filtroAC) return false;
    if (filtroModificador && h.modificado_por !== filtroModificador) return false;
    if (filtroFuente) {
      const cuitNorm = normalizeNumeric(h.cuit);
      const fuente = cuitNorm ? (fuenteByCuitDin.get(cuitNorm) ?? "S/D") : "S/D";
      if (fuente !== filtroFuente) return false;
    }
    return true;
  });

  const map: Record<string, DinamicaMes> = {};
  
  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() - 11);
  limitDate.setDate(1);
  limitDate.setHours(0, 0, 0, 0);

  historial.forEach((h) => {
    if (!h.fecha_asignacion) return;
    const safeDate = h.fecha_asignacion.includes("T") ? h.fecha_asignacion : h.fecha_asignacion + "T00:00:00";
    const d = new Date(safeDate);
    
    if (d < limitDate) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { mes: label, nuevas: 0, reasignaciones: 0 };
    if (h.tipo === "NUEVA") map[key].nuevas++;
    else map[key].reasignaciones++;
  });

  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

export interface MotivoDetalle {
  id_sociedad: string;
  razon_social: string;
  cuit: string;
  fecha_asignacion: string;
  motivo: string;
  asignado_por: string;
}

export interface MotivoItem {
  motivo: string;
  cantidad: number;
  color: string;
  detalles: MotivoDetalle[];
}

const MOTIVO_COLORS: Record<string, string> = {
  Referido: "hsl(var(--positive))",
  "Llamada Fría": "hsl(var(--brand))",
  "Reasignación Interna": "hsl(var(--backgroundNotice))",
  "Feria/Evento": "hsl(var(--brandSecondary))", // mapped to secondary brand color
  Web: "hsl(var(--backgroundSelected))",
  "Sin Contacto": "hsl(var(--negative))",
  "S/D": "hsl(var(--contentDisabled))",
};

export function getDistribucionMotivos(data: AppData, filtroAC?: string, filtroYear?: string, filtroMonth?: string, filtroModificador?: string): MotivoItem[] {
  // Pre-calculate the latest assignment date per society
  const relevantHistorial = filtroModificador 
    ? data.historial.filter((h) => h.modificado_por === filtroModificador)
    : data.historial;

  const latestAssignment = new Map<string, Date>();
  relevantHistorial.forEach((h) => {
    if (h.fecha_asignacion) {
      const d = new Date(h.fecha_asignacion.includes("T") ? h.fecha_asignacion : h.fecha_asignacion + "T00:00:00");
      const prev = latestAssignment.get(h.id_sociedad);
      if (!isNaN(d.getTime()) && (!prev || d > prev)) {
        latestAssignment.set(h.id_sociedad, d);
      }
    }
  });

  // 1. Filtrar las sociedades que tienen un AC asignado (y coinciden con el filtro si aplica)
  const sociedadesAsignadas = data.sociedades.filter((s) => {
    if (!s.asociado_comercial) return false;
    if (filtroAC && normalizeId(s.asociado_comercial) !== normalizeId(filtroAC)) return false;
    if (filtroModificador && !latestAssignment.has(s.id)) return false;
    
    
    // Filter by year and month
    if (filtroYear) {
      let d = latestAssignment.get(s.id);
      // Fallback to fecha_creacion if no historial exists
      if (!d && s.fecha_creacion) {
        const fallback = new Date(s.fecha_creacion.includes("T") ? s.fecha_creacion : s.fecha_creacion + "T00:00:00");
        if (!isNaN(fallback.getTime())) d = fallback;
      }
      
      if (!d) return false; // Exclude if we cannot determine when it was assigned
      if (d.getFullYear().toString() !== filtroYear) return false;
      if (filtroMonth && (d.getMonth() + 1).toString() !== filtroMonth) return false;
    }
    
    return true;
  });

  // 2. Crear un mapa de CUIT -> Fuente para búsqueda rápida
  const fuenteByCuit = new Map<string, string>();
  data.leads.forEach((l) => {
    const cuit = normalizeNumeric(l["CUIT Sociedad"]);
    if (cuit && l.Fuente && !fuenteByCuit.has(cuit)) {
      fuenteByCuit.set(cuit, l.Fuente);
    }
  });

  // 3. Contar motivos iterando sobre las sociedades asignadas
  const map: Record<string, { cantidad: number; detalles: MotivoDetalle[] }> = {};
  sociedadesAsignadas.forEach((s) => {
    const normCuit = normalizeNumeric(s.cuit);
    let fuente = "S/D";
    
    if (normCuit && fuenteByCuit.has(normCuit)) {
      fuente = fuenteByCuit.get(normCuit) || "S/D";
    }
    
    if (!map[fuente]) map[fuente] = { cantidad: 0, detalles: [] };
    
    const d = latestAssignment.get(s.id);
    const dateStr = d ? d.toISOString() : (s.fecha_creacion || "");
    const hist = relevantHistorial.find((h) => {
      if (h.id_sociedad !== s.id || !h.fecha_asignacion) return false;
      const hd = new Date(h.fecha_asignacion.includes("T") ? h.fecha_asignacion : h.fecha_asignacion + "T00:00:00");
      return hd.getTime() === d?.getTime();
    });

    map[fuente].cantidad++;
    map[fuente].detalles.push({
      id_sociedad: s.id,
      razon_social: s.razon_social || s.id,
      cuit: normCuit || s.cuit || "",
      fecha_asignacion: dateStr,
      motivo: fuente,
      asignado_por: hist?.modificado_por || "S/D"
    });
  });

  // 4. Formatear y ordenar resultados
  return Object.entries(map)
    .map(([motivo, val]) => ({
      motivo,
      cantidad: val.cantidad,
      color: MOTIVO_COLORS[motivo] ?? "#cbd5e1",
      detalles: val.detalles.sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion))
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export interface SilencioItem {
  id_sociedad: string;
  razon_social: string;
  cuit: string;
  asociado_comercial: string;
  dias_desde_asignacion: number;
  fecha_asignacion: string;
  fuente?: string;
}

export function getSilencioComercial(data: AppData, filtroAC?: string, filtroYear?: string, filtroMonth?: string, filtroModificador?: string, filtroFuente?: string): SilencioItem[] {
  const hoy = new Date();
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 30);
  limitDate.setHours(0, 0, 0, 0);

  // 1. Filtrar el historial para obtener las asignaciones
  const recientes = data.historial.filter((h) => {
    if (!h.fecha_asignacion) return false;
    const safeDate = h.fecha_asignacion.includes("T") ? h.fecha_asignacion : h.fecha_asignacion + "T00:00:00";
    const d = new Date(safeDate);
    if (isNaN(d.getTime())) return false;
    
    // Verificar si está dentro de las fechas seleccionadas
    if (filtroYear) {
      if (d.getFullYear().toString() !== filtroYear) return false;
      if (filtroMonth && (d.getMonth() + 1).toString() !== filtroMonth) return false;
    } else {
      // Si no hay año seleccionado, por defecto últimos 30 días
      if (d < limitDate || d > hoy) return false;
    }

    return (!filtroAC || h.AC === filtroAC) && (!filtroModificador || h.modificado_por === filtroModificador);
  });

  // 2. Quedarnos sólo con la ÚLTIMA asignación por id_sociedad
  const ultimaAsignacionPorSociedad = new Map<string, typeof recientes[0] & { parsedDate: Date }>();
  recientes.forEach((h) => {
    const prev = ultimaAsignacionPorSociedad.get(h.id_sociedad);
    const currDate = new Date(h.fecha_asignacion.includes("T") ? h.fecha_asignacion : h.fecha_asignacion + "T00:00:00");
    if (!prev || currDate > prev.parsedDate) {
      ultimaAsignacionPorSociedad.set(h.id_sociedad, { ...h, parsedDate: currDate });
    }
  });

  // 3. Mapeo rápido de CUIT -> array de LeadIDs (normalizado) y CUIT -> Fuente
  const leadsByCuit = new Map<string, string[]>();
  const fuenteByCuit = new Map<string, string>();
  
  data.leads.forEach(l => {
    const cuit = normalizeNumeric(l["CUIT Sociedad"]);
    if (cuit) {
      if (l.LeadID) {
        const arr = leadsByCuit.get(cuit) || [];
        arr.push(l.LeadID);
        leadsByCuit.set(cuit, arr);
      }
      if (l.Fuente && !fuenteByCuit.has(cuit)) {
        fuenteByCuit.set(cuit, l.Fuente);
      }
    }
  });

  const transaccionesByCuit = new Map<string, Date[]>();
  data.transacciones.forEach(t => {
    const cuitVend = normalizeNumeric(t.cuit_vend || (t as any).CUIT_VEND || t.cuit);
    const cuitComp = normalizeNumeric(t.cuit_comp || (t as any).CUIT_COMP);
    const tDateStr = t.fecha_publicaciones || t.fecha_operacion;
    if (!tDateStr) return;
     
    const d = new Date(tDateStr.includes("T") ? tDateStr : tDateStr + "T00:00:00");
    if (isNaN(d.getTime())) return;

    if (cuitVend) {
      const arr = transaccionesByCuit.get(cuitVend) || [];
      arr.push(d);
      transaccionesByCuit.set(cuitVend, arr);
    }
    if (cuitComp && cuitComp !== cuitVend) {
      const arr2 = transaccionesByCuit.get(cuitComp) || [];
      arr2.push(d);
      transaccionesByCuit.set(cuitComp, arr2);
    }
  });

  // Helper para convertir el string MM/DD/YYYY HH:mm:ss a un timestamp
  const parseComentarioDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const silencioItems: SilencioItem[] = [];

  // 4. Cruzar asignaciones con leads y comentarios
  ultimaAsignacionPorSociedad.forEach((asignacion) => {
    const soc = findSociedad(data, asignacion.id_sociedad, asignacion.cuit);
    const cuitRaw = asignacion.cuit || soc?.cuit || "";
    const cuitNorm = normalizeNumeric(cuitRaw);

    // Filtro por fuente
    if (filtroFuente) {
      const fuenteItem = cuitNorm ? (fuenteByCuit.get(cuitNorm) ?? "S/D") : "S/D";
      if (fuenteItem !== filtroFuente) return;
    }

    let tuvoContacto = false;

    // Normalizar la fecha de asignación a las 00:00:00 para incluir el "mismo día"
    const asigMidnight = new Date(asignacion.parsedDate);
    asigMidnight.setHours(0, 0, 0, 0);
    const asignacionMidnightTime = asigMidnight.getTime();

    if (cuitNorm) {
      const leadIDs = leadsByCuit.get(cuitNorm);
      if (leadIDs && leadIDs.length > 0) {
        tuvoContacto = data.comentarios.some(c => {
          if (c["ID Lead"] && leadIDs.includes(c["ID Lead"])) {
            const cTime = parseComentarioDate(c.Fecha || "");
            // Comentario en el CRM el mismo día o después de ser asignado
            return cTime >= asignacionMidnightTime; 
          }
          return false;
        });
      }
      
      // Si no tuvo contacto por CRM, revisar si tuvo transacciones (ofrecimiento u oferta)
      if (!tuvoContacto) {
         const transDates = transaccionesByCuit.get(cuitNorm);
         if (transDates && transDates.length > 0) {
            tuvoContacto = transDates.some(d => {
               const dMidnight = new Date(d);
               dMidnight.setHours(0, 0, 0, 0);
               return dMidnight.getTime() >= asignacionMidnightTime;
            });
         }
      }
    }

    if (!tuvoContacto) {
      silencioItems.push({
        id_sociedad: asignacion.id_sociedad,
        razon_social: asignacion.razon_social || soc?.razon_social || asignacion.id_sociedad,
        cuit: cuitRaw,
        asociado_comercial: asignacion.AC || soc?.asociado_comercial || "Sin asignar",
        fecha_asignacion: asignacion.fecha_asignacion,
        dias_desde_asignacion: daysBetween(asignacion.fecha_asignacion, hoy),
        fuente: cuitNorm ? fuenteByCuit.get(cuitNorm) : undefined
      });
    }
  });

  return silencioItems.sort((a, b) => b.dias_desde_asignacion - a.dias_desde_asignacion);
}

export interface OnboardingItem {
  id_sociedad: string;
  razon_social: string;
  cuit: string;
  AC: string;
  fecha_asignacion: string;
  tipo: "NUEVA" | "REASIGNACION";
}

export function getOnboardingFeed(data: AppData, filtroAC?: string, filtroYear?: string, filtroMonth?: string, filtroModificador?: string, filtroFuente?: string): OnboardingItem[] {
  const hoy = new Date();
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 30);
  limitDate.setHours(0, 0, 0, 0);

  // Pre-build CUIT -> Fuente map for fuente filtering
  const fuenteByCuitOnb = new Map<string, string>();
  if (filtroFuente) {
    data.leads.forEach((l) => {
      const cuit = normalizeNumeric(l["CUIT Sociedad"]);
      if (cuit && l.Fuente && !fuenteByCuitOnb.has(cuit)) fuenteByCuitOnb.set(cuit, l.Fuente);
    });
  }

  const historial = data.historial.filter((h) => {
    if (filtroAC && h.AC !== filtroAC) return false;
    if (filtroModificador && h.modificado_por !== filtroModificador) return false;
    
    if (!h.fecha_asignacion) return false;
    const safeDate = h.fecha_asignacion.includes("T") 
      ? h.fecha_asignacion 
      : h.fecha_asignacion + "T00:00:00";
    const d = new Date(safeDate);
    if (isNaN(d.getTime())) return false;

    if (filtroYear) {
      if (d.getFullYear().toString() !== filtroYear) return false;
      if (filtroMonth && (d.getMonth() + 1).toString() !== filtroMonth) return false;
    } else {
      if (d < limitDate || d > hoy) return false;
    }

    if (filtroFuente) {
      const cuitNorm = normalizeNumeric(h.cuit);
      const fuente = cuitNorm ? (fuenteByCuitOnb.get(cuitNorm) ?? "S/D") : "S/D";
      if (fuente !== filtroFuente) return false;
    }
    
    return true;
  });

  return historial
    .sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion))
    .map((h) => {
      const soc = findSociedad(data, h.id_sociedad, h.cuit);
      return {
        id_sociedad: h.id_sociedad,
        razon_social: soc?.razon_social ?? h.razon_social ?? h.id_sociedad,
        cuit: normalizeNumeric(h.cuit || soc?.cuit || ""),
        AC: h.AC,
        fecha_asignacion: h.fecha_asignacion,
        tipo: h.tipo,
      };
    });
}

export interface TransaccionEvolucion {
  fecha: string;
  cabezas: number;
  estado: string;
  id_lote?: string | number;
  fecha_publicaciones?: string;
  fecha_operacion?: string;
  Tipo?: string;
  UN?: string;
  RS_Vendedora?: string;
  RS_Compradora?: string;
  Estado_Trop?: string;
  Motivo_NC?: string;
  Canal_Venta?: string;
  Canal_compra?: string;
}

export interface ClienteDetail {
  sociedad: SociedadRaw;
  historial: HistorialAsignacionRaw[];
  transacciones: {
    fecha: string;
    cabezas_ofertadas: number;
    ESTADO: string;
  }[];
  acActual: { 
    nombre: string; 
    volumen: number; 
    modificadoPor?: string; 
    fechaAsignacion?: string; 
  };
  acAnterior: { nombre: string; volumen: number } | null;
  variacionPct: number | null;
  transaccionesEvolucionVendedor: TransaccionEvolucion[];
  transaccionesEvolucionComprador: TransaccionEvolucion[];
  comentarios: ComentarioRaw[];
}

export function getClienteDetail(data: AppData, cuit: string): ClienteDetail | null {
  // Búsqueda robusta por CUIT en el maestro (normalizado numéricamente)
  const targetCuit = normalizeNumeric(cuit);
  if (!targetCuit || targetCuit === "") return null;

  const sociedad = findSociedad(data, undefined, targetCuit);
  
  if (!sociedad) return null;

  const historial = data.historial
    .filter((h) => normalizeNumeric(h.cuit) === targetCuit)
    .sort((a, b) => a.fecha_asignacion.localeCompare(b.fecha_asignacion));

  const transacciones = data.transacciones
    .filter((t) => normalizeNumeric(t.cuit) === targetCuit)
    .sort((a, b) => a.fecha_operacion.localeCompare(b.fecha_operacion))
    .map((t) => ({
      fecha: t.fecha_operacion,
      cabezas_ofertadas: Number(t.cabezas_ofertadas) || 0,
      ESTADO: t.ESTADO,
    }));

  const acActualEntry = historial[historial.length - 1];
  const acAnteriorEntry = historial.length > 1 ? historial[historial.length - 2] : null;

  const volumenAcActual = (fechaDesde?: string) =>
    transacciones
      .filter((t) => t.ESTADO === "CONCRETADA" && (!fechaDesde || t.fecha >= fechaDesde))
      .reduce((s, t) => s + t.cabezas_ofertadas, 0);

  const volAC = volumenAcActual(acActualEntry?.fecha_asignacion);
  const volPrev = acAnteriorEntry
    ? transacciones
        .filter((t) => t.ESTADO === "CONCRETADA" && t.fecha >= acAnteriorEntry.fecha_asignacion && t.fecha < (acActualEntry?.fecha_asignacion || "9999"))
        .reduce((s, t) => s + t.cabezas_ofertadas, 0)
    : 0;

  const variacionPct = acAnteriorEntry && volPrev > 0 ? Math.round(((volAC - volPrev) / volPrev) * 100) : null;

  // --- GRÁFICO DE EVOLUCIÓN (CARD 130) ---
  const unAnioAtras = new Date();
  unAnioAtras.setDate(unAnioAtras.getDate() - 365);
  unAnioAtras.setHours(0, 0, 0, 0);

  const transaccionesEvolucionVendedor: TransaccionEvolucion[] = [];
  const transaccionesEvolucionComprador: TransaccionEvolucion[] = [];

  data.transacciones.forEach((t) => {
    const tCuitVend = normalizeNumeric(t.cuit_vend || (t as any).CUIT_VEND || t.cuit);
    const tCuitComp = normalizeNumeric(t.cuit_comp || (t as any).CUIT_COMP);
    
    const fechaStr = t.fecha_publicaciones || t.fecha_operacion;
    if (!fechaStr) return;

    const d = new Date(fechaStr.includes("T") ? fechaStr : fechaStr + "T00:00:00");
    if (d >= unAnioAtras) {
      if (tCuitVend === targetCuit) {
        transaccionesEvolucionVendedor.push({
          fecha: fechaStr.split("T")[0],
          cabezas: Number(t.Cabezas) || Number(t.cabezas_ofrecidas) || 0,
          estado: t.ESTADO || "S/D",
          id_lote: t.id_lote,
          fecha_publicaciones: t.fecha_publicaciones,
          fecha_operacion: t.fecha_operacion,
          Tipo: t.Tipo,
          UN: t.UN,
          RS_Vendedora: t.RS_Vendedora,
          RS_Compradora: t.RS_Compradora,
          Estado_Trop: t.Estado_Trop,
          Motivo_NC: t.Motivo_NC,
          Canal_Venta: t.Canal_Venta,
          Canal_compra: t.Canal_compra
        });
      }
      if (tCuitComp === targetCuit) {
        transaccionesEvolucionComprador.push({
          fecha: fechaStr.split("T")[0],
          cabezas: Number(t.Cabezas) || Number(t.cabezas_ofertadas) || 0,
          estado: t.ESTADO || "S/D",
          id_lote: t.id_lote,
          fecha_publicaciones: t.fecha_publicaciones,
          fecha_operacion: t.fecha_operacion,
          Tipo: t.Tipo,
          UN: t.UN,
          RS_Vendedora: t.RS_Vendedora,
          RS_Compradora: t.RS_Compradora,
          Estado_Trop: t.Estado_Trop,
          Motivo_NC: t.Motivo_NC,
          Canal_Venta: t.Canal_Venta,
          Canal_compra: t.Canal_compra
        });
      }
    }
  });

  // Sort by date ascending
  transaccionesEvolucionVendedor.sort((a, b) => a.fecha.localeCompare(b.fecha));
  transaccionesEvolucionComprador.sort((a, b) => a.fecha.localeCompare(b.fecha));

  // --- COMENTARIOS ---
  const leadIDs = data.leads
    .filter((l) => normalizeNumeric(l["CUIT Sociedad"]) === targetCuit && l.LeadID)
    .map((l) => l.LeadID!);

  const comentarios = data.comentarios
    .filter((c) => c["ID Lead"] && leadIDs.includes(c["ID Lead"]))
    .sort((a, b) => {
      const dateA = new Date(a.Fecha || "").getTime() || 0;
      const dateB = new Date(b.Fecha || "").getTime() || 0;
      return dateB - dateA; // Descending order (newest first)
    });

  return {
    sociedad,
    historial,
    transacciones,
    transaccionesEvolucionVendedor,
    transaccionesEvolucionComprador,
    acActual: {
      nombre: acActualEntry?.AC ?? sociedad.asociado_comercial,
      volumen: volAC,
      modificadoPor: acActualEntry?.modificado_por,
      fechaAsignacion: acActualEntry?.fecha_asignacion,
    },
    acAnterior: acAnteriorEntry ? { nombre: acAnteriorEntry.AC, volumen: volPrev } : null,
    variacionPct,
    comentarios,
  };
}

export interface KPIItemBase {
  id_sociedad: string;
  razon_social: string;
  cuit: string;
  comercial: string;
  fecha_asignacion: string;
}

export interface KPIAsignadaItem extends KPIItemBase {
  motivo: string;
}

export interface KPIActivadaItem extends KPIItemBase {
  fecha_activacion: string;
  dias_hasta_activar: number;
}

export interface KPISilencioItem extends KPIItemBase {
  motivo: string;
  dias_en_silencio: number;
}

export interface DetallesKPIs {
  asignadas: KPIAsignadaItem[];
  activadas: KPIActivadaItem[];
  silencios: KPISilencioItem[];
}

export interface DashboardKPIs {
  totalAsignadas: number;
  nuevas: number;
  reasignadas: number;
  activadas: number;
  pctActivacion: number;
  silencioComercialPct: number;
  silencioComercialAbs: number;
  tiempoPromedioActivacion: number | null;
  detalles: DetallesKPIs;
}

export function getDashboardKPIs(data: AppData, filtroAC?: string, filtroYear?: string, filtroMonth?: string, filtroModificador?: string, filtroFuente?: string): DashboardKPIs {
  // Pre-build CUIT -> Fuente map for fuente filtering
  const fuenteByCuitKPI = new Map<string, string>();
  if (filtroFuente) {
    data.leads.forEach((l) => {
      const cuit = normalizeNumeric(l["CUIT Sociedad"]);
      if (cuit && l.Fuente && !fuenteByCuitKPI.has(cuit)) fuenteByCuitKPI.set(cuit, l.Fuente);
    });
  }

  const historial = data.historial.filter((h) => {
    if (filtroAC && h.AC !== filtroAC) return false;
    if (filtroModificador && h.modificado_por !== filtroModificador) return false;
    if (filtroFuente) {
      const cuitNorm = normalizeNumeric(h.cuit);
      const fuente = cuitNorm ? (fuenteByCuitKPI.get(cuitNorm) ?? "S/D") : "S/D";
      if (fuente !== filtroFuente) return false;
    }
    if (filtroYear) {
      if (!h.fecha_asignacion) return false;
      const d = new Date(h.fecha_asignacion.includes("T") ? h.fecha_asignacion : h.fecha_asignacion + "T00:00:00");
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear().toString() !== filtroYear) return false;
      if (filtroMonth && (d.getMonth() + 1).toString() !== filtroMonth) return false;
    }
    return true;
  });

  let nuevas = 0;
  let reasignadas = 0;
  
  // Agrupamos la última asignación en el período por cada sociedad para analizar su estado
  const asignadasMap = new Map<string, { fecha: Date, cuitNorm: string, id: string }>();

  historial.forEach((h) => {
    if (h.tipo === "NUEVA") nuevas++;
    else reasignadas++;

    const cuitNorm = normalizeNumeric(h.cuit);
    const id = h.id_sociedad;
    const key = cuitNorm || id;
    
    if (h.fecha_asignacion) {
      const d = new Date(h.fecha_asignacion.includes("T") ? h.fecha_asignacion : h.fecha_asignacion + "T00:00:00");
      if (!isNaN(d.getTime())) {
        const prev = asignadasMap.get(key);
        // Nos quedamos con la útima asignación en el período
        if (!prev || d > prev.fecha) {
          asignadasMap.set(key, { fecha: d, cuitNorm, id });
        }
      }
    }
  });

  const totalEventosAsignacion = nuevas + reasignadas;
  const sociedadesUnicasAsignadas = asignadasMap.size;

  if (sociedadesUnicasAsignadas === 0) {
    return {
      totalAsignadas: totalEventosAsignacion,
      nuevas,
      reasignadas,
      activadas: 0,
      pctActivacion: 0,
      silencioComercialPct: 0,
      silencioComercialAbs: 0,
      tiempoPromedioActivacion: null,
      detalles: { asignadas: [], activadas: [], silencios: [] }
    };
  }

  // Pre-procesar leads, comentarios y transacciones
  const leadsByCuit = new Map<string, string[]>();
  const fuenteByCuit = new Map<string, string>();
  data.leads.forEach(l => {
    const cuit = normalizeNumeric(l["CUIT Sociedad"]);
    if (cuit) {
      if (l.LeadID) {
        const arr = leadsByCuit.get(cuit) || [];
        arr.push(l.LeadID);
        leadsByCuit.set(cuit, arr);
      }
      if (l.Fuente && !fuenteByCuit.has(cuit)) {
        fuenteByCuit.set(cuit, l.Fuente);
      }
    }
  });

  const transaccionesByCuit = new Map<string, Date[]>();
  data.transacciones.forEach(t => {
    const cuitVend = normalizeNumeric(t.cuit_vend || (t as any).CUIT_VEND || t.cuit);
    const cuitComp = normalizeNumeric(t.cuit_comp || (t as any).CUIT_COMP);
    const tDateStr = t.fecha_publicaciones || t.fecha_operacion;
    if (!tDateStr) return;
     
    const d = new Date(tDateStr.includes("T") ? tDateStr : tDateStr + "T00:00:00");
    if (isNaN(d.getTime())) return;

    if (cuitVend) {
      const arr = transaccionesByCuit.get(cuitVend) || [];
      arr.push(d);
      transaccionesByCuit.set(cuitVend, arr);
    }
    if (cuitComp && cuitComp !== cuitVend) {
      const arr2 = transaccionesByCuit.get(cuitComp) || [];
      arr2.push(d);
      transaccionesByCuit.set(cuitComp, arr2);
    }
  });

  const parseComentarioDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  let activadas = 0;
  let silencios = 0;
  let sumaDiasActivacion = 0;

  const arrAsignadas: KPIAsignadaItem[] = [];
  const arrActivadas: KPIActivadaItem[] = [];
  const arrSilencios: KPISilencioItem[] = [];
  const hoy = new Date();

  asignadasMap.forEach(({ fecha, cuitNorm, id }) => {
    const asigMidnight = new Date(fecha);
    asigMidnight.setHours(0, 0, 0, 0);
    const asignacionTime = asigMidnight.getTime();

    // Encontrar info básica para los detalles
    const soc = findSociedad(data, id, cuitNorm);
    const repHist = historial.find(h => h.id_sociedad === id && new Date(h.fecha_asignacion.includes('T') ? h.fecha_asignacion : h.fecha_asignacion + 'T00:00:00').getTime() === fecha.getTime());
    const comercial = repHist?.AC || soc?.asociado_comercial || "Sin asignar";
    const razonSocial = repHist?.razon_social || soc?.razon_social || id;
    const motivo = cuitNorm ? (fuenteByCuit.get(cuitNorm) || "S/D") : "S/D";
    const fechaAsignacionStr = repHist?.fecha_asignacion || fecha.toISOString();

    const baseItem = {
      id_sociedad: id,
      razon_social: razonSocial,
      cuit: cuitNorm || soc?.cuit || "",
      comercial,
      fecha_asignacion: fechaAsignacionStr
    };

    arrAsignadas.push({ ...baseItem, motivo });

    let tuvoContactoCRM = false;
    let fechaPrimeraActivacion: Date | null = null;

    if (cuitNorm) {
      // 1. Check CRM contacts
      const leadIDs = leadsByCuit.get(cuitNorm);
      if (leadIDs && leadIDs.length > 0) {
        tuvoContactoCRM = data.comentarios.some(c => {
          if (c["ID Lead"] && leadIDs.includes(c["ID Lead"])) {
            const cTime = parseComentarioDate(c.Fecha || "");
            return cTime >= asignacionTime; 
          }
          return false;
        });
      }

      // 2. Check transacciones for Activación
      const transDates = transaccionesByCuit.get(cuitNorm);
      if (transDates && transDates.length > 0) {
        // Encontrar transacciones posteriores a la asignación
        const tPostItems = transDates
          .map(d => {
             const dm = new Date(d);
             dm.setHours(0, 0, 0, 0);
             return dm;
          })
          .filter(dm => dm.getTime() >= asignacionTime)
          .sort((a, b) => a.getTime() - b.getTime());

        if (tPostItems.length > 0) {
           fechaPrimeraActivacion = tPostItems[0];
        }
      }
    }

    if (fechaPrimeraActivacion) {
      activadas++;
      const diasHastaActivar = Math.max(0, daysBetween(fecha.toISOString(), fechaPrimeraActivacion));
      sumaDiasActivacion += diasHastaActivar;
      arrActivadas.push({
        ...baseItem,
        fecha_activacion: fechaPrimeraActivacion.toISOString(),
        dias_hasta_activar: diasHastaActivar
      });
    }

    if (!tuvoContactoCRM && !fechaPrimeraActivacion) {
      silencios++;
      arrSilencios.push({
        ...baseItem,
        motivo,
        dias_en_silencio: daysBetween(fecha.toISOString(), hoy)
      });
    }
  });

  return {
    totalAsignadas: totalEventosAsignacion,
    nuevas,
    reasignadas,
    activadas,
    pctActivacion: Math.round((activadas / sociedadesUnicasAsignadas) * 100),
    silencioComercialPct: Math.round((silencios / sociedadesUnicasAsignadas) * 100),
    silencioComercialAbs: silencios,
    tiempoPromedioActivacion: activadas > 0 ? Math.round(sumaDiasActivacion / activadas) : null,
    detalles: {
      asignadas: arrAsignadas.sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion)),
      activadas: arrActivadas.sort((a, b) => b.fecha_activacion.localeCompare(a.fecha_activacion)),
      silencios: arrSilencios.sort((a, b) => b.dias_en_silencio - a.dias_en_silencio)
    }
  };
}
