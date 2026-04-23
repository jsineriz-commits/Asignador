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

    // El Google Private Key suele venir con \n escapados desde un env, hay que reemplazarlo
    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");

    // Usamos nuestro helper nativo en vez de google-auth-library (que usa node-fetch y falla en RSC)
    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      "https://www.googleapis.com/auth/spreadsheets.readonly"
    );

    // Fetch Leads
    const leadsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CRM_SHEET_ID}/values/Leads!A:L`;
    const leadsRes = await fetch(leadsUrl, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!leadsRes.ok) {
      const body = await leadsRes.text();
      throw new Error(`Error en Sheets API (Leads): ${leadsRes.statusText} â€” ${body}`);
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

    // Fetch Comentarios â€” si la pestaÃ±a no existe, devolvemos array vacÃ­o sin romper todo
    let comentarios: any[] = [];
    try {
      const comentariosUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CRM_SHEET_ID}/values/Comentarios!A:G`;
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
        // La pestaÃ±a "Comentarios" probablemente no existe aÃºn â€” no es un error fatal
        console.warn("[SHEETS_API] PestaÃ±a Comentarios no encontrada, devolviendo vacÃ­o.");
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

