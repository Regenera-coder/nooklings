import { describe, expect, it } from 'vitest';
import { CloudSync, type RemoteSave } from '../src/save/cloud';

/** A pretend server with one player's save, plus a pretend browser. */
function world(opts: { configured?: boolean; remote?: RemoteSave | null; local?: string; fresh?: boolean; session?: object } = {}) {
  const w = {
    remote: opts.remote ?? null as RemoteSave | null,
    local: opts.local ?? '{"version":7,"hearts":0}',
    fresh: opts.fresh ?? false,
    online: true,
    tokenValid: true,
    applied: [] as string[],
    puts: 0,
    changes: 0,
    store: new Map<string, string>(),
    sync: null as unknown as CloudSync,
  };
  if (opts.session) w.store.set('nooklings.cloud', JSON.stringify(opts.session));
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    if (!w.online) throw new Error('offline');
    if (url === '/api/config') return json(opts.configured === false ? { cloudSave: false } : { cloudSave: true, googleClientId: 'cid' });
    if (url === '/api/login') return json({ token: 'tok', expiresAt: 9e15 });
    if (!w.tokenValid) return json({ error: 'signed_out' }, 401);
    if ((init?.method ?? 'GET') === 'GET') return json({ save: w.remote });
    const body = JSON.parse(String(init!.body)) as { data: string; baseRev: number };
    w.puts++;
    if ((w.remote?.rev ?? 0) !== body.baseRev) return json({ error: 'conflict', save: w.remote }, 409);
    w.remote = { rev: body.baseRev + 1, savedAt: 1000 + w.puts, data: body.data };
    return json({ rev: w.remote.rev, savedAt: w.remote.savedAt });
  };
  w.sync = new CloudSync({
    fetch,
    storage: { getItem: (k) => w.store.get(k) ?? null, setItem: (k, v) => void w.store.set(k, v), removeItem: (k) => void w.store.delete(k) },
    getLocal: () => w.local,
    applyRemote: (text) => { w.applied.push(text); w.local = text; w.sync.localChanged(); },
    isFresh: () => w.fresh,
    onChange: () => { w.changes++; },
    now: () => 5000,
    debounceMs: 60_000,
  });
  return w;
}
const A = '{"version":7,"hearts":40}';
const B = '{"version":7,"hearts":90}';
const linked = (rev: number, dirty = false) => ({ token: 'tok', expiresAt: 9e15, rev, dirty, syncedAt: 1 });

describe('cloud save', () => {
  it('stays off and silent when the server is not set up or unreachable', async () => {
    const w = world({ configured: false });
    await w.sync.init();
    expect(w.sync.status).toBe('off');
    const off = world();
    off.online = false;
    await off.sync.init();
    expect(off.sync.status).toBe('off');
    off.sync.localChanged();
    expect(off.puts).toBe(0);
  });

  it('uploads the browser save on first sign-in when the cloud is empty', async () => {
    const w = world({ local: A });
    await w.sync.init();
    expect(w.sync.status).toBe('signed_out');
    expect(await w.sync.signIn('google-credential')).toBe(true);
    expect(w.sync.status).toBe('synced');
    expect(w.remote).toMatchObject({ rev: 1, data: A });
    expect(w.applied).toEqual([]);
  });

  it('brings the cloud save down onto a brand-new game without asking', async () => {
    const w = world({ remote: { rev: 3, savedAt: 9, data: B }, fresh: true });
    await w.sync.init();
    await w.sync.signIn('c');
    expect(w.applied).toEqual([B]);
    expect(w.sync.status).toBe('synced');
    expect(w.puts).toBe(0);
  });

  it('asks which save to keep when both have progress, and never overwrites before the answer', async () => {
    const w = world({ remote: { rev: 3, savedAt: 9, data: B }, local: A });
    await w.sync.init();
    await w.sync.signIn('c');
    expect(w.sync.status).toBe('conflict');
    expect(w.sync.conflict).toMatchObject({ data: B });
    w.local = '{"version":7,"hearts":41}';
    w.sync.localChanged();
    await w.sync.flush();
    expect(w.puts).toBe(0);
    expect(w.remote!.data).toBe(B);
    expect(w.applied).toEqual([]);
  });

  it('keeps the cloud save when the player chooses it', async () => {
    const w = world({ remote: { rev: 3, savedAt: 9, data: B }, local: A });
    await w.sync.init();
    await w.sync.signIn('c');
    await w.sync.resolve('cloud');
    expect(w.local).toBe(B);
    expect(w.sync.status).toBe('synced');
    expect(w.remote).toMatchObject({ rev: 3, data: B });
  });

  it('keeps this device when the player chooses it', async () => {
    const w = world({ remote: { rev: 3, savedAt: 9, data: B }, local: A });
    await w.sync.init();
    await w.sync.signIn('c');
    await w.sync.resolve('device');
    expect(w.remote).toMatchObject({ rev: 4, data: A });
    expect(w.applied).toEqual([]);
    expect(w.sync.status).toBe('synced');
  });

  it('uploads changes after sign-in', async () => {
    const w = world({ local: A });
    await w.sync.init();
    await w.sync.signIn('c');
    w.local = B;
    w.sync.localChanged();
    expect(w.sync.status).toBe('pending');
    await w.sync.flush();
    expect(w.remote).toMatchObject({ rev: 2, data: B });
    expect(w.sync.status).toBe('synced');
  });

  it('picks up a newer save from another device on start-up when this one has no changes', async () => {
    const w = world({ remote: { rev: 5, savedAt: 9, data: B }, local: A, session: linked(4) });
    await w.sync.init();
    expect(w.applied).toEqual([B]);
    expect(w.sync.status).toBe('synced');
  });

  it('asks when another device saved and this one also has unsent changes', async () => {
    const w = world({ remote: { rev: 5, savedAt: 9, data: B }, local: A, session: linked(4, true) });
    await w.sync.init();
    expect(w.sync.status).toBe('conflict');
    expect(w.applied).toEqual([]);
  });

  it('sends changes that were waiting from an earlier offline session', async () => {
    const w = world({ remote: { rev: 4, savedAt: 9, data: A }, local: B, session: linked(4, true) });
    await w.sync.init();
    expect(w.remote).toMatchObject({ rev: 5, data: B });
  });

  it('keeps changes waiting while offline and sends them once back online', async () => {
    const w = world({ local: A });
    await w.sync.init();
    await w.sync.signIn('c');
    w.online = false;
    w.local = B;
    w.sync.localChanged();
    await w.sync.flush();
    expect(w.sync.status).toBe('pending');
    expect(w.remote!.data).toBe(A);
    w.online = true;
    await w.sync.flush();
    expect(w.remote!.data).toBe(B);
    expect(w.sync.status).toBe('synced');
  });

  it('asks for a new sign-in when the session has ended, keeping unsent changes', async () => {
    const w = world({ local: A });
    await w.sync.init();
    await w.sync.signIn('c');
    w.tokenValid = false;
    w.local = B;
    w.sync.localChanged();
    await w.sync.flush();
    expect(w.sync.status).toBe('expired');
    w.tokenValid = true;
    await w.sync.signIn('c');
    expect(w.remote!.data).toBe(B);
    expect(w.sync.status).toBe('synced');
  });

  it('never replaces the browser save with a cloud save it cannot read', async () => {
    const w = world({ remote: { rev: 5, savedAt: 9, data: '{"version":99}' }, local: A, session: linked(4) });
    const sync = new CloudSync({
      fetch: async (url) => new Response(JSON.stringify(url === '/api/config' ? { cloudSave: true, googleClientId: 'cid' } : { save: w.remote })),
      storage: { getItem: (k) => w.store.get(k) ?? null, setItem: (k, v) => void w.store.set(k, v), removeItem: () => undefined },
      getLocal: () => w.local,
      applyRemote: () => { throw new Error('newer than this build'); },
      isFresh: () => false,
      onChange: () => undefined,
    });
    await sync.init();
    expect(sync.status).toBe('conflict');
    expect(w.local).toBe(A);
  });

  it('stops syncing after sign-out and leaves both saves alone', async () => {
    const w = world({ local: A });
    await w.sync.init();
    await w.sync.signIn('c');
    w.sync.signOut();
    expect(w.sync.status).toBe('signed_out');
    expect(w.store.has('nooklings.cloud')).toBe(false);
    w.local = B;
    w.sync.localChanged();
    await w.sync.flush();
    expect(w.remote!.data).toBe(A);
    expect(w.local).toBe(B);
  });
});
