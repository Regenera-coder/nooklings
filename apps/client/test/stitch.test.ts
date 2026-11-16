import { describe, expect, it } from 'vitest';
import { roundOrder, STITCH_PATTERNS } from '../src/arcade/games/stitch';

type Pt = [number, number];
const cross = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
/** Do segments ab and cd properly cross (not just touch at an end)? */
const crosses = (a: Pt, b: Pt, c: Pt, d: Pt) => cross(a, b, c) * cross(a, b, d) < -1e-12 && cross(c, d, a) * cross(c, d, b) < -1e-12;

describe('stitch patterns', () => {
  it('there are twelve or more, with unique names', () => {
    expect(STITCH_PATTERNS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(STITCH_PATTERNS.map((p) => p.name)).size).toBe(STITCH_PATTERNS.length);
  });

  for (const p of STITCH_PATTERNS) {
    it(`${p.name}: a closed outline inside the hoop that never crosses itself`, () => {
      const path = p.path as Pt[];
      expect(path[0]![0]).toBeCloseTo(path[path.length - 1]![0], 9);
      expect(path[0]![1]).toBeCloseTo(path[path.length - 1]![1], 9);
      for (const [x, y] of path) {
        // The fabric is round: every point stays well inside the hoop.
        expect(Math.hypot(x - 0.5, y - 0.5)).toBeLessThanOrEqual(0.34);
      }
      const n = path.length - 1;
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue;
          expect(crosses(path[i]!, path[i + 1]!, path[j]!, path[j + 1]!), `${p.name} segments ${i} and ${j}`).toBe(false);
        }
      }
    });

    it(`${p.name}: dots are far enough apart to tell which is next`, () => {
      const path = p.path as Pt[];
      const length = path.slice(1).reduce((sum, q, i) => sum + Math.hypot(q[0] - path[i]![0], q[1] - path[i]![1]), 0);
      // Average gap between dots, as a share of the hoop width. The tap radius is 4.5%.
      expect(length / p.dots).toBeGreaterThan(0.05);
      expect(length / p.dots).toBeLessThan(0.11);
    });
  }

  it('a round starts easy, gets harder, and uses every pattern once', () => {
    for (let k = 0; k < 20; k++) {
      const order = roundOrder();
      expect(order.map((p) => p.name).sort()).toEqual(STITCH_PATTERNS.map((p) => p.name).sort());
      for (let i = 1; i < order.length; i++) expect(order[i]!.level).toBeGreaterThanOrEqual(order[i - 1]!.level);
    }
  });
});
