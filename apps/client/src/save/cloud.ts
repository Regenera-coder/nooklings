/**
 * Cloud save: keeps the browser save and the player's cloud save in step.
 *
 * The browser save stays the one the game plays from. After the player signs in with Google, every
 * change is uploaded a few seconds later, and on start-up a newer cloud save (from another device)
 * is brought down. If both sides have changed, the player is asked which one to keep: nothing is
 * ever merged or overwritten silently.
 */

export type CloudStatus =
  | 'off' // not set up on the server: the game shows nothing about cloud save
  | 'signed_out'
  | 'expired' // was signed in; needs a fresh sign-in
  | 'syncing'
  | 'synced'
  | 'pending' // changes waiting to upload (offline or a failed try)
  | 'conflict';

export interface RemoteSave {
  rev: number;
  savedAt: number;
  data: string;
}

interface Session {
  token: string;
  expiresAt: number;
  /** Cloud revision this device last matched. 0 = never linked. */
  rev: number;
  /** The browser save has changed since that revision. */
  dirty: boolean;
  /** When this device last matched the cloud. */
  syncedAt: number;
}

export interface CloudOptions {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  /** The browser save as text. */
  getLocal: () => string;
  /** Replace the running game with this save. */
  applyRemote: (text: string) => void;
  /** True for a save with no progress worth keeping (a brand-new game). */
  isFresh: (text: string) => boolean;
  onChange: () => void;
  now?: () => number;
  /** Delay before uploading after a change. */
  debounceMs?: number;
}

const KEY = 'nooklings.cloud';

export class CloudSync {
  status: CloudStatus = 'off';
  clientId: string | null = null;
  conflict: RemoteSave | null = null;
  private session: Session | null = null;
  private applying = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy: Promise<void> = Promise.resolve();
  private readonly now: () => number;

  constructor(private readonly o: CloudOptions) {
    this.now = o.now ?? (() => Date.now());
  }

  get signedIn(): boolean {
    return !!this.session;
  }

  get syncedAt(): number {
    return this.session?.syncedAt ?? 0;
  }

  /** Ask the server whether cloud save is set up, then sync if this device is already signed in. */
  async init(): Promise<void> {
    try {
      const res = await this.o.fetch('/api/config');
      const cfg = res.ok ? ((await res.json()) as { cloudSave?: boolean; googleClientId?: string }) : {};
      if (!cfg.cloudSave || !cfg.googleClientId) return;
      this.clientId = cfg.googleClientId;
    } catch {
      return; // no server (local development, offline first visit): stay off
    }
    this.session = this.loadSession();
    if (this.session && this.session.expiresAt <= this.now()) {
      this.session = { ...this.session, token: '' };
      this.set('expired');
      return;
    }
    this.set(this.session ? 'pending' : 'signed_out');
    if (this.session) await this.sync();
  }

  /** Called with the credential from "Sign in with Google". */
  async signIn(credential: string): Promise<boolean> {
    try {
      const res = await this.o.fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential }) });
      if (!res.ok) return false;
      const body = (await res.json()) as { token: string; expiresAt: number };
      const old = this.session;
      this.session = { token: body.token, expiresAt: body.expiresAt, rev: old?.rev ?? 0, dirty: old?.dirty ?? false, syncedAt: old?.syncedAt ?? 0 };
      this.persist();
    } catch {
      return false;
    }
    await this.sync();
    return true;
  }

  /** Stop syncing on this device. The browser save and the cloud save both stay as they are. */
  signOut(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.session = null;
    this.conflict = null;
    this.o.storage.removeItem(KEY);
    if (this.status !== 'off') this.set('signed_out');
  }

  /** The browser save changed. */
  localChanged(): void {
    if (this.applying || !this.session) return;
    if (!this.session.dirty) {
      this.session.dirty = true;
      this.persist();
    }
    if (this.status === 'conflict' || this.status === 'expired') return;
    this.set('pending');
    this.schedule(this.o.debounceMs ?? 4000);
  }

  /** Bring the two saves in step. */
  sync(): Promise<void> {
    return this.queue(() => this.doSync());
  }

  /** Upload now if there is anything waiting (also used by tests). */
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    return this.queue(async () => {
      if (this.session?.dirty && this.status !== 'conflict' && this.status !== 'expired') await this.push();
    });
  }

  /** Settle a conflict: keep the cloud save, or keep this device's save. */
  resolve(keep: 'cloud' | 'device'): Promise<void> {
    return this.queue(async () => {
      const remote = this.conflict;
      if (!remote || !this.session) return;
      this.conflict = null;
      this.session.rev = remote.rev;
      if (keep === 'cloud') {
        this.adopt(remote);
      } else {
        this.session.dirty = true;
        this.persist();
        await this.push();
      }
    });
  }

  // ---------- internals ----------

  private queue(job: () => Promise<void>): Promise<void> {
    this.busy = this.busy.then(job, job);
    return this.busy;
  }

  private async doSync(): Promise<void> {
    const s = this.session;
    if (!s || !s.token) return;
    this.set('syncing');
    let remote: RemoteSave | null;
    try {
      const res = await this.o.fetch('/api/save', { headers: { authorization: `Bearer ${s.token}` } });
      if (res.status === 401) return this.expire();
      if (!res.ok) return this.set('pending');
      remote = ((await res.json()) as { save: RemoteSave | null }).save;
    } catch {
      return this.set('pending');
    }
    const local = this.o.getLocal();
    if (!remote) {
      s.rev = 0;
      return this.push();
    }
    if (remote.data === local) return this.matched(remote.rev, remote.savedAt);
    // Same revision: no other device has saved since, so this device's save is the newer one.
    if (remote.rev === s.rev) return this.push();
    // The cloud has a save this device has not seen.
    const nothingToLose = s.rev > 0 ? !s.dirty : this.o.isFresh(local);
    if (nothingToLose) return this.adopt(remote);
    this.conflict = remote;
    this.set('conflict');
  }

  private async push(): Promise<void> {
    const s = this.session;
    if (!s || !s.token) return;
    const sent = this.o.getLocal();
    this.set('syncing');
    try {
      const res = await this.o.fetch('/api/save', {
        method: 'PUT',
        headers: { authorization: `Bearer ${s.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ data: sent, baseRev: s.rev }),
      });
      if (res.status === 401) return this.expire();
      if (res.status === 409) {
        const remote = ((await res.json()) as { save: RemoteSave | null }).save;
        if (!remote) {
          s.rev = 0;
          return this.set('pending');
        }
        if (remote.data === this.o.getLocal()) return this.matched(remote.rev, remote.savedAt);
        this.conflict = remote;
        return this.set('conflict');
      }
      if (!res.ok) return this.set('pending');
      const body = (await res.json()) as { rev: number; savedAt: number };
      s.rev = body.rev;
      if (this.o.getLocal() === sent) return this.matched(body.rev, body.savedAt);
      // The player kept playing while this upload was on its way.
      this.persist();
      this.set('pending');
      this.schedule(this.o.debounceMs ?? 4000);
    } catch {
      this.set('pending');
    }
  }

  private adopt(remote: RemoteSave): void {
    this.applying = true;
    try {
      this.o.applyRemote(remote.data);
    } catch {
      // A save this version of the game cannot read (made by a newer version): never replace the
      // browser save with it. Let the player decide instead.
      this.conflict = remote;
      this.set('conflict');
      return;
    } finally {
      this.applying = false;
    }
    this.matched(remote.rev, remote.savedAt);
  }

  private matched(rev: number, at: number): void {
    if (!this.session) return;
    this.session.rev = rev;
    this.session.dirty = false;
    this.session.syncedAt = at;
    this.persist();
    this.set('synced');
  }

  private expire(): void {
    if (this.session) {
      this.session.token = '';
      this.persist();
    }
    this.set('expired');
  }

  private schedule(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, ms);
  }

  private set(status: CloudStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.o.onChange();
  }

  private persist(): void {
    if (this.session) this.o.storage.setItem(KEY, JSON.stringify(this.session));
  }

  private loadSession(): Session | null {
    try {
      const v = JSON.parse(this.o.storage.getItem(KEY) ?? 'null') as Partial<Session> | null;
      if (!v || typeof v.token !== 'string' || typeof v.expiresAt !== 'number') return null;
      return { token: v.token, expiresAt: v.expiresAt, rev: Number(v.rev) || 0, dirty: !!v.dirty, syncedAt: Number(v.syncedAt) || 0 };
    } catch {
      return null;
    }
  }
}
