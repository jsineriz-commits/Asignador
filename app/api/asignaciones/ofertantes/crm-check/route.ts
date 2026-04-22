import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google-jwt";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cuit = searchParams.get("cuit")?.replace(/\D/g, "");

    if (!cuit || cuit.length !== 11) {
      return NextResponse.json(
        { error: "CUIT invÃ¡lido o ausente" },
        { status: 400 }
      );
    }

    const { GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } =
      process.env;

    if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Faltan credenciales de Google Sheets" },
        { status: 500 }
      );
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      "https://www.googleapis.com/auth/spreadsheets.readonly"
    );

    // Leemos solo las columnas A:M de Leads para obtener cabecera + CUIT (col L) + AC (col C)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/Leads!A1:M`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const sheetsRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!sheetsRes.ok) {
      const body = await sheetsRes.text();
      throw new Error(`Sheets error: ${sheetsRes.status} â€” ${body}`);
    }

    const json = await sheetsRes.json();
    const rows: string[][] = json.values || [];

    if (rows.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Detectar Ã­ndices de columnas dinamicamente por cabecera
    const headers = rows[0].map((h: string) => String(h).trim().toLowerCase());
    const cuitIdx = headers.findIndex((h) => h.includes("cuit"));
    const acIdx = headers.findIndex(
      (h) => h.includes("ac asignado") || h.includes("ac_asignado") || h.includes("email ac")
    );
    const leadIdIdx = headers.findIndex(
      (h) => h === "#" || h === "leadid" || h === "lead id" || h === "id" || h === "nÃºmero" || h === "numero"
    );

    if (cuitIdx === -1) {
      // No se puede buscar sin columna CUIT
      return NextResponse.json({ found: false });
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowCuit = String(row[cuitIdx] || "").replace(/\D/g, "");
      if (rowCuit === cuit) {
        const lead: Record<string, string> = {};
        if (acIdx !== -1) lead.acEmail = row[acIdx] || "";
        if (leadIdIdx !== -1) lead.leadId = row[leadIdIdx] || "";
        return NextResponse.json({ found: true, lead });
      }
    }

    return NextResponse.json({ found: false });
  } catch (error: any) {
    console.error("[CRM_CHECK_ERROR]", error);
    return NextResponse.json(
      { error: "Error verificando el CRM", details: error.message },
      { status: 500 }
    );
  }
}

