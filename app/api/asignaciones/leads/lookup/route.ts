import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google-jwt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const acEmail = body.acEmail;
    
    // Suport backwards compatibility: if no searchType/query, fall back to cuit
    const searchType = body.searchType || "cuit";
    const query = body.query || body.cuit;
    const isRazonSocial = searchType === "razon_social";
    const isNombreApellido = searchType === "nombre_apellido";

    if (!query || !acEmail) {
      return NextResponse.json(
        { error: "Faltan parámetros de búsqueda o acEmail" },
        { status: 400 }
      );
    }

    const searchStr = String(query);
    const cleanCuit = searchStr.replace(/\D/g, "");

    if ((isRazonSocial || isNombreApellido) && searchStr.length < 3) {
      return NextResponse.json(
        { error: "La búsqueda debe tener al menos 3 caracteres" },
        { status: 400 }
      );
    }
    if (!isRazonSocial && !isNombreApellido && cleanCuit.length !== 11) {
      return NextResponse.json(
        { error: "El CUIT debe tener 11 dígitos" },
        { status: 400 }
      );
    }

    // --- AUTENTICACIÓN GOOGLE SHEETS ---
    const {
      GOOGLE_SHEETS_ID,
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      BASE_CLAVE_SHEET_ID,
      BASE_CLAVE_SHEET_NAME,
    } = process.env;

    let googleSheetToken: string | null | undefined = null;

    if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY) {
      try {
        const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
        googleSheetToken = await getGoogleAccessToken(
          GOOGLE_SERVICE_ACCOUNT_EMAIL,
          privateKey,
          "https://www.googleapis.com/auth/spreadsheets.readonly"
        );
      } catch (err) {
        console.error("[SHEETS_AUTH_ERROR]", err);
      }
    }

    // --- PASO 1: Buscar en Google Sheets (CRM) --- (se omite para búsqueda por Nombre/Apellido)
    if (!isNombreApellido && GOOGLE_SHEETS_ID && googleSheetToken) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/Leads!A:M`;

        const sheetsRes = await fetch(url, {
          headers: {
            Authorization: `Bearer ${googleSheetToken}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (sheetsRes.ok) {
          const json = await sheetsRes.json();
          const rows = json.values || [];
          if (rows.length > 0) {
            const headers = rows[0].map((h: string) => String(h).trim().toLowerCase());
            const cuitIndex = headers.findIndex((h: string) => h.includes("cuit"));
            const rsIndex = headers.findIndex((h: string) => h.includes("razón social") || h.includes("razon social") || h.includes("razon_social"));
            
            const crmMatches = [];
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              let isMatch = false;
              
              if (!isRazonSocial && cuitIndex !== -1) {
                const rowCuit = String(row[cuitIndex] || "").replace(/\D/g, "");
                isMatch = rowCuit === cleanCuit;
              } else if (isRazonSocial && rsIndex !== -1) {
                const rowRs = String(row[rsIndex] || "").toLowerCase();
                isMatch = rowRs.includes(searchStr.toLowerCase());
              }

              if (isMatch) {
                const leadObj: Record<string, string> = {};
                headers.forEach((h: string, idx: number) => {
                  leadObj[h] = row[idx] || "";
                });
                leadObj.source = "crm";
                crmMatches.push(leadObj);
                
                // En modo CUIT rompemos al primer match
                if (!isRazonSocial) break;
              }
            }

            if (crmMatches.length > 0) {
              if (isRazonSocial) {
                return NextResponse.json({ source: "crm", searchType: "razon_social", data: crmMatches });
              } else {
                return NextResponse.json({ source: "crm", data: crmMatches[0] });
              }
            }
          }
        } else {
          console.error("[SHEETS_API_ERROR]", await sheetsRes.text());
        }
      } catch (err) {
        console.error("[SHEETS_ERROR]", err);
      }
    }

    // --- PASO 2: Buscar en Metabase ---
    const { METABASE_URL, METABASE_USERNAME, METABASE_PASSWORD } = process.env;

    if (METABASE_URL && METABASE_USERNAME && METABASE_PASSWORD) {
      try {
        // Authenticate
        const sessionRes = await fetch(`${METABASE_URL}/api/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: METABASE_USERNAME,
            password: METABASE_PASSWORD,
          }),
          cache: "no-store",
        });

        if (sessionRes.ok) {
          const { id: sessionId } = await sessionRes.json();

          // Fetch Question 183, 184, o 196
          const aborter = new AbortController();
          const timeoutId = setTimeout(() => aborter.abort(), 10000);

          let questionId: number;
          let metaParams: object[];

          if (isNombreApellido) {
            questionId = 196;
            metaParams = [
              {
                type: "category",
                target: ["variable", ["template-tag", "Apellido"]],
                value: searchStr,
              }
            ];
          } else if (isRazonSocial) {
            questionId = 184;
            metaParams = [
              {
                type: "category",
                target: ["variable", ["template-tag", "razon_social"]],
                value: `%${searchStr}%`,
              }
            ];
          } else {
            questionId = 183;
            metaParams = [
              {
                type: "category",
                target: ["variable", ["template-tag", "cuit"]],
                value: cleanCuit,
              }
            ];
          }

          const metaRes = await fetch(`${METABASE_URL}/api/card/${questionId}/query/json`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Metabase-Session": sessionId,
            },
            body: JSON.stringify({ parameters: metaParams }),
            signal: aborter.signal,
            cache: "no-store",
          });

          clearTimeout(timeoutId);

          if (metaRes.ok) {
            const data = await metaRes.json();
            if (Array.isArray(data) && data.length > 0) {
              const metaDataArray = data.map((result: any) => {
                const getField = (possibleKeys: string[]) => {
                  for (const pk of possibleKeys) {
                    const key = Object.keys(result).find(k => k.toLowerCase() === pk.toLowerCase());
                    if (key && result[key] !== null) return String(result[key]);
                  }
                  return "";
                };

                return {
                  cuit: getField(["cuit", "cuit_sociedad"]) || (isRazonSocial || isNombreApellido ? "" : cleanCuit),
                  razon_social: getField(["razon_social", "razón social"]),
                  id_usuario: getField(["id_usuario", "id cliente", "cliente"]),
                  nombre: getField(["nombre"]),
                  apellido: getField(["apellido"]),
                  email: getField(["email", "correo"]),
                  provincia: getField(["provincia", "provincia usuario"]),
                  partido: getField(["partido", "partido usuario"]),
                  telefono: getField(["telefono", "teléfono"]),
                  ofrecio: getField(["ofrecio", "ofreció"]),
                  oferto: getField(["oferto", "ofertó"]),
                  ultimo_ingreso: getField(["ultimo_ingreso", "último ingreso"]),
                  source: "metabase"
                };
              });

              if (metaDataArray.length > 0) {
                if (isRazonSocial || isNombreApellido) {
                  return NextResponse.json({ source: "metabase", searchType, data: metaDataArray });
                } else {
                  // CUIT mode expects array as well (the frontend handles array of metabase responses via modal if >1)
                  return NextResponse.json({ source: "metabase", data: metaDataArray });
                }
              }
            }
          } else {
            console.error(`[METABASE_API_ERROR] ${metaRes.status}`, await metaRes.text());
          }
        }
      } catch (err) {
        console.error("[METABASE_ERROR]", err);
      }
    }

    // --- PASO 3: Buscar en Base Clave --- (se omite para búsqueda por Nombre/Apellido)
    if (!isNombreApellido && BASE_CLAVE_SHEET_ID && BASE_CLAVE_SHEET_NAME && googleSheetToken) {
      try {
        const sheetNameEnc = encodeURIComponent(BASE_CLAVE_SHEET_NAME);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${BASE_CLAVE_SHEET_ID}/values/${sheetNameEnc}!A:Z`;

        const sheetsRes = await fetch(url, {
          headers: {
            Authorization: `Bearer ${googleSheetToken}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (sheetsRes.ok) {
          const json = await sheetsRes.json();
          const rows = json.values || [];
          if (rows.length > 0) {
            const headers = rows[0].map((h: string) => String(h).trim().toUpperCase());
            const cuitIndex = headers.findIndex((h: string) => h === "CUIT/L PRODUCTOR");
            const productorIndex = headers.findIndex((h: string) => h === "PRODUCTOR");
            const propietarioIndex = headers.findIndex((h: string) => h.includes("PROPIETARIO") && h.includes("ESTABLECIMIENTO"));
            const provinciaIndex = headers.findIndex((h: string) => h === "PROVINCIA PRODUCTOR");
            const partidoIndex = headers.findIndex((h: string) => h === "PARTIDO PRODUCTOR");
            const emailsIndex = headers.findIndex((h: string) => h === "MAILS PRODUCTOR");
            const telefonosIndex = headers.findIndex((h: string) => h === "TELEFONOS PRODUCTOR");
            
            const baseClaveMatches = [];
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              let isMatch = false;

              if (!isRazonSocial && cuitIndex !== -1) {
                const rowCuit = String(row[cuitIndex] || "").replace(/\D/g, "");
                isMatch = rowCuit === cleanCuit;
              } else if (isRazonSocial && productorIndex !== -1) {
                const rowRs = String(row[productorIndex] || "").toLowerCase();
                isMatch = rowRs.includes(searchStr.toLowerCase());
              }

              if (isMatch) {
                baseClaveMatches.push({
                  cuit: cuitIndex !== -1 ? String(row[cuitIndex] || "").replace(/\D/g, "") : (isRazonSocial ? "" : cleanCuit),
                  razon_social: row[productorIndex] || "",
                  id_usuario: "",
                  nombre: propietarioIndex !== -1 ? (row[propietarioIndex] || row[productorIndex] || "") : (row[productorIndex] || ""),
                  apellido: "",
                  email: (row[emailsIndex] || "").split(" ")[0] || "",
                  provincia: row[provinciaIndex] || "",
                  partido: row[partidoIndex] || "",
                  telefono: (row[telefonosIndex] || "").split(" ")[0] || "",
                  source: "base_clave"
                });
                
                if (!isRazonSocial) break; // If CUIT, we only need the first or we can return array if we want. Wait, the frontend Base Clave handling accepts arrays.
              }
            }
            
            if (baseClaveMatches.length > 0) {
              if (isRazonSocial) {
                return NextResponse.json({ source: "base_clave", searchType: "razon_social", data: baseClaveMatches });
              } else {
                return NextResponse.json({ source: "base_clave", data: baseClaveMatches });
              }
            }
          }
        } else {
          console.error("[BASE_CLAVE_API_ERROR]", await sheetsRes.text());
        }
      } catch (err) {
        console.error("[BASE_CLAVE_ERROR]", err);
      }
    }

    // --- PASO 4: No encontrado ---
    return NextResponse.json({ source: "not_found", searchType, query: searchStr });

  } catch (error: any) {
    console.error("[LOOKUP_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno procesando la búsqueda", details: error.message },
      { status: 500 }
    );
  }
}
