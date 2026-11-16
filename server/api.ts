/**
 * Cloud save API. Three small endpoints, written against plain Request/Response so they can be
 * tested without Cloudflare:
 *   GET  /api/config  -> is cloud save set up, and which Google client id to use
 *   POST /api/login   -> swap a Google ID token for a session token
 *   GET  /api/save    -> the player's save, PUT /api/save -> store a newer one
 *
 * A save is stored as one KV entry per player, keyed by Google's anonymous account id.
 * Nothing else about the player is stored.
 */
import { fetchGoogleKeys, SESSION_DAYS, signSession, verifyGoogleIdToken, verifySession, type JwksFetcher } from './auth';

/** The slice of Cloudflare KV this API uses. */
export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Env {
  GOOGLE_CLIENT_ID?: string;
  SESSION_SECRET?: string;
  SAVES?: KV;
}

export interface Deps {
  now: () => number;
  keys: JwksFetcher;
}

export const liveDeps: Deps = { now: () => Date.now(), keys: fetchGoogleKeys };

export const MAX_SAVE_BYTES = 300_000;

interface StoredSave {
  rev: number;
  savedAt: number;
  data: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

function ready(env: Env): env is Required<Env> {
  return !!env.GOOGLE_CLIENT_ID && !!env.SESSION_SECRET && env.SESSION_SECRET.length >= 16 && !!env.SAVES;
}

export function handleConfig(env: Env): Response {
  return json(ready(env) ? { cloudSave: true, googleClientId: env.GOOGLE_CLIENT_ID } : { cloudSave: false });
}

export async function handleLogin(request: Request, env: Env, deps: Deps = liveDeps): Promise<Response> {
  if (!ready(env)) return json({ error: 'not_configured' }, 503);
  let credential: unknown;
  try {
    credential = ((await request.json()) as { credential?: unknown }).credential;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (typeof credential !== 'string' || credential.length > 4096) return json({ error: 'bad_request' }, 400);
  let sub: string | null;
  try {
    sub = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID, deps.keys, deps.now());
  } catch {
    return json({ error: 'google_unavailable' }, 502);
  }
  if (!sub) return json({ error: 'invalid_sign_in' }, 401);
  const expiresAt = deps.now() + SESSION_DAYS * 86_400_000;
  return json({ token: await signSession(sub, env.SESSION_SECRET, expiresAt), expiresAt });
}

async function player(request: Request, env: Required<Env>, deps: Deps): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  return verifySession(header.slice(7), env.SESSION_SECRET, deps.now());
}

async function read(env: Required<Env>, sub: string): Promise<StoredSave | null> {
  const text = await env.SAVES.get(`save:${sub}`);
  if (!text) return null;
  try {
    const v = JSON.parse(text) as StoredSave;
    return typeof v.rev === 'number' && typeof v.data === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** A save must be the game's own JSON: an object with a numeric version. The rules live in the client. */
function looksLikeSave(data: unknown): data is string {
  if (typeof data !== 'string' || data.length === 0 || data.length > MAX_SAVE_BYTES) return false;
  try {
    const v: unknown = JSON.parse(data);
    return !!v && typeof v === 'object' && !Array.isArray(v) && typeof (v as { version?: unknown }).version === 'number';
  } catch {
    return false;
  }
}

export async function handleSave(request: Request, env: Env, deps: Deps = liveDeps): Promise<Response> {
  if (!ready(env)) return json({ error: 'not_configured' }, 503);
  const sub = await player(request, env, deps);
  if (!sub) return json({ error: 'signed_out' }, 401);
  const current = await read(env, sub);

  if (request.method === 'GET') return json({ save: current });

  if (request.method === 'PUT') {
    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > MAX_SAVE_BYTES + 1000) return json({ error: 'too_large' }, 413);
    let body: { data?: unknown; baseRev?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: 'bad_request' }, 400);
    }
    if (!looksLikeSave(body.data)) return json({ error: 'bad_save' }, 400);
    // Only overwrite the save this device last saw, so two devices cannot silently undo each other.
    const base = typeof body.baseRev === 'number' ? body.baseRev : 0;
    if ((current?.rev ?? 0) !== base) return json({ error: 'conflict', save: current }, 409);
    const next: StoredSave = { rev: base + 1, savedAt: deps.now(), data: body.data };
    await env.SAVES.put(`save:${sub}`, JSON.stringify(next));
    return json({ rev: next.rev, savedAt: next.savedAt });
  }
  return json({ error: 'method_not_allowed' }, 405);
}
