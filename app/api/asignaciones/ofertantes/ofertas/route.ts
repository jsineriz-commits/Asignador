import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google-jwt";
import { fetchSheetRange } from "@/lib/sheets-fetch";

const OFERTANTES_SHEET_ID = "1gP6cckD44ZS5CjZPsYYqGYU0rnQqztYFFFEm22nQU_4";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cuit = searchParams.get("cuit");

    if (!cuit) {
      return NextResponse.json({ error: "Falta parametro cuit" }, { status: 400 });
    }

    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

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

    const values = await fetchSheetRange(token, OFERTANTES_SHEET_ID, "import_gns!A:AI");

    if (values.length === 0) {
      return NextResponse.json({ ofertas: [] });
    }

    const headers = values[0];
    const rows = values.slice(1);

    const cuitIdx = headers.indexOf("cuit_ofertante");

    const ofertas = rows
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] ?? "";
        });
        return obj;
      })
      .filter((row) => {
        if (cuitIdx === -1) return false;
        return row["cuit_ofertante"]?.trim() === cuit.trim();
      });

    return NextResponse.json({ ofertas });
  } catch (error: any) {
    console.error("[OFERTAS_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno conectando con Google Sheets", details: error.message },
      { status: 500 }
    );
  }
}
