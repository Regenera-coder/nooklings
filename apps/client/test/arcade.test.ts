import { describe, expect, it } from 'vitest';
import { contentWithSeries2 as content } from '@nooklings/content';
import { planScene, spotPieces, SPOT_LEVELS, type Box } from '../src/arcade/games/spot';
import { makeRecipe } from '../src/arcade/games/kitchen';
import { STITCH_PATTERNS, turnPoint } from '../src/arcade/games/stitch';
import { makePuzzle } from '../src/arcade/games/glyph';

/** A small seeded random number source, so a failing case can be repeated. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pieces = spotPieces(content, () => true);
const backgrounds = [
  { key: 'room_living_background', wall: true },
  { key: 'room_yard_background', wall: false },
];
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('Spot the Difference pictures', () => {
  it('has plenty of furniture to build pictures from', () => {
    expect(pieces.filter((p) => p.layer === 'floor').length).toBeGreaterThan(20);
    expect(pieces.filter((p) => p.layer === 'wall').length).toBeGreaterThan(5);
  });

  for (const level of [0, 1, 2] as const) {
    it(`level ${level}: every picture has the right number of separate changes, inside the picture`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const plan = planScene(pieces, backgrounds, level, seeded(seed), new Set(pieces.map((p) => p.id)));
        expect(plan.changes.length, `seed ${seed}`).toBe(SPOT_LEVELS[level].changes);
        expect(new Set(plan.changes.map((c) => c.item)).size).toBe(plan.changes.length);
        for (const item of plan.items) {
          expect(item.box.x).toBeGreaterThanOrEqual(0);
          expect(item.box.x + item.box.w).toBeLessThanOrEqual(1);
          expect(item.box.y + item.box.h).toBeLessThanOrEqual(1);
        }
        // Items never sit on top of each other, so every change is clear to see.
        for (let i = 0; i < plan.items.length; i++) {
          for (let j = i + 1; j < plan.items.length; j++) expect(overlap(plan.items[i]!.box, plan.items[j]!.box), `seed ${seed}`).toBe(false);
        }
        if (plan.background === 'room_yard_background') expect(plan.items.every((i) => i.layer === 'floor')).toBe(true);
      }
    });
  }

  it('is different every time', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      const plan = planScene(pieces, backgrounds, 1, seeded(seed));
      seen.add(JSON.stringify(plan.changes.map((c) => [c.kind, plan.items[c.item]!.defId])));
    }
    expect(seen.size).toBe(50);
  });

  it('uses many kinds of change, and harder levels use subtler ones', () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) for (const c of planScene(pieces, backgrounds, 2, seeded(seed), new Set(pieces.map((p) => p.id))).changes) kinds.add(c.kind);
    expect([...kinds].sort()).toEqual(['added', 'flip', 'gone', 'move', 'size', 'swap', 'tint']);
    expect(SPOT_LEVELS[2].size).toBeLessThan(SPOT_LEVELS[0].size);
    expect(SPOT_LEVELS[2].tint[1]).toBeLessThan(SPOT_LEVELS[0].tint[0]);
  });

  it('never mirrors a piece that looks the same mirrored', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const plan = planScene(pieces, backgrounds, 2, seeded(seed), new Set(['cozy_sofa']));
      for (const c of plan.changes) if (c.kind === 'flip') expect(plan.items[c.item]!.defId).toBe('cozy_sofa');
    }
  });
});

describe('Cosy Kitchen recipes', () => {
  it('change from one time to the next', () => {
    const versions = new Set<string>();
    for (let i = 0; i < 60; i++) versions.add(JSON.stringify(makeRecipe('pancakes', 1).steps));
    expect(versions.size).toBeGreaterThan(8);
  });

  it('ask for more on harder levels', () => {
    const berries = (level: number) => {
      let total = 0;
      for (let i = 0; i < 200; i++) {
        const s = makeRecipe('tart', level).steps.find((x) => x.kind === 'add' && x.item === 'berry');
        total += s && s.kind === 'add' ? s.count ?? 1 : 0;
      }
      return total / 200;
    };
    expect(berries(2)).toBeGreaterThan(berries(0) + 1.5);
  });

  it('always end with every ingredient used and the right tools', () => {
    for (const id of ['tart', 'soup', 'pancakes'] as const) {
      for (let i = 0; i < 50; i++) {
        const r = makeRecipe(id, i % 3);
        expect(r.steps.length).toBeGreaterThanOrEqual(4);
        if (id === 'soup') expect(r.steps.filter((s) => s.kind === 'chop')).toHaveLength(2);
        if (id === 'pancakes') expect(r.steps.findIndex((s) => s.kind === 'add' && s.item === 'bowl')).toBeGreaterThan(r.steps.findIndex((s) => s.kind === 'stir'));
      }
    }
  });
});

describe('Stitch-a-Pattern turns', () => {
  it('keeps every turned, mirrored pattern inside the hoop', () => {
    for (const p of STITCH_PATTERNS) {
      for (const degrees of [-45, -20, 0, 30, 45]) {
        for (const mirror of [false, true]) {
          for (const [x, y] of p.path) {
            const [tx, ty] = turnPoint([x, y], { degrees, mirror, scale: 1 });
            expect(Math.hypot(tx - 0.5, ty - 0.5)).toBeLessThanOrEqual(0.341);
          }
        }
      }
    }
  });

  it('matches the CSS turn: a quarter turn takes the top to the right', () => {
    const [x, y] = turnPoint([0.5, 0.2], { degrees: 90, mirror: false, scale: 1 });
    expect(x).toBeCloseTo(0.8, 9);
    expect(y).toBeCloseTo(0.5, 9);
    const [mx] = turnPoint([0.7, 0.5], { degrees: 0, mirror: true, scale: 1 });
    expect(mx).toBeCloseTo(0.3, 9);
  });
});

describe('Glyph Garden', () => {
  it('offers more choices on harder levels, always with the answer among them', () => {
    for (let i = 0; i < 100; i++) {
      const easy = makePuzzle(1, 0, 3);
      const hard = makePuzzle(5, 2, 2);
      expect(easy.options).toContain(easy.answer);
      expect(hard.options).toContain(hard.answer);
      expect(new Set(hard.options).size).toBe(hard.options.length);
      expect(hard.options.length).toBeGreaterThan(easy.options.length);
    }
  });
});
