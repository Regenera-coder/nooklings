/**
 * Interface memory that is not part of the game save: which tab was open, the Shop tab, whether the Ready list is
 * folded away, reduced motion. Kept in its own localStorage key so cloud saves and save versions are untouched.
 */
const KEY = 'nooklings.ui.v1';

export interface UiPrefs {
  tab?: string;
  exploreView?: string;
  shopTab?: 'furniture' | 'gardening' | 'costumes';
  readyOpen?: boolean;
  reducedMotion?: boolean;
  /** Arcade difficulty chosen for each game (0 Easy, 1 Normal, 2 Hard). */
  arcadeLevel?: Record<string, 0 | 1 | 2>;
}

let cache: UiPrefs | null = null;

export function prefs(): UiPrefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as UiPrefs) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export function setPrefs(patch: Partial<UiPrefs>): void {
  cache = { ...prefs(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private browsing or storage full: the game still works, it just won't remember.
  }
}
