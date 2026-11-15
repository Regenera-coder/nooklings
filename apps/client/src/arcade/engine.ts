import type { Content, GameState } from '@nooklings/core';
import { artUrl } from '../assets';
import type { RoomScene } from '../game/RoomScene';

/**
 * Game time for one Arcade round. Every timer and animation frame in a game goes
 * through this clock, so pausing freezes the whole round (and the countdown) at once.
 */
export class Clock {
  private t = 0;
  private last = performance.now();
  private paused = false;
  private stopped = false;
  private nextId = 1;
  private timers = new Map<number, { at: number; fn: () => void; every?: number }>();
  private frames = new Set<(dtMs: number) => void>();
  private raf = 0;

  constructor() {
    const loop = (now: number) => {
      if (this.stopped) return;
      const dt = Math.min(100, Math.max(0, now - this.last));
      this.last = now;
      if (!this.paused) {
        this.t += dt;
        for (const [id, timer] of [...this.timers]) {
          if (!this.timers.has(id) || timer.at > this.t) continue;
          if (timer.every) timer.at += timer.every;
          else this.timers.delete(id);
          timer.fn();
        }
        for (const f of [...this.frames]) f(dt);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Milliseconds of play since the round started (pauses excluded). */
  now(): number {
    return this.t;
  }

  after(ms: number, fn: () => void): number {
    const id = this.nextId++;
    this.timers.set(id, { at: this.t + ms, fn });
    return id;
  }

  every(ms: number, fn: () => void): number {
    const id = this.nextId++;
    this.timers.set(id, { at: this.t + ms, fn, every: ms });
    return id;
  }

  cancel(id: number): void {
    this.timers.delete(id);
  }

  onFrame(fn: (dtMs: number) => void): () => void {
    this.frames.add(fn);
    return () => this.frames.delete(fn);
  }

  get isPaused(): boolean {
    return this.paused;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.last = performance.now();
  }

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.timers.clear();
    this.frames.clear();
  }
}

export interface GameContext {
  /** The play area. Games add their elements here; it is cleared when the round ends. */
  readonly field: HTMLElement;
  readonly clock: Clock;
  readonly reduced: boolean;
  readonly content: Content;
  /** Game state when the round started (read-only: residents for stamps and Hide and Seek). */
  readonly state: GameState;
  readonly scene: RoomScene | null;
  readonly score: number;
  /** Adds points and shows a little "+n" where it happened. */
  addScore(points: number, at?: { x: number; y: number } | Element): void;
  /** A short line under the top bar (instructions such as "Watch!" / "Your turn"). */
  say(text: string): void;
  /** Seconds left in the round. */
  timeLeft(): number;
  /** Ends the round now (all boards cleared, for example). */
  end(): void;
}

export interface RunningGame {
  destroy?(): void;
}

export type GameFactory = (ctx: GameContext) => RunningGame;

// ---------- small DOM helpers shared by the games ----------

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** An image from the art manifest, or a labelled soft placeholder if the art is missing. */
export function art(key: string, cls = '', label = ''): HTMLElement {
  const url = artUrl(key);
  if (url) {
    const img = el('img', cls);
    img.src = url;
    img.alt = label;
    img.draggable = false;
    return img;
  }
  const ph = el('div', `${cls} ar-ph`, label || key.replace(/^(game|furn|pet|ui)_/, '').replace(/_/g, ' '));
  return ph;
}

/** Centre of an element in field coordinates. */
export function centreIn(field: HTMLElement, e: Element): { x: number; y: number } {
  const f = field.getBoundingClientRect();
  const r = e.getBoundingClientRect();
  return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
}

/** Pointer position in field coordinates. */
export function pointIn(field: HTMLElement, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const f = field.getBoundingClientRect();
  return { x: e.clientX - f.left, y: e.clientY - f.top };
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

/** A gentle "not that one" wiggle. No red, no sound. */
export function nudge(e: Element, reduced: boolean): void {
  if (reduced) return;
  e.classList.remove('ar-nudge');
  void (e as HTMLElement).offsetWidth;
  e.classList.add('ar-nudge');
}

/** A sparkle burst at a point in the field (uses the star-burst art). */
export function sparkle(field: HTMLElement, at: { x: number; y: number }, size = 90, reduced = false): void {
  const s = art('ui_star_burst', 'ar-burst');
  s.style.left = `${at.x}px`;
  s.style.top = `${at.y}px`;
  s.style.width = `${size}px`;
  s.style.height = `${size}px`;
  if (reduced) s.classList.add('still');
  field.append(s);
  window.setTimeout(() => s.remove(), reduced ? 500 : 700);
}

/**
 * Drag helper for drag-to-target games (Kitchen, Parcel Sorting). Calls onDrop with the
 * pointer position when released; the element follows the pointer meanwhile (by transform)
 * and springs back if onDrop returns false.
 * Also supports tap-to-pick: a short tap without movement calls onTap instead.
 */
export function draggable(
  item: HTMLElement,
  field: HTMLElement,
  handlers: {
    onStart?: () => void;
    onDrop: (at: { x: number; y: number }) => boolean;
    onTap?: () => void;
  },
): void {
  item.style.touchAction = 'none';
  item.addEventListener('pointerdown', (down) => {
    down.preventDefault();
    item.setPointerCapture?.(down.pointerId);
    const start = pointIn(field, down);
    let moved = false;
    handlers.onStart?.();
    const move = (ev: PointerEvent) => {
      const p = pointIn(field, ev);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) < 8) return;
      moved = true;
      item.classList.add('ar-dragging');
      item.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const up = (ev: PointerEvent) => {
      item.removeEventListener('pointermove', move);
      item.removeEventListener('pointerup', up);
      item.removeEventListener('pointercancel', up);
      item.classList.remove('ar-dragging');
      if (!moved) {
        handlers.onTap?.();
        return;
      }
      const kept = handlers.onDrop(pointIn(field, ev));
      if (!kept) item.style.transform = '';
    };
    item.addEventListener('pointermove', move);
    item.addEventListener('pointerup', up);
    item.addEventListener('pointercancel', up);
  });
}

/** True if a point in field coordinates is inside an element. */
export function hits(field: HTMLElement, e: Element, at: { x: number; y: number }, pad = 0): boolean {
  const f = field.getBoundingClientRect();
  const r = e.getBoundingClientRect();
  const x = at.x + f.left;
  const y = at.y + f.top;
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}
