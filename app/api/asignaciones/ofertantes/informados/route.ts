import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google-jwt";

const OFERTANTES_SHEET_ID = "1gP6cckD44ZS5CjZPsYYqGYU0rnQqztYFFFEm22nQU_4";

export async function POST(req: Request) {
  try {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Faltan credenciales de Google en .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { cuit, responsable, motivo } = body as {
      cuit: string;
      responsable: string;
      motivo: string;
    };

    if (!cuit || !responsable || !motivo?.trim()) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: cuit, responsable, motivo" },
        { status: 400 }
      );
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      // Write scope (not readonly)
      "https://www.googleapis.com/auth/spreadsheets"
    );

    // Append a row to the "informados" sheet: A=cuit, B=responsable (mail), C=motivo
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${OFERTANTES_SHEET_ID}` +
      `/values/informados!A:C:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const appendRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[cuit, responsable, motivo.trim()]],
      }),
    });

    if (!appendRes.ok) {
      const body = await appendRes.text();
      throw new Error(`Sheets append error: ${appendRes.statusText} - ${body}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[INFORMADOS_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error guardando el registro", details: error.message },
      { status: 500 }
    );
  }
}

