import { NextResponse } from 'next/server';
import { getGoogleAccessToken } from '@/lib/google-jwt';

/**
 * GET /api/sociedades/crm-check?cuit=XXXXXXXXXXX
 * Busca el CUIT en la hoja "Leads" del CRM_v1 (col L = CUIT Sociedad, col C = AC asignado).
 * Devuelve { acEmail: string | null, leadId: string | null }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cuit = (searchParams.get('cuit') || '').replace(/\D/g, '');

    if (cuit.length !== 11) {
      return NextResponse.json({ error: 'CUIT inválido' }, { status: 400 });
    }

    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, CRM_V1_SHEET_ID } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !CRM_V1_SHEET_ID) {
      return NextResponse.json({ acEmail: null, leadId: null, error: 'Configuración faltante' });
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    );

    // Traer columnas A (Lead ID) y C (AC asignado) y L (CUIT Sociedad)
    // Leads!A:C + L — traemos A:M para cubrir col L (índice 11)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CRM_V1_SHEET_ID}/values/Leads!A:M`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[CRM_CHECK_ERROR]', text);
      return NextResponse.json({ acEmail: null, leadId: null });
    }

    const json = await res.json();
    const rows: string[][] = json.values || [];

    if (rows.length < 2) {
      return NextResponse.json({ acEmail: null, leadId: null });
    }

    // Fila 0 = encabezados
    // Col A = índice 0 (Lead ID)
    // Col C = índice 2 (AC asignado)
    // Col L = índice 11 (CUIT Sociedad)
    const COL_LEAD_ID = 0;
    const COL_AC      = 2;
    const COL_CUIT    = 11;

    let foundAc: string | null = null;
    let foundLeadId: string | null = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowCuit = String(row[COL_CUIT] || '').replace(/\D/g, '');
      if (rowCuit === cuit) {
        foundAc     = String(row[COL_AC]      || '').trim() || null;
        foundLeadId = String(row[COL_LEAD_ID] || '').trim() || null;
        break; // primer match (el más antiguo = lead original)
      }
    }

    return NextResponse.json({ acEmail: foundAc, leadId: foundLeadId });

  } catch (err: any) {
    console.error('[CRM_CHECK_ERROR]', err);
    return NextResponse.json({ acEmail: null, leadId: null, error: err.message });
  }
}
