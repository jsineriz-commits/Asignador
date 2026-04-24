import { NextResponse } from "next/server";
import { GNS_MIRROR_SHEET_ID } from "@/lib/sheets-config";
import { getGoogleAccessToken } from "@/lib/google-jwt";

// ─── Helper: fetch Sheets range ───────────────────────────────────────────────
async function fetchSheetRange(
  token: string,
  sheetId: string,
  range: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range.replace(/ /g, "%20")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API error [${range}]: ${res.statusText} — ${body}`);
  }
  const json = await res.json();
  return (json.values as string[][]) || [];
}

// ─── Helper: autenticar en Metabase ──────────────────────────────────────────
async function getMetabaseSession(
  baseUrl: string,
  username: string,
  password: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error autenticando en Metabase: ${res.statusText} — ${errText}`);
  }
  const data = await res.json();
  return data.id as string;
}

// ─── Helper: ejecutar card de Metabase → array de objetos ────────────────────
async function fetchCard(
  baseUrl: string,
  sessionId: string,
  cardId: number
): Promise<Record<string, unknown>[]> {
  console.log(`[OFRECEDORAS] Solicitando Card ${cardId}...`);
  const t = Date.now();

  const res = await fetch(`${baseUrl}/api/card/${cardId}/query/json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Metabase-Session": sessionId,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Metabase error en Card ${cardId}: ${res.status} — ${errText}`);
  }

  const json = await res.json();
  console.log(
    `[OFRECEDORAS] Card ${cardId} OK (${((Date.now() - t) / 1000).toFixed(1)}s, ${Array.isArray(json) ? json.length : "?"} filas).`
  );
  return Array.isArray(json) ? json : [];
}

// ─── Normalizar texto para comparar ──────────────────────────────────────────
// Maneja: trim, minúsculas, sin acentos, colapsa whitespace múltiple,
// reemplaza non-breaking spaces y otros whitespace raros.
function normalize(s: string): string {
  return s
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, " ") // non-breaking y otros espacios raros → espacio normal
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/\s+/g, " ");           // colapsa espacios múltiples
}

// Slug: solo letras y números, para comparación ultra-agresiva de fallback
function slug(s: string): string {
  return normalize(s).replace(/[^a-z0-9]/g, "");
}

export async function GET() {
  try {
    const {
      METABASE_URL,
      METABASE_USERNAME,
      METABASE_PASSWORD,
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
    } = process.env;

    if (!METABASE_URL || !METABASE_USERNAME || !METABASE_PASSWORD) {
      return NextResponse.json(
        { error: "Faltan credenciales de Metabase en .env.local" },
        { status: 500 }
      );
    }

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Faltan credenciales de Google en .env.local" },
        { status: 500 }
      );
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");

    // Autenticar Metabase y Google en paralelo
    const [sessionId, googleToken] = await Promise.all([
      getMetabaseSession(METABASE_URL, METABASE_USERNAME, METABASE_PASSWORD),
      getGoogleAccessToken(
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey,
        "https://www.googleapis.com/auth/spreadsheets.readonly"
      ),
    ]);

    // Ejecutar Q231 y Sheet en paralelo
    const [rows, sheetRows] = await Promise.all([
      fetchCard(METABASE_URL, sessionId, 231),
      fetchSheetRange(googleToken, GNS_MIRROR_SHEET_ID, "ofrecedoras!A:E").catch((err) => {
        console.warn("[OFRECEDORAS] No se pudo leer hoja ofrecedoras del Sheet:", err.message);
        return [] as string[][];
      }),
    ]);

    // ── Construir lookup: nombre_normalizado → { decision, responsable } ────────
    // Col A (idx 0) = Decision, Col B (idx 1) = Sociedad, Col E (idx 4) = Responsable
    // Usamos dos mapas: normalize() como primario, slug() como fallback ultra-agresivo.
    const sheetLookupNorm = new Map<string, { decision: string; responsable: string }>();
    const sheetLookupSlug = new Map<string, { decision: string; responsable: string }>();

    // Detectar si la primera fila es cabecera
    const firstRow = sheetRows[0] ?? [];
    const hasHeader =
      normalize(String(firstRow[0] ?? "")).includes("decision") ||
      normalize(String(firstRow[1] ?? "")).includes("sociedad");

    const dataRows = sheetRows.length > 0 ? (hasHeader ? sheetRows.slice(1) : sheetRows) : [];

    for (const row of dataRows) {
      const sociedad = String(row[1] ?? "");
      if (!sociedad.trim()) continue;
      const entry = {
        decision:    String(row[0] ?? "").trim(),
        responsable: String(row[4] ?? "").trim(),
      };
      sheetLookupNorm.set(normalize(sociedad), entry);
      sheetLookupSlug.set(slug(sociedad), entry);
    }

    console.log(
      `[OFRECEDORAS] Sheet: ${dataRows.length} filas, ${sheetLookupNorm.size} entradas. ` +
      `hasHeader=${hasHeader}. ` +
      `Primeras keys norm: ${Array.from(sheetLookupNorm.keys()).slice(0, 5).join(" | ")}`
    );

    // ── Mapear Q231 + enriquecer con datos del Sheet ─────────────────────────
    let matchCount = 0;
    const ofrecedoras = rows.map((row) => {
      const socVend = String(row.soc_vend ?? "").trim();
      // Intentar primero por normalize, luego por slug como fallback
      const sheetData =
        sheetLookupNorm.get(normalize(socVend)) ??
        sheetLookupSlug.get(slug(socVend)) ??
        null;

      if (sheetData) matchCount++;

      // decision: si no matcheó o col A vacía → "Validar OP"
      const decision = sheetData?.decision ? sheetData.decision : "Validar OP";

      return {
        id_soc_vend:      String(row.id_soc_vend ?? ""),
        cuit_vend:        String(row.cuit_vend ?? ""),
        soc_vend:         socVend,
        decision,
        ac_vend:          String(row.ac_vend ?? ""),
        repre_vend:       String(row.repre_vend ?? ""),
        prov_sv:          String(row.prov_sv ?? ""),
        part_sv:          String(row.part_sv ?? ""),
        segmento_cliente: String(row.segmento_cliente ?? ""),
        Q_OFREC:          Number(row.Q_OFREC) || 0,
        Q_VENTAS:         Number(row.Q_VENTAS) || 0,
        kt:               Number(row.kt) || 0,
        kv:               Number(row.kv) || 0,
        responsable:      sheetData?.responsable ?? "",
      };
    });

    console.log(`[OFRECEDORAS] ${ofrecedoras.length} sociedades. Sheet matches: ${matchCount}/${ofrecedoras.length}.`);
    return NextResponse.json({ ofrecedoras });
  } catch (error: any) {
    console.error("[OFRECEDORAS_API_ERROR]", error);
    return NextResponse.json(
      {
        error: "Error interno conectando con Metabase",
        details: error.message,
        cause: error.cause ? String(error.cause) : undefined,
      },
      { status: 500 }
    );
  }
}
