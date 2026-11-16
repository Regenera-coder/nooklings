import { artUrl } from '../../assets';
import { art, el, pointIn, sparkle, type GameFactory } from '../engine';

type Pt = [number, number];

/** Closed outlines in unit coordinates (0..1 across the fabric inside the hoop). */
function polygon(points: Pt[]): Pt[] {
  return [...points, points[0]!];
}
function curve(f: (t: number) => Pt, steps = 120): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => f((i / steps) * Math.PI * 2));
}

/** Points along a circle arc from angle a0 to a1 (degrees, 0 = right, 90 = down), without the last point. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, steps = 24, ry = r): Pt[] {
  return Array.from({ length: steps }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * ry] as Pt;
  });
}

interface Pattern {
  name: string;
  /** Finished embroidery art. Until a pattern's picture is imported, its stitched outline is filled in instead. */
  done?: string;
  path: Pt[];
  dots: number;
  /** 1 = straight and short, 3 = long and curvy. A round starts easy and gets harder. */
  level: 1 | 2 | 3;
}

/** Every pattern is one closed outline that never crosses itself, so the next dot is always clear. */
const PATTERNS: Pattern[] = [
  { name: 'cottage', done: 'game_stitch_done_04', dots: 16, level: 1, path: polygon([[0.3, 0.72], [0.3, 0.45], [0.5, 0.27], [0.7, 0.45], [0.7, 0.72]]) },
  { name: 'button', done: 'game_stitch_done_05', dots: 16, level: 1, path: polygon(arc(0.5, 0.5, 0.22, -90, 270, 60)) },
  { name: 'gem', done: 'game_stitch_done_06', dots: 16, level: 1, path: polygon([[0.5, 0.76], [0.26, 0.44], [0.37, 0.28], [0.63, 0.28], [0.74, 0.44]]) },
  { name: 'leaf', done: 'game_stitch_done_07', dots: 18, level: 1, path: polygon([...arc(0.33, 0.5, 0.34, -60, 60, 30), ...arc(0.67, 0.5, 0.34, 120, 240, 30)]) },
  {
    name: 'star', done: 'game_stitch_done_03', dots: 20, level: 2,
    path: polygon(Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 0.26 : 0.11;
      return [0.5 + Math.cos(a) * r, 0.52 + Math.sin(a) * r] as Pt;
    })),
  },
  {
    name: 'heart', done: 'game_stitch_done_02', dots: 20, level: 2,
    path: curve((t) => {
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return [0.5 + x * 0.0155, 0.48 - y * 0.0155];
    }),
  },
  // A raindrop: pointed at the top, round at the bottom.
  { name: 'raindrop', done: 'game_stitch_done_08', dots: 18, level: 2, path: polygon([[0.5, 0.24], ...arc(0.5, 0.58, 0.17, -35, 215, 40)]) },
  // A crescent moon: the outer curve round the left, then the inner curve back up (two circles that meet at the tips).
  { name: 'moon', done: 'game_stitch_done_09', dots: 20, level: 2, path: polygon([...arc(0.46, 0.5, 0.26, -52.6, -307.4, 44), ...arc(0.58, 0.5, 0.21, 79.6, 280.4, 30)]) },
  { name: 'crown', done: 'game_stitch_done_10', dots: 20, level: 2, path: polygon([[0.26, 0.68], [0.24, 0.36], [0.38, 0.5], [0.5, 0.3], [0.62, 0.5], [0.76, 0.36], [0.74, 0.68]]) },
  // A mushroom: a round cap on a short stem.
  { name: 'mushroom', done: 'game_stitch_done_11', dots: 22, level: 2, path: polygon([[0.43, 0.74], [0.43, 0.54], [0.25, 0.54], ...arc(0.5, 0.54, 0.25, 180, 360, 30, 0.24), [0.75, 0.54], [0.57, 0.54], [0.57, 0.74]]) },
  // A fish: a round body with a tail fin.
  { name: 'fish', done: 'game_stitch_done_12', dots: 24, level: 3, path: polygon([...arc(0.45, 0.5, 0.2, 30, 330, 40, 0.14), [0.623, 0.43], [0.78, 0.36], [0.71, 0.5], [0.78, 0.64]]) },
  // A cat's head: round face, two pointed ears.
  { name: 'cat', done: 'game_stitch_done_13', dots: 26, level: 3, path: polygon([...arc(0.5, 0.56, 0.22, -30, 210, 40, 0.2), [0.309, 0.46], [0.3, 0.27], [0.41, 0.39], [0.59, 0.39], [0.7, 0.27]]) },
  // A cloud: three puffs over a flat base.
  { name: 'cloud', done: 'game_stitch_done_14', dots: 26, level: 3, path: polygon([[0.3, 0.64], ...arc(0.33, 0.54, 0.1, 100, 290, 16), ...arc(0.48, 0.44, 0.13, 200, 350, 18), ...arc(0.65, 0.52, 0.12, 250, 440, 18), [0.7, 0.64]]) },
  {
    name: 'flower', done: 'game_stitch_done_01', dots: 26, level: 3,
    path: curve((t) => {
      const r = 0.17 + 0.08 * Math.cos(5 * t);
      return [0.5 + Math.cos(t - Math.PI / 2) * r, 0.5 + Math.sin(t - Math.PI / 2) * r];
    }, 200),
  },
];

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** A fresh order for one round: easy patterns first, then harder, shuffled within each step so rounds differ. */
export function roundOrder(): Pattern[] {
  return ([1, 2, 3] as const).flatMap((level) => shuffled(PATTERNS.filter((p) => p.level === level)));
}

export const STITCH_PATTERNS: ReadonlyArray<Pattern> = PATTERNS;

/** Evenly spaced points along a path (by length). */
function sample(path: Pt[], n: number): Pt[] {
  const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i]![0], p[1] - path[i]![1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    let d = (k / n) * total;
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]!) d -= seg[i++]!;
    const t = seg[i]! > 0 ? d / seg[i]! : 0;
    const a = path[i]!;
    const b = path[i + 1]!;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

const SVGNS = 'http://www.w3.org/2000/svg';

/**
 * Stitch-a-Pattern (Patcha): drag a finger along the dotted line, dot after dot, to stitch
 * the motif (tapping the dots in order works too). Each stitch is 1 point; finishing a
 * pattern adds 10 plus a quick-finish bonus, and shows the finished embroidery.
 */
export const stitch: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  field.classList.add('g-stitch');
  const hoop = el('div', 'stitch-hoop');
  const fabric = art('game_stitch_fabric', 'stitch-fabric');
  const done = el('div', 'stitch-done');
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.classList.add('stitch-svg');
  const needle = art('game_stitch_needle', 'stitch-needle');
  hoop.append(fabric, done, svg, needle);
  field.append(hoop);

  let order = roundOrder();
  let patternIndex = 0;
  let current: Pattern = order[0]!;
  let fill: SVGPolygonElement | null = null;
  let dots: Pt[] = [];
  let next = 0;
  let startedAt = 0;
  let dotEls: SVGCircleElement[] = [];
  let thread: SVGPolylineElement | null = null;
  let finishing = false;

  const load = () => {
    if (patternIndex >= order.length) {
      // Stitched everything: start again in a new order.
      order = roundOrder();
      patternIndex = 0;
    }
    const p = (current = order[patternIndex]!);
    dots = sample(p.path, p.dots);
    next = 0;
    finishing = false;
    startedAt = clock.now();
    needle.style.opacity = '';
    done.replaceChildren();
    done.classList.remove('show');
    svg.replaceChildren();
    const guide = document.createElementNS(SVGNS, 'polyline');
    guide.setAttribute('points', [...dots, dots[0]!].map(([x, y]) => `${x * 1000},${y * 1000}`).join(' '));
    guide.classList.add('stitch-guide');
    fill = document.createElementNS(SVGNS, 'polygon');
    fill.setAttribute('points', p.path.map(([x, y]) => `${x * 1000},${y * 1000}`).join(' '));
    fill.classList.add('stitch-fill');
    thread = document.createElementNS(SVGNS, 'polyline');
    thread.classList.add('stitch-thread');
    svg.append(fill, guide, thread);
    dotEls = dots.map(([x, y], i) => {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', String(x * 1000));
      c.setAttribute('cy', String(y * 1000));
      c.setAttribute('r', '16');
      c.classList.add('stitch-dot');
      if (i === 0) c.classList.add('next');
      svg.append(c);
      return c;
    });
    placeNeedle(dots[0]!);
    ctx.say(`Stitch the ${p.name}! Start at the glowing dot.`);
  };

  const placeNeedle = ([x, y]: Pt) => {
    needle.style.left = `${x * 100}%`;
    needle.style.top = `${y * 100}%`;
  };

  const stitchDot = () => {
    const c = dotEls[next]!;
    c.classList.remove('next');
    c.classList.add('sewn');
    next += 1;
    ctx.addScore(1);
    const sewn = dots.slice(0, next);
    if (next === dots.length) sewn.push(dots[0]!);
    thread?.setAttribute('points', sewn.map(([x, y]) => `${x * 1000},${y * 1000}`).join(' '));
    placeNeedle(sewn[sewn.length - 1]!);
    if (next < dots.length) {
      dotEls[next]!.classList.add('next');
      return;
    }
    finishing = true;
    const p = current;
    const seconds = (clock.now() - startedAt) / 1000;
    ctx.addScore(10 + Math.max(0, 8 - Math.floor(seconds / 2)), hoop);
    if (p.done && artUrl(p.done)) {
      done.append(art(p.done, '', `Finished ${p.name}`));
      done.classList.add('show');
    } else {
      // No embroidery picture for this one: the outline becomes a solid seam and fills with thread colour.
      thread?.setAttribute('points', [...p.path].map(([x, y]) => `${x * 1000},${y * 1000}`).join(' '));
      thread?.classList.add('done');
      fill?.classList.add('show');
      for (const c of dotEls) c.style.opacity = '0';
      needle.style.opacity = '0';
    }
    const r = hoop.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    sparkle(field, { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 }, 160, reduced);
    ctx.say('Beautiful!');
    patternIndex += 1;
    clock.after(reduced ? 900 : 1400, load);
  };

  // Hit radius in hoop pixels: at least 22 CSS px so small fingers can follow the line.
  const tryAt = (ev: PointerEvent) => {
    if (finishing || next >= dots.length) return;
    const r = hoop.getBoundingClientRect();
    const p = pointIn(hoop, ev);
    const radius = Math.max(22, r.width * 0.045);
    // Allow catching up to two dots in one fast movement.
    for (let k = 0; k < 2 && next < dots.length; k++) {
      const [x, y] = dots[next]!;
      if (Math.hypot(p.x - x * r.width, p.y - y * r.height) <= radius) stitchDot();
      else break;
    }
  };
  hoop.style.touchAction = 'none';
  let tracing = false;
  hoop.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    hoop.setPointerCapture?.(e.pointerId);
    tracing = true;
    tryAt(e);
  });
  hoop.addEventListener('pointermove', (e) => {
    if (tracing && !clock.isPaused) tryAt(e);
  });
  const stop = () => {
    tracing = false;
  };
  hoop.addEventListener('pointerup', stop);
  hoop.addEventListener('pointercancel', stop);

  load();
  return {};
};
