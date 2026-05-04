// check_and_fix.cjs
// Verifica el Roster para Catamarca y corrige la fila 142 (SantaMaría)
const { google } = require('googleapis');
const SA_EMAIL = 'sheets-bot@minuta-comercial.iam.gserviceaccount.com';
const SA_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDWEvIJDAHLdQjC\nP6PO6hG2Dpqc2E8OckN6d4o5Iov82QAGsCf8dC94pstkWKUjWeuyoerOssn7mhuv\n2xxkVBpFlyfKzaEE2IbcAKeEbqd7GdfPy9Lj3abJRgIoQE88DTw9ive3DeGgYGl6\nTVXPtFvix7Z1lr5U3obO+RsmYNocEwjw2ozzqD3htvuMa8xj4Nb57A1+e6WNLvwH\nKyihFubTMOT9/ZQGEHwab67kJMB6zaVSaFQuTzWEVYZUZwwWJ9oLBy+YQc6f0glm\ngLXgH1s9Up00TZ9WHFXeaNwonOvLscuyZM8ao6NgJMWvluk5FpakF5WUv8Hpb39S\nZaOTTM2jAgMBAAECggEAXw8TnfPQejWSeZtD1JY43iR3AI3G8S3JDAE4Bi3yhokf\ni1i+sMow6Dz8lScN0XhVAsIGn9lhepGQmNLNtTlpXxyDZXlQ9nNl0xyRRmvSgAXW\nQKYME/YxYS/utkv0Q0DHTra+T/FgjtQxEkd0AuLeaIHxYh7ZjpsvtomERlJ8lzkG\nnr6+XlRDZDfS7I8RwEQxOtFDZ3bQkJ3hDNN2FdBYFRi540l9D5fE68CXJOYji+PJ\nQAs63M9hsS9EufQD2v9RgzeRjKsKKvbTIXbRONsmcdwFafXr0agufUMMfhvoeKho\nUJUqUNGwB/89HonWmhIv+yX6GDPvoAroIQZ79J1Q6QKBgQDxZ3+nMxkMTSQqVK44\nwZTLsUezv1PWL6MzN2JEuwZM8skLjlt7yvDpNepY4GI67YDRFTZ/vpCQJMj0mx54\n/93dK7lsSy8Cfb5mxIMWLPW8zzOyiu+l0YkClrQcoqkss1+1LVnBOujhdJKrtOR9\nzYN1F5I3gmzmQj9pM/YMnSOVGwKBgQDjBGxoEBptbNYjTTst1aB5zD8dddLPir11\nXipKBc8H2atDhVujVqDFsahcgb6+cwsLncreWIKd2xU3DsBFFfQFX8M/BYPdNAkR\nyny7RHpdze1PIUX2G8HazLaaHi1cQgyg8jmM8Z4m0V34e6iLQbHtnTM3aHdN/nlJ\nlcx0CHOaGQKBgGAimniIZdo7QkLFVFhv5wSzRd20PPvYHsL/tFewr1KngR7kA1Sq\nPgRxnzDjstrKyHj7XKfEySdOLuUSfTEsnDs+9WnGCyOP1epxKc8D+pzFW04n/EXp\nywlH4NRihsKxcFTjiZHlFubqGJrev/vFgyt3RphqjVmpWj1YHw1o6smvAoGAS5AP\nXVvuz/loFXwBdLIkpiXb5DxxnO87PLPJM7ZXQO+s196tr+KHxQXrWk89ZDr6tDUj\nb3rajxx7JUZdrSEvhhJn9LQrPhex5SAXAGY8rLh8gtg6Zz65+dAl/4qH4quBdJjr\nmwRZdeY+dxUB9sg5JzQp9glpnKZVTK71zLF7eRECgYA/aIKWCoVHf0xBZ/pYbLGs\nvV09VPgQ9zRXm6zMCFXZOWUJehR8OLzlcNAfXdfHjJM4nhZquxoPCiZf0Iu3+pSC\n4Bpecv5EDt6wHEVOcbwWUGd2r2ufPUkfwrEWZNo48zvHbuV9hRapAHW1+HF1QLJF\nVgehwxHxUT+EmcqNde3HNA==\n-----END PRIVATE KEY-----\n`;
const SHEET_ID = '1KfqTwP2hdeqF_FZSmEEniP1tLvqve8t3p3ZgrUWnk4k';

function normSimple(s) {
  if (!s) return '';
  return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: SA_EMAIL, private_key: SA_KEY },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Leer Roster para ver todos los deptos de Catamarca
  const rosterRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Roster-Regiones!A:B",
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const rosterRows = rosterRes.data.values || [];
  console.log('=== CATAMARCA en Roster-Regiones ===');
  for (let i = 0; i < rosterRows.length; i++) {
    const r = rosterRows[i];
    if (!r[0]) continue;
    if (normSimple(r[0]) === 'CATAMARCA') {
      console.log(`  Row ${i+1}: A="${r[0]}" B="${r[1]}"`);
    }
  }

  // La fila 142 del GADM sheet es SantaMaría → D=SANTA MARIA
  // Debería mapear a SANTA MARIA / CATAMARCA en Roster
  // Pero F/G deben estar vacíos (no en Metabase Q202)
  console.log('\n📝 Corrigiendo fila 142 (SantaMaría → SANTA MARIA / CATAMARCA, sin datos Metabase)...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: "'GADM - Match Deptos'!F142:I142",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['', '', 'SANTA MARIA', 'CATAMARCA']] },
  });
  console.log('✅ Fila 142 corregida');

  // Verificar el resultado final
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'GADM - Match Deptos'!A130:I146",
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const checkRows = checkRes.data.values || [];
  console.log('\n=== VERIFICACIÓN FINAL CATAMARCA ===');
  console.log('B (GADM)               | F (Meta)              | G (MetaProv) | H (Roster)            | I (RosterProv)');
  console.log('-'.repeat(100));
  for (const r of checkRows) {
    if (!r[0]) continue;
    if (normSimple(r[0]) !== 'CATAMARCA' && normSimple(r[2]) !== 'CATAMARCA') continue;
    console.log([
      (r[1]||'').padEnd(22),
      (r[5]||'[VACÍO]').padEnd(22),
      (r[6]||'[VACÍO]').padEnd(13),
      (r[7]||'[VACÍO]').padEnd(22),
      (r[8]||'[VACÍO]'),
    ].join(' | '));
  }
}
main().catch(console.error);
