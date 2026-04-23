import { NextResponse } from "next/server";
import { CRM_SHEET_ID, GNS_CRM_SHEET_ID, GNS_MIRROR_SHEET_ID } from "@/lib/sheets-config";
import { getGoogleAccessToken } from "@/lib/google-jwt";

// Sheet ID centralizado en lib/sheets-config.ts

// â”€â”€â”€ Helper: fetch a Sheets range and return rows (string[][]) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchSheetRange(
  token: string,
  sheetId: string,
  range: string
): Promise<string[][]> {
  const encodedRange = range.replace(/ /g, "%20");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API error [${range}]: ${res.statusText} â€” ${body}`);
  }
  const json = await res.json();
  return (json.values as string[][]) || [];
}

// â”€â”€â”€ Helper: find column index by header substring (case-insensitive) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function colIdx(headers: string[], ...candidates: string[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const i = lower.findIndex((h) => h.includes(c.toLowerCase()));
    if (i !== -1) return i;
  }
  return -1;
}

export async function GET() {
  try {
    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
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

    // â”€â”€ Fetch ofertantes (obligatorio) + CRM sheets (opcional, fail-safe) â”€â”€â”€â”€â”€â”€â”€â”€
    const crmAvailable = !!GNS_CRM_SHEET_ID;

    const [ofertantesResult, leadsResult, tareasResult, informadosResult] = await Promise.allSettled([
      fetchSheetRange(token, OFERTANTES_SHEET_ID, "ofertantes!A:Z"),
      crmAvailable
        ? fetchSheetRange(token, GNS_CRM_SHEET_ID!, "Leads!A:Z")
        : Promise.resolve([] as string[][]),
      crmAvailable
        ? fetchSheetRange(token, GNS_CRM_SHEET_ID!, "Tareas!A:Z")
        : Promise.resolve([] as string[][]),
      // Hoja "informados" en el mismo sheet de ofertantes (col A = CUIT)
      fetchSheetRange(token, OFERTANTES_SHEET_ID, "informados!A:A"),
    ]);

    // Si el sheet de ofertantes fallÃ³, sÃ­ retornamos error
    if (ofertantesResult.status === "rejected") {
      throw ofertantesResult.reason;
    }

    const ofertantesRows = ofertantesResult.value;

    // CRM: si falla por permisos u otro motivo, logueamos pero no bloqueamos
    const leadsRows: string[][] =
      leadsResult.status === "fulfilled" ? leadsResult.value : [];
    const tareasRows: string[][] =
      tareasResult.status === "fulfilled" ? tareasResult.value : [];
    const informadosRows: string[][] =
      informadosResult.status === "fulfilled" ? informadosResult.value : [];

    if (leadsResult.status === "rejected") {
      console.warn("[OFERTANTES_API] No se pudo acceder a Leads del CRM (filtrado desactivado):", leadsResult.reason?.message);
    }
    if (tareasResult.status === "rejected") {
      console.warn("[OFERTANTES_API] No se pudo acceder a Tareas del CRM (filtrado desactivado):", tareasResult.reason?.message);
    }
    if (informadosResult.status === "rejected") {
      console.warn("[OFERTANTES_API] No se pudo acceder a Informados (filtrado desactivado):", informadosResult.reason?.message);
    }

    // â”€â”€ Parse ofertantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (ofertantesRows.length === 0) {
      return NextResponse.json({ ofertantes: [] });
    }

    const ofHeaders = ofertantesRows[0];
    const ofRows = ofertantesRows.slice(1);

    const ofertantes = ofRows
      .map((row) => {
        const obj: Record<string, string> = {};
        ofHeaders.forEach((header, i) => {
          obj[header] = row[i] ?? "";
        });
        return obj;
      })
      .filter((row) => Object.values(row).some((v) => v.trim() !== ""));

    // â”€â”€ Build CRM lookup: CUIT â†’ LeadID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const cuitToLeadId = new Map<string, string>();

    if (leadsRows.length > 1) {
      const leadsHeaders = leadsRows[0];
      const cuitColIdx = colIdx(leadsHeaders, "cuit sociedad", "cuit");
      const leadIdColIdx = colIdx(leadsHeaders, "leadid", "lead id", "lead_id", "#", "id");

      if (cuitColIdx !== -1 && leadIdColIdx !== -1) {
        for (let i = 1; i < leadsRows.length; i++) {
          const row = leadsRows[i];
          const rawCuit = String(row[cuitColIdx] ?? "").replace(/\D/g, "");
          const leadId = String(row[leadIdColIdx] ?? "").trim();
          if (rawCuit && leadId) {
            cuitToLeadId.set(rawCuit, leadId);
          }
        }
      }
    }

    // â”€â”€ Build EXCLUSION set: LeadIDs con Tipo = "GNS - OFERTANTES" en Tareas â”€â”€â”€â”€â”€â”€
    const excludedLeadIds = new Set<string>();

    if (tareasRows.length > 1) {
      const tareasHeaders = tareasRows[0];
      // Buscar "Tipo" (col 11 en el schema real)
      const tipoColIdx = colIdx(tareasHeaders, "tipo");
      // Buscar "ID Lead" antes que "id" genÃ©rico para no matchear "ID Tarea"
      const tareaLeadIdColIdx = colIdx(tareasHeaders, "id lead", "lead id", "leadid", "lead_id");

      if (tipoColIdx !== -1 && tareaLeadIdColIdx !== -1) {
        for (let i = 1; i < tareasRows.length; i++) {
          const row = tareasRows[i];
          const tipo = String(row[tipoColIdx] ?? "").trim().toLowerCase();
          const leadId = String(row[tareaLeadIdColIdx] ?? "").trim();
          if (tipo === "gns - ofertantes" && leadId) {
            excludedLeadIds.add(leadId);
          }
        }
      }
    }

    // â”€â”€ Build EXCLUSION set por CUIT: hoja "informados" (col A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const informadosCuits = new Set<string>();

    // La hoja puede o no tener cabecera; tomamos todas las filas (salvo la primera
    // si tiene cabecera tipo "cuit", o desde la fila 1 si contiene solo datos)
    const informadosData = informadosRows.length > 0
      ? (informadosRows[0]?.[0]?.toLowerCase().includes("cuit") ? informadosRows.slice(1) : informadosRows)
      : [];

    for (const row of informadosData) {
      const rawCuit = String(row[0] ?? "").replace(/\D/g, "");
      if (rawCuit) informadosCuits.add(rawCuit);
    }

    // â”€â”€ Filter ofertantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Excluir ofertantes cuyo CUIT tenga un Lead con tarea "GNS Ofertante"
    const filtered = ofertantes.filter((of) => {
      const rawCuit = String(of.cuit ?? "").replace(/\D/g, "");
      if (!rawCuit) return true;           // sin CUIT â†’ incluir
      // Excluir si estÃ¡ en "informados"
      if (informadosCuits.has(rawCuit)) return false;
      // Excluir si tiene Lead con tarea "GNS Ofertante" en CRM
      const leadId = cuitToLeadId.get(rawCuit);
      if (!leadId) return true;
      return !excludedLeadIds.has(leadId);
    });

    return NextResponse.json({ ofertantes: filtered });
  } catch (error: any) {
    console.error("[OFERTANTES_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno conectando con Google Sheets", details: error.message },
      { status: 500 }
    );
  }
}

