import { artUrl } from '../../assets';
import { art, el, pick, shuffle, type GameFactory } from '../engine';

/** Card faces (sixteen drawn cards; a board picks a random set, so every board mixes different faces). */
export const FACE_NAMES = ['button', 'spool', 'teacup', 'star', 'leaf', 'moon', 'key', 'heart', 'acorn', 'mushroom', 'teapot', 'snail', 'cloud', 'cherries', 'bell', 'feather'];
const FACE_ART: Array<[string, string]> = FACE_NAMES.map((name, i) => [name, `game_memory_face_${String(i + 1).padStart(2, '0')}`]);
/** Pairs on each board for Easy, Normal and Hard. */
const BOARDS: readonly [number[], number[], number[]] = [[6, 8], [8, 10], [10, 12]];
const PAIR_POINTS = 5;
const CLEAR_BONUS = 10;

/** Chooses columns x rows that give the biggest 2:3 cards in the field. */
function bestGrid(cards: number, w: number, h: number, gap: number): { cols: number; rows: number; cw: number } {
  let best = { cols: cards, rows: 1, cw: 0 };
  for (let rows = 1; rows <= cards; rows++) {
    if (cards % rows) continue;
    const cols = cards / rows;
    const cw = Math.min((w - gap * (cols - 1)) / cols, ((h - gap * (rows - 1)) / rows) * (2 / 3));
    if (cw > best.cw) best = { cols, rows, cw };
  }
  return best;
}

/**
 * Memory Match (Tinker): flip two cards to find pairs. Each pair is 5 points; clearing a
 * board adds up to 10 more (one less for each mismatch). Clearing both boards ends the
 * round with a small bonus for time left.
 */
export const memory: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  field.classList.add('g-memory');
  const faces = FACE_ART.filter(([, key]) => artUrl(key));
  const sizes = ctx.tune(BOARDS);
  let board = 0;
  let misses = 0;
  let open: HTMLButtonElement[] = [];
  let busy = false;
  let found = 0;
  let grid: HTMLElement | null = null;

  const deal = () => {
    const pairs = Math.min(sizes[board]!, faces.length);
    found = 0;
    misses = 0;
    open = [];
    grid?.remove();
    grid = el('div', 'mem-grid');
    const chosen = shuffle(faces).slice(0, pairs);
    const deck = shuffle([...chosen, ...chosen]);
    // Leave room at the top for the line under the score bar.
    const g = bestGrid(deck.length, field.clientWidth - 24, field.clientHeight - 44, 8);
    grid.style.gridTemplateColumns = `repeat(${g.cols}, ${Math.floor(g.cw)}px)`;
    for (const [face, key] of deck) {
      const card = el('button', 'mem-card');
      card.dataset.face = face;
      card.setAttribute('aria-label', 'Hidden card');
      card.style.width = `${Math.floor(g.cw)}px`;
      card.style.height = `${Math.floor(g.cw * 1.5)}px`;
      const inner = el('span', 'mem-inner');
      const back = el('span', 'mem-side mem-back');
      back.append(art('game_memory_back'));
      const front = el('span', 'mem-side mem-front');
      front.append(art(key, '', face));
      inner.append(back, front);
      card.append(inner);
      card.addEventListener('click', () => flip(card));
      grid.append(card);
    }
    field.append(grid);
    ctx.say(board === 0 ? 'Find the pairs!' : 'A bigger board!');
    // Easy: a quick look at every card first.
    if (ctx.level === 0) {
      busy = true;
      const cards = [...grid.children] as HTMLElement[];
      cards.forEach((c) => c.classList.add('up'));
      ctx.say('Have a quick look…');
      clock.after(1600, () => {
        cards.forEach((c) => c.classList.remove('up'));
        busy = false;
        ctx.say('Find the pairs!');
      });
    }
  };

  /** Hard: after a wrong pair, two face-down cards quietly trade places. */
  const swapTwo = () => {
    if (!grid) return;
    const hidden = ([...grid.children] as HTMLElement[]).filter((c) => !c.classList.contains('done') && !c.classList.contains('up'));
    if (hidden.length < 3) return;
    const a = pick(hidden);
    const b = pick(hidden.filter((c) => c !== a && c.dataset.face !== a.dataset.face));
    if (!b) return;
    const marker = el('span');
    a.replaceWith(marker);
    b.replaceWith(a);
    marker.replaceWith(b);
    for (const c of [a, b]) {
      c.classList.remove('swapped');
      void c.offsetWidth;
      if (!reduced) c.classList.add('swapped');
    }
    ctx.say('Two cards swapped places!');
  };

  const flip = (card: HTMLButtonElement) => {
    if (busy || card.classList.contains('up') || card.classList.contains('done')) return;
    card.classList.add('up');
    card.setAttribute('aria-label', card.dataset.face ?? 'card');
    open.push(card);
    if (open.length < 2) return;
    const [a, b] = open as [HTMLButtonElement, HTMLButtonElement];
    open = [];
    if (a.dataset.face === b.dataset.face) {
      a.classList.add('done');
      b.classList.add('done');
      found += 1;
      ctx.addScore(PAIR_POINTS, b);
      if (found === Math.min(sizes[board]!, faces.length)) {
        const bonus = Math.max(0, CLEAR_BONUS - misses);
        busy = true;
        clock.after(500, () => {
          if (bonus > 0) ctx.addScore(bonus, grid ?? undefined);
          board += 1;
          busy = false;
          if (board < sizes.length) deal();
          else {
            const timeBonus = Math.floor(ctx.timeLeft() / 3);
            if (timeBonus > 0) ctx.addScore(timeBonus);
            ctx.end();
          }
        });
      }
    } else {
      misses += 1;
      busy = true;
      clock.after(reduced ? 700 : 900, () => {
        a.classList.remove('up');
        b.classList.remove('up');
        a.setAttribute('aria-label', 'Hidden card');
        b.setAttribute('aria-label', 'Hidden card');
        busy = false;
        if (ctx.level === 2 && misses % 2 === 0) swapTwo();
      });
    }
  };

  deal();
  return {};
};
