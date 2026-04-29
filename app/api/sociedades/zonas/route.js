import { NextResponse } from 'next/server';
import { getSheetData } from '../../../../lib/sociedades/sheets.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

let cache = null;
let cacheTs = 0;
const TTL = 60 * 60 * 1000; // 1 hora

export async function GET() {
  try {
    if (cache && Date.now() - cacheTs < TTL) {
      return NextResponse.json(cache);
    }

    // Probar ambas variantes del nombre del tab
    let rows = await getSheetData('Roster-Regiones');
    if (!rows || rows.length < 2) rows = await getSheetData('roster-regiones');
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'Hoja Roster-Regiones no encontrada' }, { status: 500 });
    }

    const data = rows.slice(1); // skip header row 1

    // Columnas (0-based):
    // A=0 Provincia, B=1 Departamento, C=2 ID (DEPTO_ID), D=3 Zona (puede truncarse), E=4 Responsable depto
    // H=7 Zona COMPLETA (lista resumen), I=8 Deptos count, J=9 Base Operativa, K=10 ID zona, L=11 Responsable zona
    const iProvA=0, iDeptB=1, iIdC=2, iZonaD=3, iRespE=4;
    const iZonaH=7, iBaseJ=9, iRespL=11, iColorM=12;

    // â”€â”€ Paso 1: Zonas completas desde col H + responsable col L â”€â”€â”€â”€â”€â”€
    const zonasConResp = {}; // zona â†’ responsable
    const zonaBase     = {}; // zona â†’ base operativa
    const zonaColors   = {}; // zona â†’ color hex (col M)
    const zonasH       = [];
    data.forEach(row => {
      const z = String(row[iZonaH] || '').trim();
      const r = String(row[iRespL] || '').trim();
      const b = String(row[iBaseJ] || '').trim();
      const c = String(row[iColorM] || '').trim();
      if (z && !zonasConResp[z]) {
        zonasConResp[z] = r;
        zonaBase[z]     = b;
        if (c) zonaColors[z] = c.startsWith('#') ? c : '#' + c;
        zonasH.push(z);
      }
    });
    const zonasOrdenadas = [...new Set(zonasH)].filter(Boolean).sort();

    // â”€â”€ Paso 2: FunciÃ³n para resolver zona de col D â†’ nombre completo â”€â”€
    function resolveZona(rawD) {
      const z = String(rawD || '').trim();
      if (!z) return '';
      if (zonasConResp[z]) return z; // exacto
      const zUp = z.toUpperCase();
      let best = '', bestLen = 0;
      for (const zh of zonasOrdenadas) {
        const zhUp = zh.toUpperCase();
        if (zhUp.startsWith(zUp) || zUp.startsWith(zhUp)) {
          if (zhUp.length > bestLen) { best = zh; bestLen = zhUp.length; }
        }
      }
      return best || z;
    }

    // ── Función de normalización (strip acentos + uppercase, sin CamelCase split)
    // Debe coincidir con norm() de MapaTab.js para nombres de Roster-Regiones ya limpios
    function normKey(s) {
      return String(s || '').trim().toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
    }

    // ── Paso 3: deptoMap con PROV|DEPT como clave primaria ──────────────────────
    // Esto evita la colisión de depts homónimos en distintas provincias
    // (ej: "Veinticinco de Mayo" en Buenos Aires ≠ "Veinticinco de Mayo" en Río Negro)
    const deptoMap    = {};
    const idToZona    = {};
    const idToInfo    = {};
    const zonasSet    = new Set();

    data.forEach(row => {
      const prov = normKey(row[iProvA]);
      const dept = normKey(row[iDeptB]);
      const id   = Number(row[iIdC]) || null;
      const zona = resolveZona(row[iZonaD]);
      const resp = String(row[iRespE] || '').trim();

      if (!dept || !prov) return;

      const info = { id, provincia: prov, zona, responsable: resp };

      // Clave primaria: PROV|DEPT — siempre única (fix colisión)
      const compoundKey = prov + '|' + dept;
      deptoMap[compoundKey] = info;

      // Clave secundaria: dept-only — solo si no hay colisión previa
      // Permite lookups de compatibilidad para depts no ambiguos
      if (!deptoMap[dept]) deptoMap[dept] = info;

      if (id) {
        idToZona[id] = zona;
        idToInfo[id] = { provincia: prov, departamento: dept, zona, responsable: resp };
      }
      if (zona) zonasSet.add(zona);
    });

    // ── Alias CABA: GADM usa "CiudaddeBuenosAires"→"CIUDAD DE BUENOS AIRES"
    // y "DistritoFederal"→"DISTRITO FEDERAL", pero Roster usa provincia="CAPITAL FEDERAL" dept="CABA"
    const cabaEntry = deptoMap['CAPITAL FEDERAL|CABA'] || deptoMap['CABA'];
    if (cabaEntry) {
      deptoMap['CIUDAD DE BUENOS AIRES|DISTRITO FEDERAL'] = cabaEntry;
    }

    // ── Aliases: Q202 (Metabase) usa nombres distintos al Roster ─────────────────
    // Formato: deptoMap['PROV|NOMBRE_Q202'] = entrada del Roster (PROV|NOMBRE_ROSTER)
    // Cubre: números en palabras, nombres abreviados, diferencias de escritura.
    const deptoAliases = [
      // ── Buenos Aires ──
      // GADM y Roster: "GENERAL JUAN MADARIAGA" | Q202: "GENERAL MADARIAGA"
      ['BUENOS AIRES|GENERAL MADARIAGA',             'BUENOS AIRES|GENERAL JUAN MADARIAGA'],
      // GADM y Roster: "GENERAL LA MADRID" | Q202: "GENERAL LAMADRID"
      ['BUENOS AIRES|GENERAL LAMADRID',              'BUENOS AIRES|GENERAL LA MADRID'],
      // GADM y Roster: "ADOLFO GONZALES CHAVES" | Q202: "GONZALES CHAVES"
      ['BUENOS AIRES|GONZALES CHAVES',               'BUENOS AIRES|ADOLFO GONZALES CHAVES'],
      // Q202: "NUEVE DE JULIO" | Roster: "9 DE JULIO"
      ['BUENOS AIRES|NUEVE DE JULIO',                'BUENOS AIRES|9 DE JULIO'],
      // Q202: "VEINTICINCO DE MAYO" | Roster: "25 DE MAYO"
      ['BUENOS AIRES|VEINTICINCO DE MAYO',           'BUENOS AIRES|25 DE MAYO'],
      // Q202: "CORONEL BRANDSEN" | Roster: "BRANDSEN"
      ['BUENOS AIRES|CORONEL BRANDSEN',              'BUENOS AIRES|BRANDSEN'],
      // Q202: "AMEGHINO" | Roster: "FLORENTINO AMEGHINO"
      ['BUENOS AIRES|AMEGHINO',                      'BUENOS AIRES|FLORENTINO AMEGHINO'],
      // Q202: "CORONEL ROSALES" | Roster: "CORONEL DE MARINA L ROSALES"
      ['BUENOS AIRES|CORONEL ROSALES',               'BUENOS AIRES|CORONEL DE MARINA L ROSALES'],
      // ── Santa Fe ──
      // Q202: "NUEVE DE JULIO" | Roster: "9 DE JULIO"
      ['SANTA FE|NUEVE DE JULIO',                    'SANTA FE|9 DE JULIO'],
      // ── Chaco ──
      // Q202: "VEINTICINCO DE MAYO" | Roster: "25 DE MAYO"
      ['CHACO|VEINTICINCO DE MAYO',                  'CHACO|25 DE MAYO'],
      // Q202: "PRIMERO DE MAYO" | Roster: "1 DE MAYO"
      ['CHACO|PRIMERO DE MAYO',                      'CHACO|1 DE MAYO'],
      // Q202: "DOCE DE OCTUBRE" | Roster: "12 DE OCTUBRE"
      ['CHACO|DOCE DE OCTUBRE',                      'CHACO|12 DE OCTUBRE'],
      // Q202: "NUEVE DE JULIO" | Roster: "9 DE JULIO"
      ['CHACO|NUEVE DE JULIO',                       'CHACO|9 DE JULIO'],
      // ── Corrientes ──
      // Q202: "MBUCURUYA" (typo) | Roster: "MBURUCUYA"
      ['CORRIENTES|MBUCURUYA',                       'CORRIENTES|MBURUCUYA'],
      // ── La Pampa ──
      // Q202: "CHICALCO" | Roster: "CHICAL CO"
      ['LA PAMPA|CHICALCO',                          'LA PAMPA|CHICAL CO'],
      // ── Santiago del Estero ──
      // Q202: "LA BANDA" | Roster: "BANDA"
      ['SANTIAGO DEL ESTERO|LA BANDA',               'SANTIAGO DEL ESTERO|BANDA'],
      // ── Salta ──
      // Q202: "CANDELARIA" | Roster: "LA CANDELARIA"
      ['SALTA|CANDELARIA',                           'SALTA|LA CANDELARIA'],
      // Q202: "LA CAPITAL" | Roster: "CAPITAL"
      ['SALTA|LA CAPITAL',                           'SALTA|CAPITAL'],
      // ── La Rioja ──
      // GADM "SanBlasdelosSauces" → normGadm (sin LOS rule) → "SAN BLASDELOS SAUCES"
      ['LA RIOJA|SAN BLASDELOS SAUCES',              'LA RIOJA|SAN BLAS DE LOS SAUCES'],
    ];
    deptoAliases.forEach(([aliasKey, rosterKey]) => {
      if (deptoMap[rosterKey] && !deptoMap[aliasKey]) {
        deptoMap[aliasKey] = deptoMap[rosterKey];
      }
    });


    // â”€â”€ Paso 4: deptos agrupados por zona (usando nombres) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const zonaDeptos = {};
    Object.entries(deptoMap).forEach(([dept, info]) => {
      const z = info.zona;
      if (!z) return;
      if (!zonaDeptos[z]) zonaDeptos[z] = [];
      zonaDeptos[z].push(dept);
    });

    // â”€â”€ Paso 5: provincias Ãºnicas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const provincias = [...new Set(
      data.map(r => String(r[iProvA] || '').trim().toUpperCase()).filter(Boolean)
    )].sort();

    const result = {
      deptoMap,        // dept_name â†’ { id, provincia, zona, responsable }
      idToZona,        // DEPTO_ID â†’ zona (matching robusto)
      idToInfo,        // DEPTO_ID â†’ { provincia, departamento, zona, responsable }
      zonasConResp,    // zona â†’ responsable
      zonaBase,        // zona â†’ base operativa
      zonaColors,      // zona â†’ color hex (col M del Sheet)
      zonaDeptos,      // zona â†’ [dept_names]
      provincias,
      zonasOrdenadas,
    };

    cache = result;
    cacheTs = Date.now();

    console.log(`[/api/zonas] OK: ${Object.keys(deptoMap).length} deptos, ${Object.keys(idToZona).length} con ID, ${zonasOrdenadas.length} zonas`);
    return NextResponse.json(result);

  } catch (err) {
    console.error('[/api/zonas] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

