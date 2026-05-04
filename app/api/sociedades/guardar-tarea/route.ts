import { NextResponse } from 'next/server';
import { getGoogleAccessToken } from '@/lib/google-jwt';

/**
 * POST /api/sociedades/guardar-tarea
 * Escribe una fila de tarea en la primera fila vacía de la hoja "Tareas" del CRM_v1.
 *
 * Mapa de columnas:
 *   A  = ID Tarea     B  = ID Lead      C  = Título Lead   D  = AC Asignado
 *   E  = Tarea        F  = Fecha        G  = Estado        H  = Comentario
 *   I  = Creado Por   J  = Notificado   K  = PNR           L  = Tipo
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      idTarea, idLead, tituloLead, acAsignado,
      tarea, fecha, estado,
      creadoPor, tipo,
    } = body;

    if (!idTarea || !idLead || !acAsignado) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: idTarea, idLead, acAsignado' },
        { status: 400 }
      );
    }

    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, CRM_V1_SHEET_ID } = process.env;
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !CRM_V1_SHEET_ID) {
      return NextResponse.json({ error: 'Configuración faltante en el servidor' }, { status: 500 });
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

    const token = await getGoogleAccessToken(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey,
      'https://www.googleapis.com/auth/spreadsheets'
    );

    // Fila con 12 valores: A (0) … L (11)
    const row = [
      idTarea,           // A  (0)  ID Tarea
      idLead,            // B  (1)  ID Lead
      tituloLead || '',  // C  (2)  Título Lead
      acAsignado,        // D  (3)  AC Asignado
      tarea || '',       // E  (4)  Tarea
      fecha || '',       // F  (5)  Fecha
      estado || 'Pendiente', // G (6)  Estado
      '',                // H  (7)  Comentario (vacío — se llena desde la hoja)
      creadoPor || '',   // I  (8)  Creado Por
      '',                // J  (9)  Notificado (se maneja automáticamente)
      '',                // K  (10) PNR
      tipo || '',        // L  (11) Tipo
    ];

    const range = encodeURIComponent('Tareas!A:L');
    const appendUrl =
      `https://sheets.googleapis.com/v4/spreadsheets/${CRM_V1_SHEET_ID}` +
      `/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

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
      console.error('[GUARDAR_TAREA_ERROR]', errText);
      return NextResponse.json(
        { error: 'Error al escribir en Google Sheets (Tareas)', details: errText },
        { status: 500 }
      );
    }

    const result = await appendRes.json();
    const updatedRange = result.updates?.updatedRange || 'desconocido';
    return NextResponse.json({ ok: true, range: updatedRange, idTarea });

  } catch (err: any) {
    console.error('[GUARDAR_TAREA_ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
