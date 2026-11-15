import { art, el, nudge, pointIn, sparkle, type GameFactory } from '../engine';

/**
 * Tap zones, one per difference, as boxes in the 1200x1040 scene images. Measured from the
 * circles ChatGPT drew on game_spot_scene_0N_diffs.png (each circle's outer bounds).
 */
export const SPOT_ZONES: Array<Array<[number, number, number, number]>> = [
  [[887, 48, 1200, 329], [663, 473, 899, 694], [507, 28, 724, 249], [127, 143, 314, 339], [42, 508, 234, 669]],
  [[17, 638, 299, 804], [892, 147, 1094, 319], [112, 163, 309, 349], [832, 453, 1044, 594], [327, 448, 479, 579]],
  [[917, 83, 1184, 284], [618, 558, 839, 749], [107, 148, 294, 349], [67, 483, 269, 614], [982, 583, 1164, 719]],
];
const W = 1200;
const H = 1040;
const FIND_POINTS = 10;
const SCENE_BONUS = 10;

/** Is a point (in scene pixels) inside the ellipse that fits a zone box (with a little slack)? */
export function inZone(x: number, y: number, [x0, y0, x1, y1]: [number, number, number, number], slack = 24): boolean {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = (x1 - x0) / 2 + slack;
  const ry = (y1 - y0) / 2 + slack;
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

/**
 * Spot the Difference (Mischi): the left picture is the original, the right one has five
 * changes. Tap a change in either picture (10 points each, 10 more for finding all five).
 * Wrong taps only show a soft ripple. After a while without a find, a gentle sparkle hints.
 */
export const spot: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  field.classList.add('g-spot');
  const pair = el('div', 'spot-pair');
  const dots = el('div', 'spot-dots');
  field.append(pair, dots);

  let scene = 0;
  let found = new Set<number>();
  let lastFind = 0;
  let cooldownUntil = 0;
  let hintTimer = 0;
  const panes: HTMLElement[] = [];

  const ring = (pane: HTMLElement, zone: [number, number, number, number], cls: string) => {
    const r = el('span', cls);
    r.style.left = `${(zone[0] / W) * 100}%`;
    r.style.top = `${(zone[1] / H) * 100}%`;
    r.style.width = `${((zone[2] - zone[0]) / W) * 100}%`;
    r.style.height = `${((zone[3] - zone[1]) / H) * 100}%`;
    pane.append(r);
    return r;
  };

  const renderDots = () => {
    dots.replaceChildren();
    for (let i = 0; i < 5; i++) dots.append(el('span', found.has(i) ? 'on' : '', found.has(i) ? '✓' : ''));
    dots.setAttribute('aria-label', `${found.size} of 5 found`);
  };

  const load = () => {
    found = new Set();
    lastFind = clock.now();
    pair.replaceChildren();
    panes.length = 0;
    const n = String(scene + 1).padStart(2, '0');
    for (const side of ['a', 'b']) {
      const pane = el('div', 'spot-pane');
      pane.append(art(`game_spot_scene_${n}_${side}`, '', side === 'a' ? 'Original picture' : 'Changed picture'));
      pane.addEventListener('pointerdown', (e) => onTap(pane, e));
      pair.append(pane);
      panes.push(pane);
    }
    renderDots();
    ctx.say(scene === 0 ? 'Find the 5 differences!' : `Picture ${scene + 1}: find 5 more!`);
  };

  const onTap = (pane: HTMLElement, e: PointerEvent) => {
    e.preventDefault();
    if (clock.now() < cooldownUntil) return;
    const p = pointIn(pane, e);
    const x = (p.x / pane.clientWidth) * W;
    const y = (p.y / pane.clientHeight) * H;
    const zones = SPOT_ZONES[scene]!;
    const hit = zones.findIndex((z, i) => !found.has(i) && inZone(x, y, z));
    if (hit < 0) {
      cooldownUntil = clock.now() + 500;
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
    for (const pn of panes) ring(pn, zones[hit]!, 'spot-ring');
    const inField = pointIn(field, e);
    ctx.addScore(FIND_POINTS, inField);
    sparkle(field, inField, 70, reduced);
    renderDots();
    if (found.size === zones.length) {
      ctx.addScore(SCENE_BONUS);
      ctx.say('All five!');
      scene += 1;
      if (scene >= SPOT_ZONES.length) clock.after(900, () => ctx.end());
      else clock.after(1100, load);
    }
  };

  // A soft hint sparkle on one unfound change after 18 seconds without a find.
  hintTimer = clock.every(1000, () => {
    if (clock.now() - lastFind < 18_000 || scene >= SPOT_ZONES.length) return;
    const zones = SPOT_ZONES[scene]!;
    const i = zones.findIndex((_, k) => !found.has(k));
    if (i < 0 || !panes[1]) return;
    const h = ring(panes[1], zones[i]!, 'spot-hint');
    window.setTimeout(() => h.remove(), 1600);
    lastFind = clock.now() - 10_000; // next hint in about 8 seconds
  });

  load();
  return { destroy: () => clock.cancel(hintTimer) };
};
