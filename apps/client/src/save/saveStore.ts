/**
 * One save interface for the whole client. Milestone A writes to the browser;
 * Milestone D swaps in a server-backed store with the same shape.
 */
export interface SaveStore {
  load(): string | null;
  save(text: string): void;
  clear(): void;
}

/** Wraps a save store and reports every write, so cloud save knows the browser save changed. */
export class WatchedSaveStore implements SaveStore {
  onSave: (() => void) | null = null;

  constructor(private readonly inner: SaveStore) {}

  load(): string | null {
    return this.inner.load();
  }

  save(text: string): void {
    this.inner.save(text);
    this.onSave?.();
  }

  clear(): void {
    this.inner.clear();
  }
}

const KEY = 'nooklings.save';

export class LocalSaveStore implements SaveStore {
  private memory: string | null = null;

  load(): string | null {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return this.memory;
    }
  }

  save(text: string): void {
    this.memory = text;
    try {
      window.localStorage.setItem(KEY, text);
    } catch {
      // Private browsing or storage full: keep playing from memory.
    }
  }

  clear(): void {
    this.memory = null;
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}
