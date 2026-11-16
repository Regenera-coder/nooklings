import { describe, expect, it } from 'vitest';
import { b64urlEncode, signSession, verifySession, type Jwk } from '../auth';
import { handleConfig, handleLogin, handleSave, MAX_SAVE_BYTES, type Deps, type Env, type KV } from '../api';

const CLIENT = 'test-client.apps.googleusercontent.com';
const SECRET = 'a-long-test-secret-value';
const NOW = 1_800_000_000_000;
const enc = new TextEncoder();

class MemoryKV implements KV {
  data = new Map<string, string>();
  async get(key: string) { return this.data.get(key) ?? null; }
  async put(key: string, value: string) { this.data.set(key, value); }
}

/** A stand-in for Google: one RSA key pair, and ID tokens signed with it. */
async function fakeGoogle() {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' } as Jwk;
  const idToken = async (claims: Record<string, unknown>, kid = 'k1') => {
    const part = (o: unknown) => b64urlEncode(enc.encode(JSON.stringify(o)));
    const signed = `${part({ alg: 'RS256', kid, typ: 'JWT' })}.${part({ iss: 'https://accounts.google.com', aud: CLIENT, sub: '1234567890', exp: NOW / 1000 + 600, ...claims })}`;
    const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, enc.encode(signed)));
    return `${signed}.${b64urlEncode(sig)}`;
  };
  return { deps: { now: () => NOW, keys: async () => [jwk] } satisfies Deps, idToken };
}

const env = (kv = new MemoryKV()): Env & { SAVES: MemoryKV } => ({ GOOGLE_CLIENT_ID: CLIENT, SESSION_SECRET: SECRET, SAVES: kv });
const login = (credential: unknown) => new Request('https://x/api/login', { method: 'POST', body: JSON.stringify({ credential }) });
const save = (method: string, token: string | null, body?: unknown) =>
  new Request('https://x/api/save', { method, headers: token ? { authorization: `Bearer ${token}` } : {}, body: body === undefined ? undefined : JSON.stringify(body) });
const GAME = JSON.stringify({ version: 7, hearts: 12 });

describe('config', () => {
  it('reports cloud save only when everything is set up', async () => {
    expect(await handleConfig(env()).json()).toEqual({ cloudSave: true, googleClientId: CLIENT });
    expect(await handleConfig({}).json()).toEqual({ cloudSave: false });
    expect(await handleConfig({ ...env(), SAVES: undefined }).json()).toEqual({ cloudSave: false });
    expect(await handleConfig({ ...env(), SESSION_SECRET: 'short' }).json()).toEqual({ cloudSave: false });
  });
});

describe('login', () => {
  it('swaps a valid Google ID token for a session token', async () => {
    const g = await fakeGoogle();
    const res = await handleLogin(login(await g.idToken({})), env(), g.deps);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; expiresAt: number };
    expect(await verifySession(body.token, SECRET, NOW)).toBe('1234567890');
    expect(body.expiresAt).toBeGreaterThan(NOW + 30 * 86_400_000);
  });

  it('refuses tokens for another app, expired tokens, wrong issuers, unknown keys and tampering', async () => {
    const g = await fakeGoogle();
    const status = async (t: unknown) => (await handleLogin(login(t), env(), g.deps)).status;
    expect(await status(await g.idToken({ aud: 'someone-else' }))).toBe(401);
    expect(await status(await g.idToken({ exp: NOW / 1000 - 1 }))).toBe(401);
    expect(await status(await g.idToken({ iss: 'https://evil.example' }))).toBe(401);
    expect(await status(await g.idToken({}, 'other-key'))).toBe(401);
    const good = await g.idToken({});
    const [h, , sig] = good.split('.');
    const forged = `${h}.${b64urlEncode(enc.encode(JSON.stringify({ iss: 'accounts.google.com', aud: CLIENT, sub: '999', exp: NOW / 1000 + 600 })))}.${sig}`;
    expect(await status(forged)).toBe(401);
    expect(await status('not-a-token')).toBe(401);
    expect(await status(42)).toBe(400);
    // A token signed by a different key pair that reuses Google's key id.
    const other = await fakeGoogle();
    expect(await status(await other.idToken({}))).toBe(401);
  });

  it('is switched off until configured', async () => {
    const g = await fakeGoogle();
    expect((await handleLogin(login(await g.idToken({})), {}, g.deps)).status).toBe(503);
  });
});

describe('sessions', () => {
  it('rejects expired, altered and other-secret tokens', async () => {
    const t = await signSession('abc', SECRET, NOW + 1000);
    expect(await verifySession(t, SECRET, NOW)).toBe('abc');
    expect(await verifySession(t, SECRET, NOW + 2000)).toBeNull();
    expect(await verifySession(t, 'another-secret-value', NOW)).toBeNull();
    expect(await verifySession(t.replace('abc', 'abd'), SECRET, NOW)).toBeNull();
    expect(await verifySession(`abc.${NOW + 99_999_999}.${t.split('.')[2]}`, SECRET, NOW)).toBeNull();
    expect(await verifySession('junk', SECRET, NOW)).toBeNull();
  });
});

describe('save', () => {
  const deps: Deps = { now: () => NOW, keys: async () => [] };
  const tokenFor = (sub: string) => signSession(sub, SECRET, NOW + 1000);

  it('needs a valid session', async () => {
    expect((await handleSave(save('GET', null), env(), deps)).status).toBe(401);
    expect((await handleSave(save('GET', 'bad.token.here'), env(), deps)).status).toBe(401);
  });

  it('stores a first save, returns it, and keeps each player separate', async () => {
    const e = env();
    const a = await tokenFor('alice');
    expect(await (await handleSave(save('GET', a), e, deps)).json()).toEqual({ save: null });
    const put = await handleSave(save('PUT', a, { data: GAME, baseRev: 0 }), e, deps);
    expect(await put.json()).toEqual({ rev: 1, savedAt: NOW });
    expect(await (await handleSave(save('GET', a), e, deps)).json()).toEqual({ save: { rev: 1, savedAt: NOW, data: GAME } });
    expect(await (await handleSave(save('GET', await tokenFor('bob')), e, deps)).json()).toEqual({ save: null });
    expect([...e.SAVES.data.keys()]).toEqual(['save:alice']);
  });

  it('refuses to overwrite a save this device has not seen', async () => {
    const e = env();
    const a = await tokenFor('alice');
    await handleSave(save('PUT', a, { data: GAME, baseRev: 0 }), e, deps);
    const stale = await handleSave(save('PUT', a, { data: JSON.stringify({ version: 7, hearts: 1 }), baseRev: 0 }), e, deps);
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { save: { rev: number; data: string } }).save).toMatchObject({ rev: 1, data: GAME });
    const next = await handleSave(save('PUT', a, { data: GAME, baseRev: 1 }), e, deps);
    expect(await next.json()).toEqual({ rev: 2, savedAt: NOW });
  });

  it('rejects anything that is not a game save', async () => {
    const e = env();
    const a = await tokenFor('alice');
    const status = async (data: unknown) => (await handleSave(save('PUT', a, { data, baseRev: 0 }), e, deps)).status;
    expect(await status('hello')).toBe(400);
    expect(await status('[1,2]')).toBe(400);
    expect(await status(JSON.stringify({ hearts: 1 }))).toBe(400);
    expect(await status({ version: 7 })).toBe(400);
    expect(await status(JSON.stringify({ version: 7, pad: 'x'.repeat(MAX_SAVE_BYTES) }))).toBe(400);
    expect(e.SAVES.data.size).toBe(0);
    expect((await handleSave(save('DELETE', a), e, deps)).status).toBe(405);
  });
});
