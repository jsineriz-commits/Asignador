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

    const params = new URLSearchParams([
      ["ranges", "Analistas x AC!A:E"]
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
    
    const acsValues = valueRanges[0]?.values || [];
    let acs: {email: string, nombre: string, codigo: string}[] = [];
    
    if (acsValues.length > 0) {
      // Omitir cabecera
      const rows = acsValues.slice(1);
      
      // Columna A (0) = email, Columna C (2) = Nombre, Columna E (4) = Código para IDs
      acs = rows.map((row: any[]) => ({
        email: row[0] || "",
        nombre: row[2] || "",
        codigo: row[4] || "",
      }))
      .filter(ac => 
        ac.email && 
        ac.email.trim() !== "" && 
        ac.email.toLowerCase() !== "ptaffarel@decampoacampo.com"
      );
      
      // Ordenar alfabéticamente por nombre
      acs.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return NextResponse.json({ acs });
  } catch (error: any) {
    console.error("[SHEETS_API_ACS_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno obteniendo analistas", details: error.message },
      { status: 500 }
    );
  }
}
