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

    // El Google Private Key suele venir con \n escapados desde un env, hay que reemplazarlo
    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");

    // Usamos nuestro helper nativo en vez de google-auth-library (que usa node-fetch y falla en RSC)
    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      "https://www.googleapis.com/auth/spreadsheets.readonly"
    );

    // Fetch Leads
    const leadsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/Leads!A:L`;
    const leadsRes = await fetch(leadsUrl, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!leadsRes.ok) {
      const body = await leadsRes.text();
      throw new Error(`Error en Sheets API (Leads): ${leadsRes.statusText} - ${body}`);
    }

    const leadsJson = await leadsRes.json();
    const leadsValues = leadsJson.values || [];
    let leads: any[] = [];
    if (leadsValues.length > 0) {
      const headers = leadsValues[0];
      const rows = leadsValues.slice(1);
      leads = rows
        .map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header: string, i: number) => {
            obj[header] = row[i] || "";
          });
          return obj;
        })
        .filter((lead: any) => {
          const fuente = String(lead.Fuente || "").toLowerCase();
          return fuente !== "prueba";
        });
    }

    // Fetch Comentarios - si la pestaña no existe, devolvemos array vacío sin romper todo
    let comentarios: any[] = [];
    try {
      const comentariosUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/Comentarios!A:G`;
      const comentariosRes = await fetch(comentariosUrl, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (comentariosRes.ok) {
        const comentariosJson = await comentariosRes.json();
        const comentariosValues = comentariosJson.values || [];
        if (comentariosValues.length > 0) {
          const headers = comentariosValues[0];
          const rows = comentariosValues.slice(1);
          comentarios = rows.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header: string, i: number) => {
              obj[header] = row[i] || "";
            });
            return obj;
          });
        }
      } else {
        // La pestaña "Comentarios" probablemente no existe aún - no es un error fatal
        console.warn("[SHEETS_API] Pestaña Comentarios no encontrada, devolviendo vacío.");
      }
    } catch (comentariosErr) {
      console.warn("[SHEETS_API] Error al obtener Comentarios:", comentariosErr);
    }

    return NextResponse.json({ leads, comentarios });
  } catch (error: any) {
    console.error("[SHEETS_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno conectando con Google Sheets", details: error.message },
      { status: 500 }
    );
  }
}
