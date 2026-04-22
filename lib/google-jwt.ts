/**
 * Genera un Google OAuth2 access token usando node:crypto nativo.
 * Evita el uso de google-auth-library / node-fetch que causa ENOTFOUND en RSC.
 */
import { createSign } from "node:crypto";

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function getGoogleAccessToken(
  serviceAccountEmail: string,
  privateKeyPem: string,
  scope: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: serviceAccountEmail,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  const jwtInput = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(jwtInput);
  sign.end();
  const signature = base64url(sign.sign(privateKeyPem));
  const jwt = `${jwtInput}.${signature}`;

  // Usamos el fetch global de Node.js (no node-fetch) para intercambiar el JWT por un access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google OAuth token error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
