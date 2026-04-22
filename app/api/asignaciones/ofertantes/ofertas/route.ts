import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google-jwt";

const OFERTANTES_SHEET_ID = "1gP6cckD44ZS5CjZPsYYqGYU0rnQqztYFFFEm22nQU_4";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cuit = searchParams.get("cuit");

    if (!cuit) {
      return NextResponse.json({ error: "Falta parÃ¡metro cuit" }, { status: 400 });
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

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${OFERTANTES_SHEET_ID}/values/import_gns!A:AI`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Error en Sheets API (import_gns): ${res.statusText} â€” ${body}`);
    }

    const json = await res.json();
    const values: string[][] = json.values || [];

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

