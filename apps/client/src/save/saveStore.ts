/**
 * One save interface for the whole client. Milestone A writes to the browser;
 * Milestone D swaps in a server-backed store with the same shape.
 */
export interface SaveStore {
  load(): string | null;
  save(text: string): void;
  clear(): void;
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
