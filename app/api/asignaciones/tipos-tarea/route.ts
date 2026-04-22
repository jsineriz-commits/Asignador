import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google-jwt";

export async function GET() {
  try {
    const {
      GOOGLE_SHEETS_ID,
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
    } = process.env;

    if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
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

    // Leer columna L de la hoja Tareas (Tipo)
    const params = new URLSearchParams([
      ["ranges", "Tareas!L:L"]
    ]);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values:batchGet?${params.toString()}`;

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

    const tiposValues = valueRanges[0]?.values || [];
    const tiposSet = new Set<string>();

    if (tiposValues.length > 0) {
      // Omitir cabecera
      const rows = tiposValues.slice(1);
      rows.forEach((row: any[]) => {
        const val = row[0] ? row[0].trim() : "";
        if (val) tiposSet.add(val);
      });
    }

    const tipos = Array.from(tiposSet).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ tipos });
  } catch (error: any) {
    console.error("[SHEETS_API_TIPOS_TAREA_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno obteniendo tipos de tarea", details: error.message },
      { status: 500 }
    );
  }
}

