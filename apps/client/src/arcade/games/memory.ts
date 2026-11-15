import { art, el, shuffle, type GameFactory } from '../engine';

const FACES = ['button', 'spool', 'teacup', 'star', 'leaf', 'moon', 'key', 'heart'];
/** Two boards: 12 cards (6 pairs), then 16 cards (8 pairs). */
const BOARDS = [6, 8];
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
  let board = 0;
  let misses = 0;
  let open: HTMLButtonElement[] = [];
  let busy = false;
  let found = 0;
  let grid: HTMLElement | null = null;

  const deal = () => {
    const pairs = BOARDS[board]!;
    found = 0;
    misses = 0;
    open = [];
    grid?.remove();
    grid = el('div', 'mem-grid');
    const faces = shuffle(FACES).slice(0, pairs);
    const deck = shuffle([...faces, ...faces]);
    const g = bestGrid(deck.length, field.clientWidth - 24, field.clientHeight - 20, 8);
    grid.style.gridTemplateColumns = `repeat(${g.cols}, ${Math.floor(g.cw)}px)`;
    for (const face of deck) {
      const n = FACES.indexOf(face) + 1;
      const card = el('button', 'mem-card');
      card.dataset.face = face;
      card.setAttribute('aria-label', 'Hidden card');
      card.style.width = `${Math.floor(g.cw)}px`;
      card.style.height = `${Math.floor(g.cw * 1.5)}px`;
      const inner = el('span', 'mem-inner');
      const back = el('span', 'mem-side mem-back');
      back.append(art('game_memory_back'));
      const front = el('span', 'mem-side mem-front');
      front.append(art(`game_memory_face_${String(n).padStart(2, '0')}`, '', face));
      inner.append(back, front);
      card.append(inner);
      card.addEventListener('click', () => flip(card));
      grid.append(card);
    }
    field.append(grid);
    ctx.say(board === 0 ? 'Find the pairs!' : 'A bigger board!');
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
      if (found === BOARDS[board]) {
        const bonus = Math.max(0, CLEAR_BONUS - misses);
        busy = true;
        clock.after(500, () => {
          if (bonus > 0) ctx.addScore(bonus, grid ?? undefined);
          board += 1;
          busy = false;
          if (board < BOARDS.length) deal();
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
      });
    }
  };

  deal();
  return {};
};
