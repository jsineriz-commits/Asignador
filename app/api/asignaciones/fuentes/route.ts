import { NextResponse } from "next/server";
import { CRM_SHEET_ID, GNS_CRM_SHEET_ID, GNS_MIRROR_SHEET_ID } from "@/lib/sheets-config";
import { getGoogleAccessToken } from "@/lib/google-jwt";

export async function GET() {
  try {
    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
    } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Faltan credenciales de Google Sheets en .env.local" },
        { status: 500 }
      );
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");

    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      "https://www.googleapis.com/auth/spreadsheets.readonly"
    );

    const params = new URLSearchParams([
      ["ranges", "Leads!D:D"]
    ]);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CRM_SHEET_ID}/values:batchGet?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Error en Sheets API: ${res.statusText}`);
    }

    const json = await res.json();
    const valueRanges = json.valueRanges || [];
    
    const fuentesValues = valueRanges[0]?.values || [];
    let fuentesSet = new Set<string>();
    
    if (fuentesValues.length > 0) {
      // Omitir cabecera (usualmente "Fuente")
      const rows = fuentesValues.slice(1);
      
      rows.forEach((row: any[]) => {
        const val = row[0] ? row[0].trim() : "";
        if (val && val.toLowerCase() !== "prueba") {
          fuentesSet.add(val);
        }
      });
    }

    const fuentes = Array.from(fuentesSet).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ fuentes });
  } catch (error: any) {
    console.error("[SHEETS_API_FUENTES_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno obteniendo fuentes", details: error.message },
      { status: 500 }
    );
  }
}

