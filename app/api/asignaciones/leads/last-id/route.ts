import { NextResponse } from "next/server";
import { CRM_SHEET_ID, GNS_CRM_SHEET_ID, GNS_MIRROR_SHEET_ID } from "@/lib/sheets-config";
import { getGoogleAccessToken } from "@/lib/google-jwt";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get("prefix");
    const sheetParam = searchParams.get("sheet") || "leads";
    const sheetName = sheetParam.toLowerCase() === "tareas" ? "Tareas" : "Leads";

    if (!prefix) {
      return NextResponse.json({ error: "Falta el parÃ¡metro prefix" }, { status: 400 });
    }

    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
    } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
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
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CRM_SHEET_ID}/values/${sheetName}!A2:A`;

    const sheetsRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!sheetsRes.ok) {
      throw new Error("Error obteniendo IDs de Google Sheets");
    }

    const json = await sheetsRes.json();
    const rows = json.values || [];

    let maxNumber = 0;
    
    // Scan all values in column A
    for (const row of rows) {
      const idVal = row[0] ? String(row[0]).trim().toUpperCase() : "";
      if (idVal.startsWith(prefix.toUpperCase())) {
        const numPart = idVal.substring(prefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNumber) {
          maxNumber = parsed;
        }
      }
    }

    return NextResponse.json({ maxNumber });

  } catch (error: any) {
    console.error("[LAST_ID_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno calculando el Ãºltimo ID", details: error.message },
      { status: 500 }
    );
  }
}

