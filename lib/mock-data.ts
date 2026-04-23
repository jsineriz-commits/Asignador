// ============================================================
// MOCK DATA - Estructura exacta de las fuentes reales
// ============================================================

// ---- Question 130: Transacciones (Metabase) ----------------
export interface Transaccion {
  id_sociedad: string;
  cabezas_ofrecidas: number;
  cabezas_ofertadas: number;
  fecha_operacion: string; // ISO date string
  ESTADO: "CONCRETADA" | "NO CONCRETADA" | "PUBLICADO" | "FINALIZADO";
  UN: "Faena" | "Mercado" | "Invernada" | "Invernada NEO" | "Cria";
}

// ---- Question 153: Historial de Asignaciones (Metabase) ----
export interface HistorialAsignacion {
  id_sociedad: string;
  fecha_asignacion: string;
  AC: string;
  tipo: "NUEVA" | "REASIGNACION";
  modificado_por?: string;
  cuit?: string;
  razon_social?: string;
}

// ---- Question 154: Maestro de Sociedades (Metabase) --------
export interface Sociedad {
  id: string;
  razon_social: string;
  asociado_comercial: string;
  UN: string;
  cuit?: string;
  id_ac?: string;
  fecha_creacion?: string;
}

// ---- Google Sheets / Leads ---------------------------------
export interface Lead {
  LeadID?: string;
  "CUIT Sociedad"?: string;
  id_sociedad: string;
  id_comercial: string;
  fecha_contacto: string;
  Fuente:
    | "Referido"
    | "Llamada Fría"
    | "Reasignación Interna"
    | "Feria/Evento"
    | "Web"
    | "Sin Contacto";
}

export interface Comentario {
  "ID Lead"?: string;
  Fecha?: string;
  [key: string]: any;
}

// ============================================================
// DATA
// ============================================================

export const mockSociedades: Sociedad[] = [
  { id: "SOC001", razon_social: "Estancia El Ombú S.A.", asociado_comercial: "Lucas Fernández", UN: "Faena", cuit: "30-11111111-1" },
  { id: "SOC002", razon_social: "Agropecuaria Don Pedro", asociado_comercial: "Martina Gómez", UN: "Invernada", cuit: "30-22222222-2" },
  { id: "SOC003", razon_social: "Los Alamos Agro SRL", asociado_comercial: "Carlos Ruiz", UN: "Cria", cuit: "30-33333333-3" },
  { id: "SOC004", razon_social: "Campo Verde Inversiones", asociado_comercial: "Lucas Fernández", UN: "Mercado" },
  { id: "SOC005", razon_social: "Tambos del Sur", asociado_comercial: "Valeria Torres", UN: "Faena" },
  { id: "SOC006", razon_social: "El Rincón de los Andes", asociado_comercial: "Martina Gómez", UN: "Invernada NEO" },
  { id: "SOC007", razon_social: "Hacienda Santa Rosa", asociado_comercial: "Carlos Ruiz", UN: "Faena" },
  { id: "SOC008", razon_social: "Agro Norte Chaqueño", asociado_comercial: "Lucas Fernández", UN: "Cria" },
  { id: "SOC009", razon_social: "Puesto La Esperanza", asociado_comercial: "Valeria Torres", UN: "Invernada" },
  { id: "SOC010", razon_social: "Ganadería del Litoral", asociado_comercial: "Diego Méndez", UN: "Faena" },
  { id: "SOC011", razon_social: "Finca Los Quebrachos", asociado_comercial: "Diego Méndez", UN: "Mercado" },
  { id: "SOC012", razon_social: "La Rinconada LTDA", asociado_comercial: "Martina Gómez", UN: "Faena", cuit: "30-99999999-9" },
  { id: "SOC013", razon_social: "Campos Maduros S.A.", asociado_comercial: null as unknown as string, UN: "Cria" },
  { id: "SOC014", razon_social: "El Paraíso Agropecuario", asociado_comercial: null as unknown as string, UN: "Invernada" },
  { id: "SOC015", razon_social: "Cereales del Centro", asociado_comercial: "Valeria Torres", UN: "Faena" },
];

export const ASOCIADOS_COMERCIALES = [
  "Lucas Fernández",
  "Martina Gómez",
  "Carlos Ruiz",
  "Valeria Torres",
  "Diego Méndez",
];

export const mockTransacciones: Transaccion[] = [
  // SOC001 - El Ombú
  { id_sociedad: "SOC001", cabezas_ofrecidas: 120, cabezas_ofertadas: 100, fecha_operacion: "2024-08-15", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC001", cabezas_ofrecidas: 80, cabezas_ofertadas: 70, fecha_operacion: "2024-09-10", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC001", cabezas_ofrecidas: 50, cabezas_ofertadas: 50, fecha_operacion: "2024-10-05", ESTADO: "NO CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC001", cabezas_ofrecidas: 200, cabezas_ofertadas: 180, fecha_operacion: "2024-11-20", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC001", cabezas_ofrecidas: 150, cabezas_ofertadas: 140, fecha_operacion: "2024-12-18", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC001", cabezas_ofrecidas: 90, cabezas_ofertadas: 85, fecha_operacion: "2025-01-22", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC001", cabezas_ofrecidas: 110, cabezas_ofertadas: 105, fecha_operacion: "2025-02-14", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC001", cabezas_ofrecidas: 175, cabezas_ofertadas: 160, fecha_operacion: "2025-03-10", ESTADO: "CONCRETADA", UN: "Faena" },

  // SOC002 - Don Pedro
  { id_sociedad: "SOC002", cabezas_ofrecidas: 300, cabezas_ofertadas: 280, fecha_operacion: "2024-09-05", ESTADO: "CONCRETADA", UN: "Invernada" },
  { id_sociedad: "SOC002", cabezas_ofrecidas: 250, cabezas_ofertadas: 0, fecha_operacion: "2024-11-01", ESTADO: "NO CONCRETADA", UN: "Invernada" },
  { id_sociedad: "SOC002", cabezas_ofrecidas: 320, cabezas_ofertadas: 310, fecha_operacion: "2025-01-15", ESTADO: "CONCRETADA", UN: "Invernada" },
  { id_sociedad: "SOC002", cabezas_ofrecidas: 190, cabezas_ofertadas: 185, fecha_operacion: "2025-03-08", ESTADO: "CONCRETADA", UN: "Invernada" },

  // SOC004 - Campo Verde
  { id_sociedad: "SOC004", cabezas_ofrecidas: 450, cabezas_ofertadas: 420, fecha_operacion: "2024-07-20", ESTADO: "CONCRETADA", UN: "Mercado" },
  { id_sociedad: "SOC004", cabezas_ofrecidas: 380, cabezas_ofertadas: 370, fecha_operacion: "2024-10-15", ESTADO: "CONCRETADA", UN: "Mercado" },
  { id_sociedad: "SOC004", cabezas_ofrecidas: 500, cabezas_ofertadas: 490, fecha_operacion: "2025-02-28", ESTADO: "CONCRETADA", UN: "Mercado" },

  // SOC005 - Tambos del Sur
  { id_sociedad: "SOC005", cabezas_ofrecidas: 60, cabezas_ofertadas: 0, fecha_operacion: "2024-06-10", ESTADO: "NO CONCRETADA", UN: "Faena" },

  // SOC010 - Ganadería del Litoral
  { id_sociedad: "SOC010", cabezas_ofrecidas: 220, cabezas_ofertadas: 210, fecha_operacion: "2024-08-22", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC010", cabezas_ofrecidas: 180, cabezas_ofertadas: 175, fecha_operacion: "2024-11-30", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC010", cabezas_ofrecidas: 260, cabezas_ofertadas: 250, fecha_operacion: "2025-03-05", ESTADO: "CONCRETADA", UN: "Faena" },

  // Current month (2025-03)
  { id_sociedad: "SOC003", cabezas_ofrecidas: 140, cabezas_ofertadas: 130, fecha_operacion: "2025-03-12", ESTADO: "CONCRETADA", UN: "Cria" },
  { id_sociedad: "SOC007", cabezas_ofrecidas: 95, cabezas_ofertadas: 90, fecha_operacion: "2025-03-18", ESTADO: "CONCRETADA", UN: "Faena" },
  { id_sociedad: "SOC011", cabezas_ofrecidas: 310, cabezas_ofertadas: 300, fecha_operacion: "2025-03-20", ESTADO: "CONCRETADA", UN: "Mercado" },
  { id_sociedad: "SOC015", cabezas_ofrecidas: 75, cabezas_ofertadas: 70, fecha_operacion: "2025-03-25", ESTADO: "CONCRETADA", UN: "Faena" },
];

export const mockHistorialAsignaciones: HistorialAsignacion[] = [
  // SOC001 - Reasignación (punto crítico para el gráfico)
  { id_sociedad: "SOC001", fecha_asignacion: "2024-07-01", AC: "Diego Méndez", tipo: "NUEVA", modificado_por: "Sistema" },
  { id_sociedad: "SOC001", fecha_asignacion: "2024-10-15", AC: "Lucas Fernández", tipo: "REASIGNACION", modificado_por: "Admin Central" },

  // SOC002
  { id_sociedad: "SOC002", fecha_asignacion: "2024-08-01", AC: "Carlos Ruiz", tipo: "NUEVA", modificado_por: "Admin Central" },
  { id_sociedad: "SOC002", fecha_asignacion: "2025-01-10", AC: "Martina Gómez", tipo: "REASIGNACION", modificado_por: "Valeria Torres" },

  // SOC003
  { id_sociedad: "SOC003", fecha_asignacion: "2024-06-15", AC: "Carlos Ruiz", tipo: "NUEVA" },

  // SOC004
  { id_sociedad: "SOC004", fecha_asignacion: "2024-06-01", AC: "Lucas Fernández", tipo: "NUEVA" },

  // SOC005
  { id_sociedad: "SOC005", fecha_asignacion: "2024-05-20", AC: "Valeria Torres", tipo: "NUEVA" },

  // SOC006
  { id_sociedad: "SOC006", fecha_asignacion: "2024-07-10", AC: "Lucas Fernández", tipo: "NUEVA" },
  { id_sociedad: "SOC006", fecha_asignacion: "2024-09-01", AC: "Martina Gómez", tipo: "REASIGNACION" },

  // SOC007
  { id_sociedad: "SOC007", fecha_asignacion: "2024-11-05", AC: "Carlos Ruiz", tipo: "NUEVA" },

  // SOC008
  { id_sociedad: "SOC008", fecha_asignacion: "2024-12-01", AC: "Lucas Fernández", tipo: "NUEVA" },

  // SOC009
  { id_sociedad: "SOC009", fecha_asignacion: "2025-01-15", AC: "Valeria Torres", tipo: "NUEVA" },

  // SOC010
  { id_sociedad: "SOC010", fecha_asignacion: "2024-07-20", AC: "Diego Méndez", tipo: "NUEVA" },

  // SOC011
  { id_sociedad: "SOC011", fecha_asignacion: "2024-08-10", AC: "Diego Méndez", tipo: "NUEVA" },

  // SOC012
  { id_sociedad: "SOC012", fecha_asignacion: "2025-02-01", AC: "Martina Gómez", tipo: "NUEVA" },

  // SOC015
  { id_sociedad: "SOC015", fecha_asignacion: "2025-02-20", AC: "Valeria Torres", tipo: "NUEVA" },
];

export const mockLeads: Lead[] = [
  { id_sociedad: "SOC001", id_comercial: "LF", fecha_contacto: "2025-03-28", Fuente: "Referido" },
  { id_sociedad: "SOC002", id_comercial: "MG", fecha_contacto: "2025-03-15", Fuente: "Reasignación Interna" },
  { id_sociedad: "SOC003", id_comercial: "CR", fecha_contacto: "2025-03-20", Fuente: "Llamada Fría" },
  { id_sociedad: "SOC004", id_comercial: "LF", fecha_contacto: "2025-03-25", Fuente: "Referido" },
  { id_sociedad: "SOC005", id_comercial: "VT", fecha_contacto: "2024-12-10", Fuente: "Feria/Evento" },
  { id_sociedad: "SOC006", id_comercial: "MG", fecha_contacto: "2025-03-22", Fuente: "Reasignación Interna" },
  { id_sociedad: "SOC007", id_comercial: "CR", fecha_contacto: "2025-03-18", Fuente: "Llamada Fría" },
  { id_sociedad: "SOC008", id_comercial: "LF", fecha_contacto: "2025-03-10", Fuente: "Web" },
  { id_sociedad: "SOC009", id_comercial: "VT", fecha_contacto: "2025-03-05", Fuente: "Referido" },
  { id_sociedad: "SOC010", id_comercial: "DM", fecha_contacto: "2025-03-28", Fuente: "Feria/Evento" },
  { id_sociedad: "SOC011", id_comercial: "DM", fecha_contacto: "2025-03-22", Fuente: "Llamada Fría" },
  { id_sociedad: "SOC012", id_comercial: "MG", fecha_contacto: "2025-03-01", Fuente: "Web" },
  { id_sociedad: "SOC013", id_comercial: "", fecha_contacto: "2024-11-15", Fuente: "Sin Contacto" },
  { id_sociedad: "SOC014", id_comercial: "", fecha_contacto: "2024-10-20", Fuente: "Sin Contacto" },
  { id_sociedad: "SOC015", id_comercial: "VT", fecha_contacto: "2025-03-12", Fuente: "Referido" },
];
