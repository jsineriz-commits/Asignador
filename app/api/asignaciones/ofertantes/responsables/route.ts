import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google-jwt";
import { fetchSheetRange } from "@/lib/sheets-fetch";

const OFERTANTES_SHEET_ID = "1gP6cckD44ZS5CjZPsYYqGYU0rnQqztYFFFEm22nQU_4";

export async function GET() {
  try {
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

    const values = await fetchSheetRange(token, OFERTANTES_SHEET_ID, "responsables!A:Z");

    if (values.length < 2) {
      return NextResponse.json({ responsables: [] });
    }

    const headers = values[0].map((h) => h.trim().toLowerCase());
    const nombreIdx = headers.findIndex((h) =>
      h.includes("nombre") || h.includes("name")
    );
    const mailIdx = headers.findIndex((h) =>
      h.includes("mail") || h.includes("email") || h.includes("correo")
    );

    if (nombreIdx === -1 || mailIdx === -1) {
      // Fallback: asumir col A = nombre, col B = mail
      const responsables = values.slice(1).map((row) => ({
        nombre: row[0] ?? "",
        mail: row[1] ?? "",
      })).filter((r) => r.nombre || r.mail);
      return NextResponse.json({ responsables });
    }

    const responsables = values.slice(1).map((row) => ({
      nombre: row[nombreIdx] ?? "",
      mail: row[mailIdx] ?? "",
    })).filter((r) => r.nombre || r.mail);

    return NextResponse.json({ responsables });
  } catch (error: any) {
    console.error("[RESPONSABLES_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error cargando responsables", details: error.message },
      { status: 500 }
    );
  }
}
