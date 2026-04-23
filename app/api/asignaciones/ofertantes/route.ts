import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google-jwt";
import { fetchSheetRange } from "@/lib/sheets-fetch";

const OFERTANTES_SHEET_ID = "1gP6cckD44ZS5CjZPsYYqGYU0rnQqztYFFFEm22nQU_4";

function colIdx(headers: string[], ...candidates: string[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const i = lower.findIndex((h) => h.includes(c.toLowerCase()));
    if (i !== -1) return i;
  }
  return -1;
}

/** Normaliza para comparar: minúsculas + sin acentos + sin espacios dobles */
function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Aliases de provincia: normaliza variantes al nombre canónico (sin acentos) */
function provinciaAlias(p: string): string {
  const n = norm(p);
  if (
    n.includes("c.a.") ||
    n.includes("ciudad autonoma") ||
    n.includes("capital federal") ||
    n === "caba"
  ) return "buenos aires";
  return n;
}

// -- Fallback por provincia cuando el partido no tiene match exacto en la tabla -
const PROVINCIA_FALLBACK: Record<string, string> = {
  "buenos aires":        "Paulina Taffarel / Juan Siñeriz",
  "la pampa":            "Juan Siñeriz",
  "santa fe":            "Juan Siñeriz / Juan Segundo Tonon",
  "entre rios":          "Juan Segundo Tonon",
  "corrientes":          "Juan Segundo Tonon",
  "misiones":            "Juan Segundo Tonon",
  "chaco":               "Juan Segundo Tonon",
  "formosa":             "Santos Dewey",
  "salta":               "Santos Dewey",
  "jujuy":               "Santos Dewey",
  "tucuman":             "Santos Dewey",
  "catamarca":           "Santos Dewey",
  "santiago del estero": "Santos Dewey",
  "cordoba":             "Santos Dewey",
  "la rioja":            "Santos Dewey",
  "san juan":            "Santos Dewey",
  "san luis":            "Santos Dewey",
  "mendoza":             "Santos Dewey",
};

export async function GET() {
  try {
    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      GNS_CRM_SHEET_ID,
    } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Faltan credenciales de Google en .env.local" },
        { status: 500 }
      );
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");

    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      "https://www.googleapis.com/auth/spreadsheets.readonly"
    );

    const crmAvailable = !!GNS_CRM_SHEET_ID;

    const [
      ofertantesResult,
      leadsResult,
      tareasResult,
      informadosResult,
      respDptoResult,
    ] = await Promise.allSettled([
      fetchSheetRange(token, OFERTANTES_SHEET_ID, "ofertantes!A:Z"),
      crmAvailable
        ? fetchSheetRange(token, GNS_CRM_SHEET_ID!, "Leads!A:Z")
        : Promise.resolve([] as string[][]),
      crmAvailable
        ? fetchSheetRange(token, GNS_CRM_SHEET_ID!, "Tareas!A:Z")
        : Promise.resolve([] as string[][]),
      fetchSheetRange(token, OFERTANTES_SHEET_ID, "informados!A:A"),
      // responsables_dpto: col A = provincia, col B = partido, col E = responsable
      fetchSheetRange(token, OFERTANTES_SHEET_ID, "responsables_dpto!A:E"),
    ]);

    if (ofertantesResult.status === "rejected") throw ofertantesResult.reason;

    const ofertantesRows = ofertantesResult.value;
    const leadsRows: string[][] = leadsResult.status === "fulfilled" ? leadsResult.value : [];
    const tareasRows: string[][] = tareasResult.status === "fulfilled" ? tareasResult.value : [];
    const informadosRows: string[][] = informadosResult.status === "fulfilled" ? informadosResult.value : [];
    const respDptoRows: string[][] = respDptoResult.status === "fulfilled" ? respDptoResult.value : [];

    if (leadsResult.status === "rejected")
      console.warn("[OFERTANTES_API] Leads CRM no disponible:", leadsResult.reason?.message);
    if (tareasResult.status === "rejected")
      console.warn("[OFERTANTES_API] Tareas CRM no disponible:", tareasResult.reason?.message);
    if (informadosResult.status === "rejected")
      console.warn("[OFERTANTES_API] Informados no disponible:", informadosResult.reason?.message);
    if (respDptoResult.status === "rejected")
      console.warn("[OFERTANTES_API] responsables_dpto no disponible:", respDptoResult.reason?.message);

    // -- Parse ofertantes -------------------------------------------------------
    if (ofertantesRows.length === 0) {
      return NextResponse.json({ ofertantes: [], gestionadas: [] });
    }

    const ofHeaders = ofertantesRows[0];
    const ofertantes = ofertantesRows
      .slice(1)
      .map((row) => {
        const obj: Record<string, string> = {};
        ofHeaders.forEach((h, i) => { obj[h] = row[i] ?? ""; });
        return obj;
      })
      .filter((row) => Object.values(row).some((v) => v.trim() !== ""));

    // -- CRM lookup: CUIT -> LeadID ---------------------------------------------
    const cuitToLeadId = new Map<string, string>();
    if (leadsRows.length > 1) {
      const lh = leadsRows[0];
      const cuitCol = colIdx(lh, "cuit sociedad", "cuit");
      const idCol = colIdx(lh, "leadid", "lead id", "lead_id", "#", "id");
      if (cuitCol !== -1 && idCol !== -1) {
        for (let i = 1; i < leadsRows.length; i++) {
          const rawCuit = String(leadsRows[i][cuitCol] ?? "").replace(/\D/g, "");
          const leadId = String(leadsRows[i][idCol] ?? "").trim();
          if (rawCuit && leadId) cuitToLeadId.set(rawCuit, leadId);
        }
      }
    }

    // -- Exclusion set: LeadIDs con tarea "GNS - OFERTANTES" -------------------
    const excludedLeadIds = new Set<string>();
    if (tareasRows.length > 1) {
      const th = tareasRows[0];
      const tipoCol = colIdx(th, "tipo");
      const leadIdCol = colIdx(th, "id lead", "lead id", "leadid", "lead_id");
      if (tipoCol !== -1 && leadIdCol !== -1) {
        for (let i = 1; i < tareasRows.length; i++) {
          const tipo = String(tareasRows[i][tipoCol] ?? "").trim().toLowerCase();
          const leadId = String(tareasRows[i][leadIdCol] ?? "").trim();
          if (tipo === "gns - ofertantes" && leadId) excludedLeadIds.add(leadId);
        }
      }
    }

    // -- Exclusion set: CUITs en hoja "informados" (gestion manual) -------------
    const informadosCuits = new Set<string>();
    const informadosData =
      informadosRows.length > 0 && informadosRows[0]?.[0]?.toLowerCase().includes("cuit")
        ? informadosRows.slice(1)
        : informadosRows;
    for (const row of informadosData) {
      const rawCuit = String(row[0] ?? "").replace(/\D/g, "");
      if (rawCuit) informadosCuits.add(rawCuit);
    }

    // -- Direct join: (provincia + partido) -> responsable ----------------------
    // responsables_dpto: col A = provincia, col B = partido, col E = responsable
    // Clave compuesta normalizada
    const dptoKey = (provincia: string, partido: string) =>
      `${provinciaAlias(provincia)}|${norm(partido)}`;

    const dptoToResponsable = new Map<string, string>();
    for (const row of respDptoRows) {
      const provincia   = String(row[0] ?? "").trim();
      const partido     = String(row[1] ?? "").trim();
      const responsable = String(row[4] ?? "").trim();
      if (provincia && partido && responsable) {
        dptoToResponsable.set(dptoKey(provincia, partido), responsable);
      }
    }

    /**
     * Resolución de responsable:
     * 1) Match exacto (provincia + partido) en responsables_dpto
     * 2) Fallback al responsable por defecto de la provincia
     * 3) Sin match → string vacío
     */
    const resolveResponsable = (provincia: string, partido: string): string => {
      const exact = dptoToResponsable.get(dptoKey(provincia, partido));
      if (exact) return exact;
      const provNorm = provinciaAlias(provincia);
      return PROVINCIA_FALLBACK[provNorm] ?? "";
    };

    // -- Classify each ofertante ------------------------------------------------
    const filtered: Record<string, string>[] = [];
    const gestionadas: Record<string, string>[] = [];

    for (const of_ of ofertantes) {
      const rawCuit = String(of_.cuit ?? "").replace(/\D/g, "");
      const responsable = resolveResponsable(of_.provincia ?? "", of_.partido ?? "");
      const enriched = { ...of_, responsable };

      if (!rawCuit) { filtered.push(enriched); continue; }

      if (informadosCuits.has(rawCuit)) {
        gestionadas.push({ ...enriched, motivo_gestion: "Manual" });
        continue;
      }

      const leadId = cuitToLeadId.get(rawCuit);
      if (leadId && excludedLeadIds.has(leadId)) {
        gestionadas.push({ ...enriched, motivo_gestion: "CRM" });
        continue;
      }

      filtered.push(enriched);
    }

    return NextResponse.json({ ofertantes: filtered, gestionadas });
  } catch (error: any) {
    console.error("[OFERTANTES_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno conectando con Google Sheets", details: error.message },
      { status: 500 }
    );
  }
}
