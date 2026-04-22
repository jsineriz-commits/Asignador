# Contexto del Proyecto: Asignaciones Comerciales 🌾

Este documento consolida la arquitectura de datos, la estructura de las dependencias externas (Metabase y Google Sheets), y las definiciones necesarias para conectar nuestra aplicación con datos reales.

## 📡 Arquitectura de Datos: API Routes

La aplicación **Next.js (App Router)** funciona como orquestador usando `Route Handlers` (`/api/*`) para consumir fuentes externas seguras sin exponer credenciales en el cliente.
El cliente utilizará `SWR` o llamados nativos asíncronos para poblar el frontend de forma optimizada.

### 1. Metabase API (`/api/metabase`)
Punto único donde Next.js obtiene el Session Token y realiza múltiples llamados a los reportes.

#### Endpoints requeridos (Cards):
- **Card 130**: Transacciones y su estado operativo (Volumen operado). Requerido para ver "Cabezas Ofertadas", y "Estado (CONCRETADA)".
- **Card 153**: Historial de asignaciones. Relación Sociedad <-> AC. Incluye `id_sociedad`, `fecha_asignacion`, `AC` (Asesor Comercial), `cuit` y `modificado_por`.
- **Card 154**: Maestro de todas las Sociedades. Provee el nombre (razón social) y CUIT principal.

**Método de Auth esperado:**
Se requiere realizar POST a `{{URL}}/api/session` enviando `username` y `password` para obtener el ID de sesión. Ese ID se pasa en `headers: { 'X-Metabase-Session': 'TOKEN' }` a los endpoints de descarga JSON del Card (`/api/card/{id}/query/json`).

### 2. Google Sheets API (`/api/sheets`)
Base de datos CRM para mapear orígenes del Lead y gestiones comerciales (comentarios) que no pasan por Metabase (no transaccionales).

- **Fuente:** Se usará `google-auth-library`.
- **Hojas principales:**
    - **Leads:** Contiene `LeadID`, `CUIT Sociedad`, `Fuente`, `id_comercial`.
    - **Comentarios:** Contiene `ID Lead`, `Fecha`, `Comentario`.

---

## 🔗 Relaciones de Datos y Lógica de Negocio

El núcleo de la inteligencia de la aplicación reside en el cruce de datos entre Metabase (transaccional/asignaciones) y Google Sheets (CRM/gestión).

### 1. El Join Principal: CUIT de la Sociedad
La relación entre el **Historial de Asignaciones (Query 153)** y los **Leads de Google Sheets** se realiza a través del campo **CUIT**.

- **Key en Metabase:** Campo `cuit` en Query 153 o Query 154.
- **Key en Sheets:** Columna `CUIT Sociedad` en la pestaña "Leads".
- **Proceso de matching:** Se aplica una normalización eliminando caracteres no numéricos (guiones, espacios) antes de comparar para asegurar la integridad del cruce.

### 2. Lógica de "Silencio Comercial"
Esta es una de las métricas críticas del sistema. Identifica sociedades que han sido asignadas recientemente pero no están siendo gestionadas en el CRM.

1. **Identificación:** Se filtran asignaciones del **Card 153** que ocurrieron en los últimos 30 días.
2. **Cruce (Join):** Por cada asignación, se busca el Lead correspondiente en Sheets usando el **CUIT**.
3. **Validación de Gestión:** Se buscan comentarios vinculados a ese `LeadID` en la pestaña "Comentarios".
4. **Alerta:** Si no existen comentarios con fecha **posterior** a la `fecha_asignacion`, se considera un caso de "Silencio Comercial".

### 3. Clasificación de Asignaciones (NUEVA vs REASIGNACION)
Aunque Metabase devuelve una lista plana, la aplicación determina el tipo de asignación:
- **NUEVA:** Es la primera vez que la sociedad aparece en el historial cronológico.
- **REASIGNACION:** La sociedad ya tenía una asignación previa en una fecha anterior.

### 4. Lógica de "Búsqueda en Cascada" (Lookup de CUIT)
Para agilizar la creación de leads, el backend (`/api/leads/lookup`) implementa un patrón de búsqueda unificado en tres fuentes de datos, con prioridades estrictas:

1. **Paso 1: CRM (Google Sheets):** Verifica si el CUIT ya está cargado en el CRM leyendo `GOOGLE_SHEETS_ID`. Si existe, se recuperan y pre-cargan todos sus datos. Sirve principalmente para avisar si el contacto ya le pertenece a otro asesor asignado en la base de Leads y se carga en modo inyectado.
2. **Paso 2: Metabase:** Si el CUIT no está en el CRM, consulta mediante cURL a Metabase la Card 183. Retorna un set de datos normalizado. Si existe más de una coincidencia, despliega de cara al usuario un modal de selección.
3. **Paso 3: Base Clave (Google Sheets):** Agregada en Fase 2. Si no hay respuestas en Metabase, se revisa un padrón crudo de contingencia llamado `BASE_CLAVE_SHEET_NAME` utilizando `BASE_CLAVE_SHEET_ID`. Si bien tiene una estructura de columnas distinta (`PROPIETARIO ESTABLECIMIENTO`, `MAILS PRODUCTOR`), el backend las normaliza para compartan el mismo modelo exacto que Metabase. Dispone asimismo del modal selector.
4. **Paso 4: ManualFallback:** Si ninguna base tiene información, la app entrega el CUIT vacío dejando todos los componentes color naranja para que el usuario los tipee a mano.

Esta lógica es vital ya que los tokens de GoogleAuth se inicializan de forma temprana y se reutilizan tanto para el Paso 1 como el Paso 3, ganando eficiencia.

---

## 🏗️ Robustez y Límites de la API (Hybrid Maestro)

Un aspecto crítico de la arquitectura es el manejo de los límites impuestos por la API de Metabase y la consistencia entre reportes.

### 1. El Límite de Exportación de Metabase
La API de Metabase (`/api/card/:id/query/json`) tiene un límite predeterminado (generalmente **2,000 filas**) para las exportaciones. Si el Maestro de Sociedades (Card 154) supera este número, gran parte de la base de datos no llegará al frontend, causando errores de "Sociedad no encontrada".

### 2. Solución: Maestro Híbrido (Harvesting)
Para garantizar el funcionamiento del 100% de las sociedades visibles en el Monitor, la aplicación implementa una estrategia de **"Maestro Híbrido"** en `src/lib/useData.ts`:

1. **Carga Base:** Se procesa la Card 154 (Maestro Oficial) como fuente primaria.
2. **Cosecha (Harvesting):** Se recorre el Historial de Asignaciones (Card 153) y las Transacciones (Card 130). 
3. **Fusión:** Si un CUIT presente en la actividad (153/130) no se encuentra en el listado truncado de la Card 154, el sistema crea un registro **sintético** con los datos disponibles (Razón Social y CUIT).
4. **Identificador Único:** Se utiliza el **CUIT Normalizado** como clave única en un `Map` para fusionar todas las fuentes sin duplicados.

### 3. Join Agnóstico a Mayúsculas/Minúsculas
Debido a que Metabase puede devolver nombres de campos inconsistentes (ej: `id` vs `ID`, `cuit` vs `CUIT`), la aplicación aplica una normalización exhaustiva durante la carga:
- Todas las propiedades críticas se mapean a minúsculas en el objeto `SociedadRaw`.
- Las comparaciones siempre se realizan sobre valores normalizados mediante las utilidades `normalizeNumeric` (para CUITs) y `normalizeId`.

---

## 🔐 Variables de Entorno y Configuración (`.env.local`)

Para que el servidor se conecte exitosamente a las fuentes, deberás crear el archivo `.env.local` en la raíz de tu proyecto e ingresar:

```ini
# --- METABASE ---
METABASE_URL=https://tu-sitio.metabaseapp.com
METABASE_USERNAME=tu_email@empresa.com
METABASE_PASSWORD=tu_password_seguro

# --- GOOGLE SHEETS ---
GOOGLE_SHEETS_ID=xxx
BASE_CLAVE_SHEET_ID=xxx
BASE_CLAVE_SHEET_NAME="Base Cruda"

# --- GOOGLE SERVICE ACCOUNT ---
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-servicio@appspot.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...----END PRIVATE KEY-----\n"
```
