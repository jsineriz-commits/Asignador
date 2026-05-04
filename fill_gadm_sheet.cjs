/**
 * fill_gadm_sheet.cjs — v2
 * 
 * Lee GADM-Match Deptos y Roster-Regiones, cruza con Metabase Q202,
 * y completa columnas F, G (cómo se escribe en Metabase/BC) y H, I (cómo está en Roster).
 * 
 * Regla: siempre buscar por PROV|DEPT (nunca por dept-only sin validar provincia).
 * Para los casos sin match automático, hay aliases manuales al final.
 * 
 * Uso:
 *   node fill_gadm_sheet.cjs             ← análisis (no escribe)
 *   node fill_gadm_sheet.cjs --write     ← escribe al sheet
 */

const { google } = require('googleapis');
const http = require('http');

// ── Configuración ─────────────────────────────────────────────────────────────
const SHEET_ID = '1KfqTwP2hdeqF_FZSmEEniP1tLvqve8t3p3ZgrUWnk4k';
const SA_EMAIL = 'sheets-bot@minuta-comercial.iam.gserviceaccount.com';
const SA_KEY   = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDWEvIJDAHLdQjC\nP6PO6hG2Dpqc2E8OckN6d4o5Iov82QAGsCf8dC94pstkWKUjWeuyoerOssn7mhuv\n2xxkVBpFlyfKzaEE2IbcAKeEbqd7GdfPy9Lj3abJRgIoQE88DTw9ive3DeGgYGl6\nTVXPtFvix7Z1lr5U3obO+RsmYNocEwjw2ozzqD3htvuMa8xj4Nb57A1+e6WNLvwH\nKyihFubTMOT9/ZQGEHwab67kJMB6zaVSaFQuTzWEVYZUZwwWJ9oLBy+YQc6f0glm\ngLXgH1s9Up00TZ9WHFXeaNwonOvLscuyZM8ao6NgJMWvluk5FpakF5WUv8Hpb39S\nZaOTTM2jAgMBAAECggEAXw8TnfPQejWSeZtD1JY43iR3AI3G8S3JDAE4Bi3yhokf\ni1i+sMow6Dz8lScN0XhVAsIGn9lhepGQmNLNtTlpXxyDZXlQ9nNl0xyRRmvSgAXW\nQKYME/YxYS/utkv0Q0DHTra+T/FgjtQxEkd0AuLeaIHxYh7ZjpsvtomERlJ8lzkG\nnr6+XlRDZDfS7I8RwEQxOtFDZ3bQkJ3hDNN2FdBYFRi540l9D5fE68CXJOYji+PJ\nQAs63M9hsS9EufQD2v9RgzeRjKsKKvbTIXbRONsmcdwFafXr0agufUMMfhvoeKho\nUJUqUNGwB/89HonWmhIv+yX6GDPvoAroIQZ79J1Q6QKBgQDxZ3+nMxkMTSQqVK44\nwZTLsUezv1PWL6MzN2JEuwZM8skLjlt7yvDpNepY4GI67YDRFTZ/vpCQJMj0mx54\n/93dK7lsSy8Cfb5mxIMWLPW8zzOyiu+l0YkClrQcoqkss1+1LVnBOujhdJKrtOR9\nzYN1F5I3gmzmQj9pM/YMnSOVGwKBgQDjBGxoEBptbNYjTTst1aB5zD8dddLPir11\nXipKBc8H2atDhVujVqDFsahcgb6+cwsLncreWIKd2xU3DsBFFfQFX8M/BYPdNAkR\nyny7RHpdze1PIUX2G8HazLaaHi1cQgyg8jmM8Z4m0V34e6iLQbHtnTM3aHdN/nlJ\nlcx0CHOaGQKBgGAimniIZdo7QkLFVFhv5wSzRd20PPvYHsL/tFewr1KngR7kA1Sq\nPgRxnzDjstrKyHj7XKfEySdOLuUSfTEsnDs+9WnGCyOP1epxKc8D+pzFW04n/EXp\nywlH4NRihsKxcFTjiZHlFubqGJrev/vFgyt3RphqjVmpWj1YHw1o6smvAoGAS5AP\nXVvuz/loFXwBdLIkpiXb5DxxnO87PLPJM7ZXQO+s196tr+KHxQXrWk89ZDr6tDUj\nb3rajxx7JUZdrSEvhhJn9LQrPhex5SAXAGY8rLh8gtg6Zz65+dAl/4qH4quBdJjr\nmwRZdeY+dxUB9sg5JzQp9glpnKZVTK71zLF7eRECgYA/aIKWCoVHf0xBZ/pYbLGs\nvV09VPgQ9zRXm6zMCFXZOWUJehR8OLzlcNAfXdfHjJM4nhZquxoPCiZf0Iu3+pSC\n4Bpecv5EDt6wHEVOcbwWUGd2r2ufPUkfwrEWZNo48zvHbuV9hRapAHW1+HF1QLJF\nVgehwxHxUT+EmcqNde3HNA==\n-----END PRIVATE KEY-----\n`;

const DO_WRITE = process.argv.includes('--write');

// ── Normalización estricta (sin tildes, uppercase) ────────────────────────────
function normSimple(s) {
  if (!s) return '';
  return s.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// ── Aliases manuales para los 27 casos sin match automático ──────────────────
// Formato: 'NORM_PROV|NORM_DEPTO_GADM' → { metaDept, metaProv, rosterDept, rosterProv }
// Dejar metaDept/metaProv vacío si no está en Metabase
// Fuente: conocimiento previo del proyecto + lógica de nombres
const MANUAL_ALIASES = {
  // Buenos Aires — nombres especiales
  'BUENOS AIRES|CORONEL DE MARINA LEONARDO ROSAL': { metaDept: 'Coronel Rosales', metaProv: 'Buenos Aires', rosterDept: 'CORONEL DE MARINA L ROSALES', rosterProv: 'BUENOS AIRES' },
  'BUENOS AIRES|GENERAL SARMIENTO':               { metaDept: '', metaProv: '', rosterDept: 'GENERAL SARMIENTO', rosterProv: 'BUENOS AIRES' },
  'BUENOS AIRES|LEANDRO N ALEM':                  { metaDept: 'Leandro N. Alem', metaProv: 'Buenos Aires', rosterDept: 'LEANDRO N. ALEM', rosterProv: 'BUENOS AIRES' },
  'BUENOS AIRES|SAN FERNANDO(1)':                 { metaDept: '', metaProv: '', rosterDept: 'SAN FERNANDO', rosterProv: 'BUENOS AIRES' },
  'BUENOS AIRES|SAN FERNANDO(2)':                 { metaDept: '', metaProv: '', rosterDept: 'SAN FERNANDO', rosterProv: 'BUENOS AIRES' },
  // Chaco
  'CHACO|MAYOR LUIS J FONTANA':                   { metaDept: 'Mayor Luis J. Fontana', metaProv: 'Chaco', rosterDept: 'MAYOR LUIS J. FONTANA', rosterProv: 'CHACO' },
  'CHACO|PRESIDENCIADELA PLAZA':                  { metaDept: 'Presidencia de la Plaza', metaProv: 'Chaco', rosterDept: 'PRESIDENCIA DE LA PLAZA', rosterProv: 'CHACO' },
  // Chubut
  'CHUBUT|RIOSENGUER':                            { metaDept: 'Río Senguer', metaProv: 'Chubut', rosterDept: 'RIO SENGUER', rosterProv: 'CHUBUT' },
  // CABA
  'CIUDAD DE BUENOS AIRES|DISTRITO FEDERAL':      { metaDept: '', metaProv: '', rosterDept: 'CIUDAD AUTONOMA DE BUENOS AIRES', rosterProv: 'CIUDAD AUTONOMA DE BUENOS AIRES' },
  // Córdoba — Ríos
  'CORDOBA|RIOCUARTO':                            { metaDept: 'Río Cuarto', metaProv: 'Córdoba', rosterDept: 'RIO CUARTO', rosterProv: 'CORDOBA' },
  'CORDOBA|RIOPRIMERO':                           { metaDept: 'Río Primero', metaProv: 'Córdoba', rosterDept: 'RIO PRIMERO', rosterProv: 'CORDOBA' },
  'CORDOBA|RIOSECO':                              { metaDept: 'Río Seco', metaProv: 'Córdoba', rosterDept: 'RIO SECO', rosterProv: 'CORDOBA' },
  'CORDOBA|RIOSEGUNDO':                           { metaDept: 'Río Segundo', metaProv: 'Córdoba', rosterDept: 'RIO SEGUNDO', rosterProv: 'CORDOBA' },
  // Corrientes
  'CORRIENTES|CURUZUCUATIA':                      { metaDept: 'Curuzú Cuatiá', metaProv: 'Corrientes', rosterDept: 'CURUZU CUATIA', rosterProv: 'CORRIENTES' },
  // Jujuy
  'JUJUY|VALLE GRAN DE':                          { metaDept: 'Valle Grande', metaProv: 'Jujuy', rosterDept: 'VALLE GRANDE', rosterProv: 'JUJUY' },
  // La Pampa
  'LA PAMPA|QUEMUQUEMU':                          { metaDept: 'Quemú Quemú', metaProv: 'La Pampa', rosterDept: 'QUEMU QUEMU', rosterProv: 'LA PAMPA' },
  // La Rioja
  'LA RIOJA|GENERAL ANGEL VICENTE PENALOZA':      { metaDept: 'General Ángel Vicente Peñaloza', metaProv: 'La Rioja', rosterDept: 'GENERAL ANGEL V. PEÑALOZA', rosterProv: 'LA RIOJA' },
  'LA RIOJA|GENERAL JUAN FACUNDO QUIROGA':        { metaDept: 'General Juan F. Quiroga', metaProv: 'La Rioja', rosterDept: 'GENERAL JUAN F. QUIROGA', rosterProv: 'LA RIOJA' },
  // Misiones
  'MISIONES|LEANDRO N ALEM':                      { metaDept: 'Leandro N. Alem', metaProv: 'Misiones', rosterDept: 'LEANDRO N. ALEM', rosterProv: 'MISIONES' },
  // Salta
  'SALTA|ROSARIODELA FRONTERA':                   { metaDept: 'Rosario de la Frontera', metaProv: 'Salta', rosterDept: 'ROSARIO DE LA FRONTERA', rosterProv: 'SALTA' },
  // Santa Cruz
  'SANTA CRUZ|RIOCHICO':                          { metaDept: 'Río Chico', metaProv: 'Santa Cruz', rosterDept: 'RIO CHICO', rosterProv: 'SANTA CRUZ' },
  // Santiago del Estero
  'SANTIAGO DEL ESTERO|JUAN FELIPE IBARRA':       { metaDept: 'Juan F. Ibarra', metaProv: 'Santiago del Estero', rosterDept: 'JUAN F. IBARRA', rosterProv: 'SANTIAGO DEL ESTERO' },
  'SANTIAGO DEL ESTERO|RIOHONDO':                 { metaDept: 'Río Hondo', metaProv: 'Santiago del Estero', rosterDept: 'RIO HONDO', rosterProv: 'SANTIAGO DEL ESTERO' },
  // Tierra del Fuego
  'TIERRA DEL FUEGO|RIOGRAN DE':                  { metaDept: 'Río Grande', metaProv: 'Tierra del Fuego', rosterDept: 'RIO GRANDE', rosterProv: 'TIERRA DEL FUEGO' },
  // Jujuy
  'JUJUY|CAPITAL':                                { metaDept: 'Capital', metaProv: 'Jujuy', rosterDept: 'CAPITAL', rosterProv: 'JUJUY' },
  // Tucumán
  'TUCUMAN|JUAN B ALBERDI':                       { metaDept: 'Juan Bautista Alberdi', metaProv: 'Tucumán', rosterDept: 'JUAN B. ALBERDI', rosterProv: 'TUCUMAN' },
  'TUCUMAN|RIOCHICO':                             { metaDept: 'Río Chico', metaProv: 'Tucumán', rosterDept: 'RIO CHICO', rosterProv: 'TUCUMAN' },
  'TUCUMAN|TAFIVIEJO':                            { metaDept: 'Tafí Viejo', metaProv: 'Tucumán', rosterDept: 'TAFI VIEJO', rosterProv: 'TUCUMAN' },
};

// ── Google Auth ───────────────────────────────────────────────────────────────
async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: SA_EMAIL, private_key: SA_KEY },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

async function readSheet(auth, sheetName) {
  const sheets = google.sheets({ version: 'v4', auth });
  const quoted = sheetName.includes(' ') ? `'${sheetName}'` : sheetName;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: quoted,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  return res.data.values || [];
}

async function fetchMapaData() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/api/sociedades/mapa-data', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data || []);
        } catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => reject(new Error('Timeout')));
  });
}

async function batchUpdateCells(auth, updates) {
  const sheets = google.sheets({ version: 'v4', auth });
  // Google Sheets API límite: 100 ranges por batchUpdate
  const CHUNK = 100;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: chunk.map(u => ({
          range: u.range,
          values: [u.values],
        })),
      },
    });
    console.log(`   ✅ Chunk ${Math.floor(i/CHUNK)+1}/${Math.ceil(updates.length/CHUNK)}: ${chunk.length} filas escritas`);
  }
}

async function main() {
  console.log('🔄 fill_gadm_sheet.cjs v2');
  console.log(`   Modo: ${DO_WRITE ? '📝 WRITE (escribe al sheet)' : '🔍 ANÁLISIS (usar --write para escribir)'}\n`);

  const auth = await getAuth();
  console.log('✅ Auth Google OK');

  // Leer sheets
  console.log('📋 Leyendo GADM - Match Deptos...');
  const gadmRows = await readSheet(auth, 'GADM - Match Deptos');
  console.log(`   ${gadmRows.length} filas`);

  console.log('📋 Leyendo Roster-Regiones...');
  const rosterRows = await readSheet(auth, 'Roster-Regiones');
  console.log(`   ${rosterRows.length} filas`);

  // Obtener datos Metabase
  console.log('📡 Obteniendo Metabase Q202...');
  let mapaData = [];
  try {
    mapaData = await fetchMapaData();
    console.log(`   ${mapaData.length} filas`);
  } catch (e) {
    console.warn(`   ⚠️  Sin mapa-data: ${e.message}`);
  }

  // ── Construir índice Roster: NORMPROV|NORMDEPT → { dept, prov } ─────────────
  // SOLO búsqueda por par prov+dept (nunca dept-only para evitar falsos positivos)
  const rosterByProvDept = new Map();
  for (let i = 1; i < rosterRows.length; i++) {
    const r = rosterRows[i];
    const prov = (r[0] || '').trim();
    const dept = (r[1] || '').trim();
    if (!prov || !dept) continue;
    const key = normSimple(prov) + '|' + normSimple(dept);
    if (!rosterByProvDept.has(key)) {
      rosterByProvDept.set(key, { dept, prov });
    }
  }
  console.log(`\n📊 Roster: ${rosterByProvDept.size} pares prov|dept`);

  // ── Construir índice Metabase: NORMPROV|NORMDEPT → { dept, prov } ───────────
  const metaByProvDept = new Map();
  for (const row of mapaData) {
    const prov = (row.provincia || '').trim();
    const dept = (row.partido_domicilio_est || '').trim();
    if (!prov || !dept) continue;
    const key = normSimple(prov) + '|' + normSimple(dept);
    if (!metaByProvDept.has(key)) {
      metaByProvDept.set(key, { dept, prov });
    }
  }
  console.log(`📊 Metabase Q202: ${metaByProvDept.size} pares prov|dept`);

  // Provincias únicas Metabase
  const metaProvs = [...new Set(mapaData.map(r => r.provincia).filter(Boolean))].sort();
  console.log(`   Provincias en Q202 (${metaProvs.length}): ${metaProvs.join(', ')}`);

  // ── Procesar cada fila GADM ──────────────────────────────────────────────────
  const updates = [];
  let alreadyFilled = 0, matched = 0, noMatch = 0;
  const noMatchList = [];
  const allChanges = [];

  for (let i = 1; i < gadmRows.length; i++) {
    const row = gadmRows[i];
    const provGadm = (row[0] || '').trim();
    const deptGadm = (row[1] || '').trim();
    const provNorm = (row[2] || '').trim();
    const deptNorm = (row[3] || '').trim();
    const fMeta   = (row[5] || '').trim();
    const gMeta   = (row[6] || '').trim();
    const hRoster = (row[7] || '').trim();
    const iRoster = (row[8] || '').trim();

    if (!provGadm && !deptGadm) continue;

    const hasMeta   = !!(fMeta && gMeta);
    const hasRoster = !!(hRoster && iRoster);

    if (hasMeta && hasRoster) { alreadyFilled++; continue; }

    const rowNum = i + 1;
    const lookupKey = provNorm + '|' + deptNorm;

    // 1. Buscar en aliases manuales primero
    const manual = MANUAL_ALIASES[lookupKey];

    // 2. Buscar en Metabase (solo si no tiene ya F/G)
    let metaMatch = hasMeta ? null : (manual && manual.metaDept ? manual : metaByProvDept.get(lookupKey));

    // 3. Buscar en Roster (solo si no tiene ya H/I)
    let rosterMatch = hasRoster ? null : (manual && manual.rosterDept ? manual : rosterByProvDept.get(lookupKey));

    // Calcular nuevos valores
    const newF = hasMeta    ? fMeta   : (metaMatch  ? (metaMatch.metaDept  || metaMatch.dept) : '');
    const newG = hasMeta    ? gMeta   : (metaMatch  ? (metaMatch.metaProv  || metaMatch.prov) : '');
    const newH = hasRoster  ? hRoster : (rosterMatch? (rosterMatch.rosterDept || rosterMatch.dept) : '');
    const newI = hasRoster  ? iRoster : (rosterMatch? (rosterMatch.rosterProv || rosterMatch.prov) : '');

    const anyChange = (newF !== fMeta) || (newG !== gMeta) || (newH !== hRoster) || (newI !== iRoster);

    if (!anyChange || (!newF && !newG && !newH && !newI)) {
      noMatch++;
      noMatchList.push({ rowNum, provGadm, deptGadm, provNorm, deptNorm });
    } else {
      matched++;
      allChanges.push({ rowNum, provNorm, deptNorm, newF, newG, newH, newI, metaFound: !!(metaMatch), rosterFound: !!(rosterMatch) });
      updates.push({
        range: `'GADM - Match Deptos'!F${rowNum}:I${rowNum}`,
        values: [newF, newG, newH, newI],
      });
    }
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN');
  console.log('='.repeat(80));
  console.log(`Ya completadas (F+G+H+I): ${alreadyFilled}`);
  console.log(`Listas para completar:    ${matched}`);
  console.log(`Sin match (quedan vacías): ${noMatch}`);

  if (noMatchList.length > 0) {
    console.log('\n⚠️  FILAS SIN MATCH AUTOMÁTICO (requieren revisión manual):');
    console.log('-'.repeat(80));
    for (const r of noMatchList) {
      console.log(`  Fila ${String(r.rowNum).padEnd(4)} | ${r.provNorm.padEnd(25)} | ${r.deptNorm}`);
    }
  }

  // Mostrar Catamarca específicamente
  const cataChanges = allChanges.filter(r => r.provNorm === 'CATAMARCA');
  if (cataChanges.length > 0) {
    console.log('\n🏔️  CATAMARCA (resumen):');
    console.log('-'.repeat(80));
    for (const r of cataChanges) {
      const meta   = r.metaFound   ? `Meta: "${r.newF}"/"${r.newG}"` : '❌ Sin datos en Metabase Q202';
      const roster = r.rosterFound ? `Roster: "${r.newH}"/"${r.newI}"` : '❌ Sin datos en Roster';
      console.log(`  Fila ${r.rowNum}: ${r.deptNorm}`);
      console.log(`    ${meta}`);
      console.log(`    ${roster}`);
    }
  }

  // Preview de los cambios
  console.log('\n✅ PREVIEW DE CAMBIOS (primeras 30 filas con cambio):');
  console.log('-'.repeat(110));
  console.log('Fila | Prov              | Depto                        | F (Meta Depto)         | G (Meta Prov)   | H (Roster Depto)       | I (Roster Prov)');
  console.log('-'.repeat(110));
  for (const r of allChanges.slice(0, 30)) {
    const line = [
      String(r.rowNum).padEnd(5),
      r.provNorm.padEnd(18),
      r.deptNorm.padEnd(29),
      r.newF.padEnd(23),
      r.newG.padEnd(16),
      r.newH.padEnd(23),
      r.newI,
    ].join(' | ');
    console.log(line);
  }
  if (allChanges.length > 30) {
    console.log(`  ... y ${allChanges.length - 30} filas más`);
  }

  console.log('\n' + '='.repeat(80));

  if (DO_WRITE && updates.length > 0) {
    console.log(`\n📝 Escribiendo ${updates.length} actualizaciones al sheet...`);
    await batchUpdateCells(auth, updates);
    console.log('\n🎉 ¡Sheet actualizado exitosamente!');
    console.log(`   https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=1599774941`);
  } else if (updates.length > 0) {
    console.log(`\n💡 Para escribir ${updates.length} cambios, correr:\n   node fill_gadm_sheet.cjs --write`);
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
