import { NextResponse } from 'next/server';
import { getGoogleAccessToken } from '@/lib/google-jwt';

/**
 * POST /api/sociedades/guardar-lead
 * Escribe una fila de lead en la primera fila vacía de la hoja "Leads" del CRM_v1.
 *
 * Mapa de columnas:
 *   A  = LeadID      B  = Fecha       C  = AC           D  = Fuente
 *   E  = Nombre      F  = Apellido    G  = ID Cliente   H  = Provincia
 *   I  = Partido     J  = Teléfono    K  = Email        L  = CUIT
 *   M  = RazonSocial
 *   N-V = vacíos (9 cols)
 *   W  = Comentario
 *   X-AD = vacíos (7 cols)
 *   AE = Creado Por
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      leadId, fecha, acEmail, fuente,
      nombre, apellido, idCliente, provincia, partido,
      telefono, email, cuit, razonSocial,
      comentario, creadoPor,
    } = body;

    if (!leadId || !acEmail || !cuit) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: leadId, acEmail, cuit' },
        { status: 400 }
      );
    }

    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, CRM_V1_SHEET_ID } = process.env;
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !CRM_V1_SHEET_ID) {
      return NextResponse.json({ error: 'Configuración faltante en el servidor' }, { status: 500 });
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

    // Scope de escritura (no readonly)
    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      'https://www.googleapis.com/auth/spreadsheets'
    );

    // Fila con 31 valores: A (índice 0) … AE (índice 30)
    const row = [
      leadId,           // A  (0)
      fecha,            // B  (1)
      acEmail,          // C  (2)
      fuente || '',     // D  (3)
      nombre || '',     // E  (4)
      apellido || '',   // F  (5)
      idCliente || '',  // G  (6)
      provincia || '',  // H  (7)
      partido || '',    // I  (8)
      telefono || '',   // J  (9)
      email || '',      // K  (10)
      cuit,             // L  (11)
      razonSocial || '',// M  (12)
      '', '', '', '', '', '', '', '', '', // N-V (13-21) — 9 vacíos
      comentario || '', // W  (22)
      '', '', '', '', '', '', '', // X-AD (23-29) — 7 vacíos
      creadoPor || '',  // AE (30)
    ];

    // values.append encuentra automáticamente la primera fila vacía y añade
    const appendUrl =
      `https://sheets.googleapis.com/v4/spreadsheets/${CRM_V1_SHEET_ID}` +
      `/values/Leads!A:AE:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
      cache: 'no-store',
    });

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      console.error('[GUARDAR_LEAD_ERROR]', errText);
      return NextResponse.json(
        { error: 'Error al escribir en Google Sheets', details: errText },
        { status: 500 }
      );
    }

    const result = await appendRes.json();
    const updatedRange = result.updates?.updatedRange || 'desconocido';
    return NextResponse.json({ ok: true, range: updatedRange, leadId });

  } catch (err: any) {
    console.error('[GUARDAR_LEAD_ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
