import { art, el, sparkle, centreIn, type GameFactory } from '../engine';

/** Each lantern differs by shape as well as colour (heart, moon, star, leaf) for colour-blind players. */
const LANTERNS = [
  { colour: 'pink', shape: 'heart' },
  { colour: 'blue', shape: 'moon' },
  { colour: 'yellow', shape: 'star' },
  { colour: 'green', shape: 'leaf' },
];
const START_LENGTH = 2;

/**
 * Lantern Lights (Glim): watch the lanterns glow in order, then tap them in the same order.
 * Each right tap is 2 points; finishing a sequence is 5 more and the next one is one longer.
 * A wrong tap is fine: the same sequence simply plays again.
 */
export const lantern: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
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
    const on = reduced ? 700 : 550;
    const gap = 250;
    sequence.forEach((i, k) => clock.after(600 + k * (on + gap), () => glow(i, on)));
    clock.after(600 + sequence.length * (on + gap), () => {
      listening = true;
      ctx.say('Your turn!');
    });
  };

  const grow = () => {
    sequence.push(Math.floor(Math.random() * LANTERNS.length));
    play();
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
      ctx.say('Almost! Watch again.');
      clock.after(700, play);
    }
  };

  sequence = Array.from({ length: START_LENGTH }, () => Math.floor(Math.random() * LANTERNS.length));
  play();
  return {};
};
