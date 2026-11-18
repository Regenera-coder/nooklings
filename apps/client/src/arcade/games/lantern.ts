import { art, el, shuffle, sparkle, centreIn, type GameFactory } from '../engine';

/** Each lantern differs by shape as well as colour (heart, moon, star, leaf) for colour-blind players. */
const LANTERNS = [
  { colour: 'pink', shape: 'heart' },
  { colour: 'blue', shape: 'moon' },
  { colour: 'yellow', shape: 'star' },
  { colour: 'green', shape: 'leaf' },
];
/**
 * Easy: the sequence grows by one each time (the same start), and a mistake replays it.
 * Normal: longer and quicker, and every sequence is brand new.
 * Hard: quicker still, and the lanterns change places before each new sequence.
 */
const TUNE = [
  { start: 2, on: 650, gap: 280, fresh: false, moveLanterns: false },
  { start: 3, on: 480, gap: 200, fresh: true, moveLanterns: false },
  { start: 4, on: 380, gap: 150, fresh: true, moveLanterns: true },
] as const;

/**
 * Lantern Lights (Glim): watch the lanterns glow in order, then tap them in the same order.
 * Each right tap is 2 points; finishing a sequence is 5 more and the next one is one longer.
 * A wrong tap is fine: the same sequence simply plays again.
 */
export const lantern: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  const t = TUNE[ctx.level];
  field.classList.add('g-lantern');
  field.append(art('game_lantern_backdrop', 'lantern-bg'));
  const row = el('div', 'lantern-row');
  field.append(row);
  const buttons = LANTERNS.map((l, i) => {
    const b = el('button', 'lantern');
    b.setAttribute('aria-label', `${l.colour} ${l.shape} lantern`);
    const off = art(`game_lantern_${l.colour}_off`, 'off');
    const on = art(`game_lantern_${l.colour}_on`, 'on');
    b.append(off, on, el('span', 'lantern-shape', l.shape));
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      press(i);
    });
    row.append(b);
    return b;
  });

  let sequence: number[] = [];
  let input = 0;
  let listening = false;

  const glow = (i: number, ms: number) => {
    const b = buttons[i]!;
    b.classList.add('lit');
    clock.after(ms, () => b.classList.remove('lit'));
  };

  const play = () => {
    listening = false;
    input = 0;
    ctx.say('Watch the lanterns…');
    const on = reduced ? Math.max(t.on, 600) : t.on;
    const gap = t.gap;
    sequence.forEach((i, k) => clock.after(600 + k * (on + gap), () => glow(i, on)));
    clock.after(600 + sequence.length * (on + gap), () => {
      listening = true;
      ctx.say('Your turn!');
    });
  };

  const random = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * LANTERNS.length));
  /** Hard: the lanterns trade places (each keeps its own colour and shape). */
  const reorder = () => {
    if (!t.moveLanterns) return;
    row.replaceChildren(...shuffle(buttons));
    ctx.say('The lanterns moved!');
  };
  const grow = () => {
    if (t.fresh) sequence = random(sequence.length + 1);
    else sequence.push(Math.floor(Math.random() * LANTERNS.length));
    reorder();
    clock.after(t.moveLanterns ? 500 : 0, play);
  };

  const press = (i: number) => {
    if (!listening) return;
    glow(i, 260);
    if (sequence[input] === i) {
      input += 1;
      ctx.addScore(2, buttons[i]!);
      if (input === sequence.length) {
        listening = false;
        ctx.addScore(5);
        sparkle(field, centreIn(field, row), 160, reduced);
        ctx.say('Lovely! One more lantern this time.');
        clock.after(900, grow);
      }
    } else {
      listening = false;
      if (t.fresh) {
        // A new sequence, one shorter (never below the starting length).
        sequence = random(Math.max(t.start, sequence.length - 1));
        ctx.say('Almost! Here is a new one.');
      } else ctx.say('Almost! Watch again.');
      clock.after(700, play);
    }
  };

  sequence = random(t.start);
  play();
  return {};
};
