import { art, el, pointIn, sparkle, type GameFactory } from '../engine';

type Pt = [number, number];

/** Closed outlines in unit coordinates (0..1 across the fabric inside the hoop). */
function polygon(points: Pt[]): Pt[] {
  return [...points, points[0]!];
}
function curve(f: (t: number) => Pt, steps = 120): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => f((i / steps) * Math.PI * 2));
}

/** Patterns get curvier: cottage, star, heart, flower. Each pairs with its finished embroidery. */
const PATTERNS: Array<{ name: string; done: string; path: Pt[]; dots: number }> = [
  { name: 'cottage', done: 'game_stitch_done_04', dots: 16, path: polygon([[0.3, 0.72], [0.3, 0.45], [0.5, 0.27], [0.7, 0.45], [0.7, 0.72]]) },
  {
    name: 'star', done: 'game_stitch_done_03', dots: 20,
    path: polygon(Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 0.26 : 0.11;
      return [0.5 + Math.cos(a) * r, 0.52 + Math.sin(a) * r] as Pt;
    })),
  },
  {
    name: 'heart', done: 'game_stitch_done_02', dots: 20,
    path: curve((t) => {
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return [0.5 + x * 0.0155, 0.48 - y * 0.0155];
    }),
  },
  {
    name: 'flower', done: 'game_stitch_done_01', dots: 26,
    path: curve((t) => {
      const r = 0.17 + 0.08 * Math.cos(5 * t);
      return [0.5 + Math.cos(t - Math.PI / 2) * r, 0.5 + Math.sin(t - Math.PI / 2) * r];
    }, 200),
  },
];

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

  let patternIndex = 0;
  let dots: Pt[] = [];
  let next = 0;
  let startedAt = 0;
  let dotEls: SVGCircleElement[] = [];
  let thread: SVGPolylineElement | null = null;
  let finishing = false;

  const load = () => {
    const p = PATTERNS[patternIndex % PATTERNS.length]!;
    dots = sample(p.path, p.dots);
    next = 0;
    finishing = false;
    startedAt = clock.now();
    done.replaceChildren();
    done.classList.remove('show');
    svg.replaceChildren();
    const guide = document.createElementNS(SVGNS, 'polyline');
    guide.setAttribute('points', [...dots, dots[0]!].map(([x, y]) => `${x * 1000},${y * 1000}`).join(' '));
    guide.classList.add('stitch-guide');
    thread = document.createElementNS(SVGNS, 'polyline');
    thread.classList.add('stitch-thread');
    svg.append(guide, thread);
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
    const p = PATTERNS[patternIndex % PATTERNS.length]!;
    const seconds = (clock.now() - startedAt) / 1000;
    ctx.addScore(10 + Math.max(0, 8 - Math.floor(seconds / 2)), hoop);
    done.append(art(p.done, '', `Finished ${p.name}`));
    done.classList.add('show');
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
