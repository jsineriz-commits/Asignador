const { google } = require('googleapis');
const SA_EMAIL = 'sheets-bot@minuta-comercial.iam.gserviceaccount.com';
const SA_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDWEvIJDAHLdQjC\nP6PO6hG2Dpqc2E8OckN6d4o5Iov82QAGsCf8dC94pstkWKUjWeuyoerOssn7mhuv\n2xxkVBpFlyfKzaEE2IbcAKeEbqd7GdfPy9Lj3abJRgIoQE88DTw9ive3DeGgYGl6\nTVXPtFvix7Z1lr5U3obO+RsmYNocEwjw2ozzqD3htvuMa8xj4Nb57A1+e6WNLvwH\nKyihFubTMOT9/ZQGEHwab67kJMB6zaVSaFQuTzWEVYZUZwwWJ9oLBy+YQc6f0glm\ngLXgH1s9Up00TZ9WHFXeaNwonOvLscuyZM8ao6NgJMWvluk5FpakF5WUv8Hpb39S\nZaOTTM2jAgMBAAECggEAXw8TnfPQejWSeZtD1JY43iR3AI3G8S3JDAE4Bi3yhokf\ni1i+sMow6Dz8lScN0XhVAsIGn9lhepGQmNLNtTlpXxyDZXlQ9nNl0xyRRmvSgAXW\nQKYME/YxYS/utkv0Q0DHTra+T/FgjtQxEkd0AuLeaIHxYh7ZjpsvtomERlJ8lzkG\nnr6+XlRDZDfS7I8RwEQxOtFDZ3bQkJ3hDNN2FdBYFRi540l9D5fE68CXJOYji+PJ\nQAs63M9hsS9EufQD2v9RgzeRjKsKKvbTIXbRONsmcdwFafXr0agufUMMfhvoeKho\nUJUqUNGwB/89HonWmhIv+yX6GDPvoAroIQZ79J1Q6QKBgQDxZ3+nMxkMTSQqVK44\nwZTLsUezv1PWL6MzN2JEuwZM8skLjlt7yvDpNepY4GI67YDRFTZ/vpCQJMj0mx54\n/93dK7lsSy8Cfb5mxIMWLPW8zzOyiu+l0YkClrQcoqkss1+1LVnBOujhdJKrtOR9\nzYN1F5I3gmzmQj9pM/YMnSOVGwKBgQDjBGxoEBptbNYjTTst1aB5zD8dddLPir11\nXipKBc8H2atDhVujVqDFsahcgb6+cwsLncreWIKd2xU3DsBFFfQFX8M/BYPdNAkR\nyny7RHpdze1PIUX2G8HazLaaHi1cQgyg8jmM8Z4m0V34e6iLQbHtnTM3aHdN/nlJ\nlcx0CHOaGQKBgGAimniIZdo7QkLFVFhv5wSzRd20PPvYHsL/tFewr1KngR7kA1Sq\nPgRxnzDjstrKyHj7XKfEySdOLuUSfTEsnDs+9WnGCyOP1epxKc8D+pzFW04n/EXp\nywlH4NRihsKxcFTjiZHlFubqGJrev/vFgyt3RphqjVmpWj1YHw1o6smvAoGAS5AP\nXVvuz/loFXwBdLIkpiXb5DxxnO87PLPJM7ZXQO+s196tr+KHxQXrWk89ZDr6tDUj\nb3rajxx7JUZdrSEvhhJn9LQrPhex5SAXAGY8rLh8gtg6Zz65+dAl/4qH4quBdJjr\nmwRZdeY+dxUB9sg5JzQp9glpnKZVTK71zLF7eRECgYA/aIKWCoVHf0xBZ/pYbLGs\nvV09VPgQ9zRXm6zMCFXZOWUJehR8OLzlcNAfXdfHjJM4nhZquxoPCiZf0Iu3+pSC\n4Bpecv5EDt6wHEVOcbwWUGd2r2ufPUkfwrEWZNo48zvHbuV9hRapAHW1+HF1QLJF\nVgehwxHxUT+EmcqNde3HNA==\n-----END PRIVATE KEY-----\n`;
const SHEET_ID = '1KfqTwP2hdeqF_FZSmEEniP1tLvqve8t3p3ZgrUWnk4k';

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: SA_EMAIL, private_key: SA_KEY },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Check Catamarca rows
  const cataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'GADM - Match Deptos'!A129:I146",
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const cataRows = cataRes.data.values || [];
  console.log('=== CATAMARCA (filas 129-146) ===');
  console.log('A (ProvGADM)    | B (DeptGADM)              | F (Meta Dept)           | G (Meta Prov)   | H (Roster Dept)         | I (Roster Prov)');
  console.log('-'.repeat(120));
  for (const r of cataRows) {
    console.log([
      (r[0]||'').padEnd(15),
      (r[1]||'').padEnd(26),
      (r[5]||'[VACÍO]').padEnd(24),
      (r[6]||'[VACÍO]').padEnd(16),
      (r[7]||'[VACÍO]').padEnd(24),
      (r[8]||'[VACÍO]'),
    ].join(' | '));
  }

  // Stats globales
  const allRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'GADM - Match Deptos'!A:I",
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const allRows = allRes.data.values || [];
  let hFull=0, hEmpty=0, fFull=0, fEmpty=0;
  for (let i=1; i<allRows.length; i++) {
    const r = allRows[i];
    if (!r[0] && !r[1]) continue;
    if (r[7] && r[8]) hFull++; else hEmpty++;
    if (r[5] && r[6]) fFull++; else fEmpty++;
  }
  console.log('\n=== ESTADÍSTICAS GLOBALES ===');
  console.log(`H+I (Roster):  ${hFull} llenos | ${hEmpty} vacíos`);
  console.log(`F+G (Metabase): ${fFull} llenos | ${fEmpty} vacíos`);
  console.log(`(Vacíos en Metabase = provincias no en Q202: Catamarca, Jujuy parcial, TdF, etc.)`);
}
main().catch(console.error);
