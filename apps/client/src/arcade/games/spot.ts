import type { Content } from '@nooklings/core';
import { artUrl } from '../../assets';
import { art, el, nudge, pointIn, sparkle, type GameFactory, type Level } from '../engine';

/**
 * Spot the Difference, built fresh every time from the game's own art: a random room, a random
 * set of furniture in random places, and random changes in the right-hand picture. No two
 * pictures are the same, so there is nothing to learn by heart.
 */

/** A box in picture units: x and w as a share of the width, y and h as a share of the height. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneItem {
  defId: string;
  layer: 'floor' | 'wall';
  box: Box;
}

export type ChangeKind = 'gone' | 'added' | 'swap' | 'tint' | 'size' | 'move' | 'flip';

export interface Change {
  kind: ChangeKind;
  /** Index into items (for 'added', the item exists only in the changed picture). */
  item: number;
  /** Where the change is in the original and the changed picture (they differ only for 'move' and 'size'). */
  zoneA: Box;
  zoneB: Box;
  /** swap: the furniture shown instead. */
  swapTo?: string;
  /** tint: degrees of hue turn. size: scale. move: shift as a share of the width. */
  amount?: number;
}

export interface ScenePlan {
  background: string;
  items: SceneItem[];
  changes: Change[];
}

/** How each difficulty plays: how full the room is, how many changes, how subtle, when hints come. */
export const SPOT_LEVELS = [
  { items: 7, shrink: 1, changes: 4, tint: [100, 160], size: 1.4, move: 0.14, hintAfter: 12_000, kinds: ['gone', 'added', 'swap', 'tint', 'size'] },
  { items: 9, shrink: 0.9, changes: 5, tint: [70, 120], size: 1.3, move: 0.1, hintAfter: 20_000, kinds: ['gone', 'added', 'swap', 'tint', 'size', 'move'] },
  { items: 11, shrink: 0.8, changes: 6, tint: [45, 75], size: 1.2, move: 0.07, hintAfter: 32_000, kinds: ['gone', 'added', 'swap', 'tint', 'size', 'move', 'flip'] },
] as const;

/** Picture shape: wide enough to fill half the phone in landscape. */
export const SCENE_ASPECT = 1200 / 1040;
const WALL_TOP = [0.02, 0.07] as const;
/** Where the bottoms of floor pieces go: indoors below the wall, outdoors on the grass or paving. */
const FLOOR_INDOOR = [0.5, 0.97] as const;
const FLOOR_OUTDOOR = [0.42, 0.97] as const;

type Rand = () => number;

function overlaps(a: Box, b: Box, pad: number): boolean {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
}

function shuffleWith<T>(list: readonly T[], rand: Rand): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface SpotPiece {
  id: string;
  layer: 'floor' | 'wall';
  /** Footprint width in cells (bigger furniture is drawn bigger). */
  w: number;
}

/** Furniture the game can use: floor and wall pieces that have art. */
export function spotPieces(content: Content, has: (key: string) => boolean): SpotPiece[] {
  return Object.values(content.furniture)
    .filter((f) => !f.succulent && (f.layer === 'floor' || f.layer === 'wall') && f.w <= 3 && has(`furn_${f.id}`))
    .map((f) => ({ id: f.id, layer: f.layer as 'floor' | 'wall', w: f.w }));
}

/** Size of a piece's box in picture units (boxes are square on screen; art is fitted inside). */
function sizeFor(p: SpotPiece, rand: Rand, shrink: number): { w: number; h: number } {
  const w = shrink * (p.layer === 'wall' ? Math.min(0.17, 0.08 + p.w * 0.035) : Math.min(0.3, 0.12 + p.w * 0.055)) * (0.9 + rand() * 0.2);
  return { w, h: w * SCENE_ASPECT };
}

/** Places a piece where it does not overlap anything already placed (null if there is no room). */
function place(p: SpotPiece, taken: Box[], rand: Rand, shrink: number, floor: readonly [number, number]): Box | null {
  for (let tries = 0; tries < 80; tries++) {
    const { w, h } = sizeFor(p, rand, shrink);
    const x = 0.02 + rand() * (0.96 - w);
    const y = p.layer === 'wall' ? WALL_TOP[0] + rand() * (WALL_TOP[1] - WALL_TOP[0]) : floor[0] + rand() * (floor[1] - floor[0]) - h;
    const box = { x, y: Math.max(0.01, y), w, h };
    if (box.y + box.h > 0.99) continue;
    if (!taken.some((t) => overlaps(t, box, 0.015))) return box;
  }
  return null;
}

/**
 * Plans one picture pair. Pure (no page needed), so it can be tested: `rand` decides everything.
 * Each change is far enough from the others that one tap can only ever find one of them.
 */
export function planScene(
  pieces: SpotPiece[],
  backgrounds: Array<{ key: string; wall: boolean }>,
  level: Level,
  rand: Rand = Math.random,
  /** Pieces that look different mirrored (a flip of a symmetric piece could never be found). */
  flippable: ReadonlySet<string> = new Set(),
): ScenePlan {
  const tune = SPOT_LEVELS[level];
  const bg = backgrounds[Math.floor(rand() * backgrounds.length)] ?? { key: '', wall: false };
  const background = bg.key;
  const floor = bg.wall ? FLOOR_INDOOR : FLOOR_OUTDOOR;
  // Outdoor pictures have no wall to hang things on.
  const order = shuffleWith(pieces.filter((p) => bg.wall || p.layer === 'floor'), rand);
  const walls = order.filter((p) => p.layer === 'wall');
  const floors = order.filter((p) => p.layer === 'floor');
  const wanted = tune.items;
  const pickList = [...walls.slice(0, Math.round(wanted * 0.35)), ...floors].slice(0, wanted + 4);
  const items: SceneItem[] = [];
  const taken: Box[] = [];
  // One extra space is kept free for an "added" change.
  for (const p of pickList) {
    if (items.length >= wanted) break;
    const box = place(p, taken, rand, tune.shrink, floor);
    if (!box) continue;
    taken.push(box);
    items.push({ defId: p.id, layer: p.layer, box });
  }
  const used = new Set(items.map((i) => i.defId));
  const spare = order.filter((p) => !used.has(p.id));

  const changes: Change[] = [];
  const kinds = shuffleWith(tune.kinds, rand);
  const targets = shuffleWith([...items.keys()], rand);
  let k = 0;
  let guard = 0;
  while (changes.length < tune.changes && guard++ < 80) {
    const kind = kinds[k++ % kinds.length] as ChangeKind;
    if (kind === 'added') {
      const piece = spare.shift();
      if (!piece) continue;
      const box = place(piece, taken, rand, tune.shrink, floor);
      if (!box) continue;
      taken.push(box);
      items.push({ defId: piece.id, layer: piece.layer, box });
      changes.push({ kind, item: items.length - 1, zoneA: box, zoneB: box });
      continue;
    }
    const item = targets.find((t) => !changes.some((c) => c.item === t));
    if (item === undefined) break;
    const it = items[item]!;
    const box = it.box;
    if (kind === 'swap') {
      const to = spare.find((p) => p.layer === it.layer);
      if (!to) continue;
      spare.splice(spare.indexOf(to), 1);
      changes.push({ kind, item, zoneA: box, zoneB: box, swapTo: to.id });
    } else if (kind === 'tint') {
      const [a, b] = tune.tint;
      changes.push({ kind, item, zoneA: box, zoneB: box, amount: (a + rand() * (b - a)) * (rand() < 0.5 ? -1 : 1) });
    } else if (kind === 'size') {
      const s = tune.size;
      const grown = { x: box.x - (box.w * (s - 1)) / 2, y: box.y - box.h * (s - 1), w: box.w * s, h: box.h * s };
      changes.push({ kind, item, zoneA: grown, zoneB: grown, amount: s });
    } else if (kind === 'move') {
      const dir = box.x > 0.5 ? -1 : 1;
      const dx = tune.move * dir;
      const moved = { ...box, x: box.x + dx };
      const both = { x: Math.min(box.x, moved.x), y: box.y, w: box.w + Math.abs(dx), h: box.h };
      // A move must not slide into another item, or one tap could land on two changes.
      if (items.some((o, i) => i !== item && overlaps(o.box, moved, 0))) continue;
      changes.push({ kind, item, zoneA: both, zoneB: both, amount: dx });
    } else if (kind === 'flip') {
      if (!flippable.has(it.defId)) continue;
      changes.push({ kind, item, zoneA: box, zoneB: box });
    } else {
      changes.push({ kind, item, zoneA: box, zoneB: box });
    }
  }
  return { background, items, changes };
}

/** Is a point (picture units) inside a zone, with a little slack for fingers? */
export function inBox(x: number, y: number, b: Box, slack = 0.025): boolean {
  return x >= b.x - slack && x <= b.x + b.w + slack && y >= b.y - slack && y <= b.y + b.h + slack;
}

const FIND_POINTS = 10;
const SCENE_BONUS = 10;
const BACKGROUNDS = [
  { key: 'room_living_background', wall: true },
  { key: 'room_sunroom_background', wall: true },
  { key: 'room_kitchen_background', wall: true },
  { key: 'room_yard_background', wall: false },
  { key: 'room_teagarden_background', wall: false },
];

/** Furniture art that looks clearly different mirrored, worked out once from the pictures themselves. */
const flippable = new Set<string>();
const flipChecked = new Set<string>();
function checkFlips(ids: string[]): void {
  for (const id of ids) {
    if (flipChecked.has(id)) continue;
    flipChecked.add(id);
    const url = artUrl(`furn_${id}`);
    if (!url) continue;
    const img = new Image();
    img.onload = () => {
      const n = 48;
      const c = document.createElement('canvas');
      c.width = n;
      c.height = n;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (!g) return;
      g.drawImage(img, 0, 0, n, n);
      const d = g.getImageData(0, 0, n, n).data;
      let diff = 0;
      let seen = 0;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n / 2; x++) {
          const a = (y * n + x) * 4;
          const b = (y * n + (n - 1 - x)) * 4;
          if (d[a + 3]! < 40 && d[b + 3]! < 40) continue;
          seen++;
          diff += Math.abs(d[a]! - d[b]!) + Math.abs(d[a + 1]! - d[b + 1]!) + Math.abs(d[a + 2]! - d[b + 2]!) + Math.abs(d[a + 3]! - d[b + 3]!);
        }
      }
      if (seen && diff / seen > 70) flippable.add(id);
    };
    img.src = url;
  }
}

/**
 * Spot the Difference (Mischi): the left picture is the original, the right one has changes
 * (Easy 4, Normal 5, Hard 6, subtler on harder levels). Tap a change in either picture
 * (10 points each, 10 more for finding them all). Wrong taps only show a soft ripple.
 * Hints come after a while without a find (later on harder levels).
 */
export const spot: GameFactory = (ctx) => {
  const { field, clock, reduced, level } = ctx;
  field.classList.add('g-spot');
  const pair = el('div', 'spot-pair');
  const dots = el('div', 'spot-dots');
  field.append(pair, dots);
  const pieces = spotPieces(ctx.content, (k) => !!artUrl(k));
  const backgrounds = BACKGROUNDS.filter((b) => artUrl(b.key));
  const tune = SPOT_LEVELS[level];
  if (level === 2) checkFlips(pieces.map((p) => p.id));
  const next = () => planScene(pieces, backgrounds, level, Math.random, flippable);

  let plan: ScenePlan = next();
  let found = new Set<number>();
  let lastFind = 0;
  let cooldownUntil = 0;
  let scenes = 0;
  let between = false;
  const panes: HTMLElement[] = [];

  const ring = (pane: HTMLElement, b: Box, cls: string) => {
    const r = el('span', cls);
    const pad = 0.015;
    r.style.left = `${(b.x - pad) * 100}%`;
    r.style.top = `${(b.y - pad) * 100}%`;
    r.style.width = `${(b.w + pad * 2) * 100}%`;
    r.style.height = `${(b.h + pad * 2) * 100}%`;
    pane.append(r);
    return r;
  };

  const renderDots = () => {
    dots.replaceChildren();
    for (let i = 0; i < plan.changes.length; i++) dots.append(el('span', found.has(i) ? 'on' : '', found.has(i) ? '✓' : ''));
    dots.setAttribute('aria-label', `${found.size} of ${plan.changes.length} found`);
  };

  /** One furniture piece, fitted into its box (feet on the bottom edge). */
  const piece = (defId: string, b: Box, style: Partial<CSSStyleDeclaration> = {}) => {
    const wrap = el('span', 'spot-item');
    wrap.style.left = `${b.x * 100}%`;
    wrap.style.top = `${b.y * 100}%`;
    wrap.style.width = `${b.w * 100}%`;
    wrap.style.height = `${b.h * 100}%`;
    const img = art(`furn_${defId}`, '', ctx.content.furniture[defId]?.name ?? '');
    Object.assign(img.style, style);
    wrap.append(img);
    return wrap;
  };

  const drawPane = (changed: boolean) => {
    const pane = el('div', 'spot-pane');
    pane.append(art(plan.background, 'spot-bg', changed ? 'Changed picture' : 'Original picture'));
    // Nearer things (lower in the picture) are drawn last.
    const order = [...plan.items.keys()].sort((a, b) => plan.items[a]!.box.y + plan.items[a]!.box.h - (plan.items[b]!.box.y + plan.items[b]!.box.h));
    for (const i of order) {
      const item = plan.items[i]!;
      const c = plan.changes.find((x) => x.item === i);
      if (!c) {
        pane.append(piece(item.defId, item.box));
        continue;
      }
      if (!changed) {
        if (c.kind !== 'added') pane.append(piece(item.defId, item.box));
        continue;
      }
      switch (c.kind) {
        case 'gone':
          break;
        case 'added':
          pane.append(piece(item.defId, item.box));
          break;
        case 'swap':
          pane.append(piece(c.swapTo!, item.box));
          break;
        case 'tint':
          pane.append(piece(item.defId, item.box, { filter: `hue-rotate(${Math.round(c.amount!)}deg) saturate(1.3)` }));
          break;
        case 'size': {
          const s = c.amount!;
          const b = item.box;
          pane.append(piece(item.defId, { x: b.x - (b.w * (s - 1)) / 2, y: b.y - b.h * (s - 1), w: b.w * s, h: b.h * s }));
          break;
        }
        case 'move':
          pane.append(piece(item.defId, { ...item.box, x: item.box.x + c.amount! }));
          break;
        case 'flip':
          pane.append(piece(item.defId, item.box, { transform: 'scaleX(-1)' }));
          break;
      }
    }
    pane.addEventListener('pointerdown', (e) => onTap(pane, changed, e));
    return pane;
  };

  const load = () => {
    between = false;
    found = new Set();
    lastFind = clock.now();
    pair.replaceChildren(...[false, true].map((c) => drawPane(c)));
    panes.length = 0;
    panes.push(...(pair.children as unknown as HTMLElement[]));
    renderDots();
    const n = plan.changes.length;
    ctx.say(scenes === 0 ? `Find the ${n} differences!` : `A new picture: find ${n} more!`);
  };

  const onTap = (pane: HTMLElement, changed: boolean, e: PointerEvent) => {
    e.preventDefault();
    if (between || clock.now() < cooldownUntil) return;
    const p = pointIn(pane, e);
    const x = p.x / pane.clientWidth;
    const y = p.y / pane.clientHeight;
    const hit = plan.changes.findIndex((c, i) => !found.has(i) && inBox(x, y, changed ? c.zoneB : c.zoneA));
    if (hit < 0) {
      // Harder levels pause a little longer after a wrong tap, so tapping everywhere does not pay.
      cooldownUntil = clock.now() + ctx.tune([400, 700, 1000]);
      const rip = el('span', 'spot-miss');
      rip.style.left = `${p.x}px`;
      rip.style.top = `${p.y}px`;
      pane.append(rip);
      window.setTimeout(() => rip.remove(), 600);
      nudge(pane, true);
      return;
    }
    found.add(hit);
    lastFind = clock.now();
    const c = plan.changes[hit]!;
    ring(panes[0]!, c.zoneA, 'spot-ring');
    ring(panes[1]!, c.zoneB, 'spot-ring');
    const inField = pointIn(field, e);
    ctx.addScore(FIND_POINTS, inField);
    sparkle(field, inField, 70, reduced);
    renderDots();
    if (found.size === plan.changes.length) {
      between = true;
      ctx.addScore(SCENE_BONUS);
      ctx.say('All of them!');
      scenes += 1;
      plan = next();
      clock.after(1100, load);
    }
  };

  // A soft hint on one change after a while without a find.
  const hintTimer = clock.every(1000, () => {
    if (between || clock.now() - lastFind < tune.hintAfter) return;
    const i = plan.changes.findIndex((_, k) => !found.has(k));
    if (i < 0 || !panes[1]) return;
    const h = ring(panes[1], plan.changes[i]!.zoneB, 'spot-hint');
    window.setTimeout(() => h.remove(), 1600);
    lastFind = clock.now() - tune.hintAfter + 8000;
  });

  load();
  return { destroy: () => clock.cancel(hintTimer) };
};
