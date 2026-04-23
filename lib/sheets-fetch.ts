/**
 * Shared helper for fetching Google Sheets ranges.
 * Always decodes the response body as UTF-8 explicitly using TextDecoder
 * to prevent mojibake (e.g. "gestión" → "gestión") caused by
 * environments that default to Latin-1 / Windows-1252.
 */
export async function fetchSheetRange(
  token: string,
  sheetId: string,
  range: string
): Promise<string[][]> {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // Decode error body as UTF-8 too
    const errBuf = await res.arrayBuffer();
    const errText = new TextDecoder("utf-8").decode(errBuf);
    throw new Error(`Sheets API error [${range}]: ${res.statusText} - ${errText}`);
  }

  // Force UTF-8 decoding regardless of Content-Type charset
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer);
  const json = JSON.parse(text);

  return (json.values as string[][]) || [];
}
