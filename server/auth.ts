/**
 * Sign-in helpers for the cloud save API (Cloudflare Pages Functions).
 *
 * Google proves who the player is (an ID token from "Sign in with Google"). The server checks that
 * token once, then hands back its own long-lived session token, so the player does not have to sign
 * in again every hour. Only Google's anonymous account id ("sub") is ever used: no email, no name.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(text: string): Uint8Array<ArrayBuffer> {
  const pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface Jwk {
  kid?: string;
  kty: string;
  n?: string;
  e?: string;
  alg?: string;
  use?: string;
}

export type JwksFetcher = () => Promise<Jwk[]>;

const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
let cachedKeys: { keys: Jwk[]; until: number } | null = null;

/** Google's public signing keys, cached for an hour. */
export const fetchGoogleKeys: JwksFetcher = async () => {
  if (cachedKeys && cachedKeys.until > Date.now()) return cachedKeys.keys;
  const res = await fetch(GOOGLE_CERTS);
  if (!res.ok) throw new Error('Could not load Google sign-in keys');
  const body = (await res.json()) as { keys?: Jwk[] };
  cachedKeys = { keys: body.keys ?? [], until: Date.now() + 3_600_000 };
  return cachedKeys.keys;
};

function parseJson(bytes: Uint8Array): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(dec.decode(bytes));
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Checks a Google ID token: signature (RS256, Google's keys), audience (our client id), issuer and
 * expiry. Returns the account id, or null if anything is off.
 */
export async function verifyGoogleIdToken(token: string, clientId: string, keys: JwksFetcher, nowMs: number): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || !clientId) return null;
  let headBytes: Uint8Array<ArrayBuffer>, bodyBytes: Uint8Array<ArrayBuffer>, sig: Uint8Array<ArrayBuffer>;
  try {
    headBytes = b64urlDecode(parts[0]!);
    bodyBytes = b64urlDecode(parts[1]!);
    sig = b64urlDecode(parts[2]!);
  } catch {
    return null;
  }
  const head = parseJson(headBytes);
  const body = parseJson(bodyBytes);
  if (!head || !body || head.alg !== 'RS256' || typeof head.kid !== 'string') return null;
  const jwk = (await keys()).find((k) => k.kid === head.kid && k.kty === 'RSA');
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk as JsonWebKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) return null;
  if (body.aud !== clientId) return null;
  if (typeof body.iss !== 'string' || !GOOGLE_ISSUERS.has(body.iss)) return null;
  if (typeof body.exp !== 'number' || body.exp * 1000 <= nowMs) return null;
  if (typeof body.sub !== 'string' || !/^[0-9A-Za-z_-]{1,64}$/.test(body.sub)) return null;
  return body.sub;
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export const SESSION_DAYS = 60;

/** Our own session token: "<account id>.<expiry ms>.<signature>". */
export async function signSession(sub: string, secret: string, expiresAtMs: number): Promise<string> {
  const payload = `${sub}.${expiresAtMs}`;
  return `${payload}.${b64urlEncode(await hmac(secret, payload))}`;
}

export async function verifySession(token: string, secret: string, nowMs: number): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || !secret) return null;
  const [sub, exp, sig] = parts as [string, string, string];
  if (!/^[0-9A-Za-z_-]{1,64}$/.test(sub) || !/^\d{1,16}$/.test(exp)) return null;
  let given: Uint8Array;
  try {
    given = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (!sameBytes(given, await hmac(secret, `${sub}.${exp}`))) return null;
  return Number(exp) > nowMs ? sub : null;
}
