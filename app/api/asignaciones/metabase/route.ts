import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { METABASE_URL, METABASE_USERNAME, METABASE_PASSWORD } = process.env;

    if (!METABASE_URL || !METABASE_USERNAME || !METABASE_PASSWORD) {
      return NextResponse.json(
        { error: "Faltan credenciales de Metabase en .env.local" },
        { status: 500 }
      );
    }

    // 1. Obtener Session Token
    console.log(`[METABASE] Iniciando sesión en: ${METABASE_URL}`);
    const sessionRes = await fetch(`${METABASE_URL}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: METABASE_USERNAME,
        password: METABASE_PASSWORD,
      }),
      cache: "no-store",
    });

    if (!sessionRes.ok) {
      const errorText = await sessionRes.text();
      console.error(`[METABASE] Error de sesión: ${sessionRes.status}`, errorText);
      throw new Error(`Error autenticando en Metabase: ${sessionRes.statusText}`);
    }

    const sessionData = await sessionRes.json();
    const sessionId = sessionData.id;
    console.log("[METABASE] Sesión obtenida con éxito.");

    // 2. Definir función para consultar Questions/Cards
    const fetchCard = async (cardId: number) => {
      console.log(`[METABASE] Solicitando Card ${cardId}...`);
      const startTime = Date.now();
      try {
        const res = await fetch(`${METABASE_URL}/api/card/${cardId}/query/json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Metabase-Session": sessionId,
          },
          cache: "no-store",
        });
        
        if (!res.ok) {
          const errText = await res.text();
          console.error(`[METABASE] Error en Card ${cardId}: ${res.status}`, errText);
          throw new Error(`Metabase error en Card ${cardId}`);
        }
        
        const json = await res.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[METABASE] Card ${cardId} recibida con éxito (${duration}s).`);
        return json;
      } catch (err) {
        console.error(`[METABASE] Excepción en Card ${cardId}:`, err);
        throw err;
      }
    };

    // 3. Ejecutar consultas de forma SECUENCIAL para evitar ETIMEDOUT con archivos grandes (20MB+)
    console.log("[METABASE] Ejecutando consultas de Cards 130, 153, 154 de forma secuencial...");
    const transaccionesRaw = await fetchCard(130);
    const historialRaw = await fetchCard(153);
    const sociedadesRaw = await fetchCard(154);

    console.log(`[METABASE] Datos cargados: Transacciones=${transaccionesRaw.length}, Historial=${historialRaw.length}, Sociedades=${sociedadesRaw.length}`);

    const data = {
      transacciones: transaccionesRaw,
      historialAsignaciones: historialRaw,
      maestroSociedades: sociedadesRaw,
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[METABASE_API_ERROR_FULL]", error);
    return NextResponse.json(
      { 
        error: "Error interno conectando con Metabase", 
        details: error.message,
        cause: error.cause ? String(error.cause) : undefined 
      },
      { status: 500 }
    );
  }
}
