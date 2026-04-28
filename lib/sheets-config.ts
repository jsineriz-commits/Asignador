/**
 * Configuración de Google Sheets IDs — no son secretos, son identificadores públicos.
 * Las credenciales de autenticación (service account) sí van en variables de entorno.
 */

// ── Módulo Asignaciones Comerciales ─────────────────────────────────────────
/** CRM principal: pestañas Leads, Comentarios, Tareas */
export const CRM_SHEET_ID = "1scua91uX0cgVAQC8-cUXz1DYn7xhaziHxKYkV5O1VEE";

/** Base Clave: lookup de sociedades */
export const BASE_CLAVE_SHEET_ID = "1tvbOhTBnt1is3V-TYdhU1Ijq-AGAi_cTjbwi7heoB_U";
export const BASE_CLAVE_SHEET_NAME = "Base Cruda";

/** GNS Ofertantes CRM (mismo que CRM_SHEET_ID) */
export const GNS_CRM_SHEET_ID = CRM_SHEET_ID;

/** GNS Ofertantes Mirror (fuente de datos de ofertantes) */
export const GNS_MIRROR_SHEET_ID = "1gP6cckD44ZS5CjZPsYYqGYU0rnQqztYFFFEm22nQU_4";

// ── Módulo Gestión de Sociedades ─────────────────────────────────────────────
/** Sheet principal de Gestión: zonas, GADM, exportaciones */
export const SOCIEDADES_SHEET_ID = "1KfqTwP2hdeqF_FZSmEEniP1tLvqve8t3p3ZgrUWnk4k";
