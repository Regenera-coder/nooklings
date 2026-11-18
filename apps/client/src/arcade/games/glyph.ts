import { art, el, nudge, pick, shuffle, sparkle, centreIn, type GameFactory } from '../engine';

/** The twelve stitched symbols, in file order (game_glyph_01 ... _12). */
const SYMBOLS = ['sun', 'moon', 'leaf', 'drop', 'flame', 'house', 'bird', 'fish', 'key', 'star', 'heart', 'spiral'];

interface Puzzle {
  /** Symbols in the row; null marks the gap to fill. */
  row: Array<number | null>;
  answer: number;
  /** Key puzzles show pairs "a -> b" on the scroll and ask for the partner of one symbol. */
  key?: Array<[number, number]>;
  options: number[];
}

/** Repeating patterns, easiest first. Letters are slots in the repeating unit. */
const PATTERNS = ['AB', 'ABC', 'AAB', 'ABB', 'AABB', 'ABCD', 'ABAC'];

/** Easy, Normal, Hard: where the puzzles start, how many choices, how often a key puzzle comes. */
const TUNE = [
  { start: 0, extraOptions: 0, keyEvery: 3, laterPoints: 5 },
  { start: 2, extraOptions: 1, keyEvery: 3, laterPoints: 3 },
  { start: 4, extraOptions: 2, keyEvery: 2, laterPoints: 0 },
];

export function makePuzzle(level: number, extraOptions = 0, keyEvery = 3): Puzzle {
  const optionCount = (level < 3 ? 3 : 4) + extraOptions;
  // From the fourth puzzle on, some are "decode with the key" puzzles.
  if (level >= 3 && level % keyEvery === 0) {
    const syms = shuffle([...SYMBOLS.keys()]).slice(0, 6);
    const key: Array<[number, number]> = [[syms[0]!, syms[1]!], [syms[2]!, syms[3]!], [syms[4]!, syms[5]!]];
    const [ask, answer] = pick(key);
    const others = shuffle(syms.filter((s) => s !== answer && s !== ask)).slice(0, optionCount - 1);
    return { row: [ask, null], answer, key, options: shuffle([answer, ...others]) };
  }
  // Later puzzles pick from the harder patterns at random, so the order is never the same.
  const top = Math.min(PATTERNS.length - 1, Math.floor(level / 2));
  const pattern = PATTERNS[level < 4 ? top : Math.max(0, top - Math.floor(Math.random() * 3))]!;
  const letters = [...new Set(pattern)];
  const syms = shuffle([...SYMBOLS.keys()]).slice(0, letters.length);
  const map = new Map(letters.map((l, i) => [l, syms[i]!]));
  const length = Math.max(5, pattern.length + Math.ceil(pattern.length / 2) + 1);
  const full = Array.from({ length }, (_, i) => map.get(pattern[i % pattern.length]!)!);
  // Early puzzles ask for the last symbol; later the gap can be anywhere after the first unit.
  const gap = level < 4 ? length - 1 : pattern.length + Math.floor(Math.random() * (length - pattern.length));
  const answer = full[gap]!;
  const row: Array<number | null> = full.map((s, i) => (i === gap ? null : s));
  const pool = shuffle([...SYMBOLS.keys()].filter((s) => s !== answer));
  // Distractors: the pattern's other symbols first (so it needs a real look), then random ones.
  const near = syms.filter((s) => s !== answer);
  const others = [...new Set([...near, ...pool])].slice(0, optionCount - 1);
  return { row, answer, options: shuffle([answer, ...others]) };
}

/**
 * Glyph Garden (Patcha): a row of stitched symbols on the scroll has a gap; pick the symbol
 * that completes the pattern. Some puzzles decode a symbol using the key shown on the scroll.
 * First try 10 points, later tries 5. Wrong picks just wiggle and fade.
 */
export const glyph: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  const t = TUNE[ctx.level]!;
  field.classList.add('g-glyph');
  const scroll = el('div', 'glyph-scroll');
  scroll.append(art('game_glyph_scroll', 'glyph-scroll-bg'));
  const rowEl = el('div', 'glyph-row');
  scroll.append(rowEl);
  const options = el('div', 'glyph-options');
  field.append(scroll, options);
  let level = t.start;
  let tries = 0;
  let locked = false;

  const tile = (sym: number | null, cls = 'glyph-tile') => {
    const t = el('span', cls);
    if (sym === null) {
      t.append(art('game_glyph_tile'), el('b', 'glyph-q', '?'));
      t.setAttribute('aria-label', 'Missing symbol');
    } else {
      t.append(art(`game_glyph_${String(sym + 1).padStart(2, '0')}`, '', SYMBOLS[sym]));
    }
    return t;
  };

  const show = () => {
    const p = makePuzzle(level, t.extraOptions, t.keyEvery);
    tries = 0;
    locked = false;
    rowEl.replaceChildren();
    rowEl.classList.toggle('keyed', !!p.key);
    if (p.key) {
      const keyRow = el('div', 'glyph-key');
      for (const [a, b] of p.key) {
        const pair = el('span', 'glyph-pair');
        pair.append(tile(a, 'glyph-tile small'), el('i', 'glyph-arrow', '→'), tile(b, 'glyph-tile small'));
        keyRow.append(pair);
      }
      const ask = el('div', 'glyph-ask');
      ask.append(tile(p.row[0]!), el('i', 'glyph-arrow', '→'), tile(null));
      rowEl.append(keyRow, ask);
      ctx.say('Use the key: which symbol goes with this one?');
    } else {
      for (const s of p.row) rowEl.append(tile(s));
      ctx.say('Which symbol comes next in the pattern?');
    }
    options.replaceChildren();
    for (const s of p.options) {
      const b = el('button', 'glyph-opt');
      b.append(tile(s));
      b.setAttribute('aria-label', SYMBOLS[s]!);
      b.addEventListener('click', () => {
        if (locked || b.disabled) return;
        if (s === p.answer) {
          locked = true;
          const gap = rowEl.querySelector('.glyph-q')?.parentElement;
          if (gap) {
            gap.replaceWith(tile(s, 'glyph-tile filled'));
          }
          if (tries === 0 || t.laterPoints) ctx.addScore(tries === 0 ? 10 : t.laterPoints, b);
          sparkle(field, centreIn(field, b), 80, reduced);
          level += 1;
          clock.after(reduced ? 500 : 750, show);
        } else {
          tries += 1;
          b.disabled = true;
          b.classList.add('faded');
          nudge(b, reduced);
        }
      });
      options.append(b);
    }
  };

  show();
  return {};
};
