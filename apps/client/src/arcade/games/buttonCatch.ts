import { artUrl } from '../../assets';
import { art, centreIn, el, type GameFactory } from '../engine';

const FLY_MS = 480;

/** Easy, Normal, Hard. Buttons fall faster as the round goes on, and on Hard they sway as they fall. */
const TUNE = [
  { gold: 0.18, red: 0.12, fallSeconds: 3.2, every: 460, redPenalty: 1, sway: 0 },
  { gold: 0.14, red: 0.2, fallSeconds: 2.5, every: 400, redPenalty: 2, sway: 0.05 },
  { gold: 0.1, red: 0.27, fallSeconds: 2.0, every: 340, redPenalty: 3, sway: 0.1 },
] as const;

/**
 * Button Catch (Snug): sewing buttons drift down; tap them before they reach the bottom and
 * they fly into the basket. Golden buttons are worth 3. Red buttons are the wrong ones: tapping
 * one takes points away (1 on Easy, 2 on Normal, 3 on Hard; the score never goes below zero). Missed buttons simply float away.
 */
export const buttonCatch: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  const t = TUNE[ctx.level];
  const GOLD_CHANCE = t.gold;
  const RED_CHANCE = t.red;
  field.classList.add('g-catch');
  const basket = art('game_parcel_basket', 'catch-basket');
  field.append(basket);
  ctx.say('Tap the buttons, but not the red ones!');

  type Kind = 'plain' | 'gold' | 'red';
  const live = new Set<{ node: HTMLElement; y: number; speed: number; x: number; phase: number; sway: number }>();
  /** 1 at the start of the round, rising to 1.35 by the end. */
  const ramp = () => 1 + 0.35 * Math.min(1, clock.now() / 30_000);
  let sinceRed = 0;

  /** The button arcs up a little, then drops into the basket, shrinking as it goes. */
  const flyToBasket = (b: HTMLElement) => {
    const from = centreIn(field, b);
    const to = centreIn(field, basket);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lift = Math.min(70, 30 + Math.abs(dx) * 0.18);
    b.classList.add('caught');
    const land = () => {
      b.remove();
      basket.classList.remove('bump');
      void basket.offsetWidth;
      basket.classList.add('bump');
    };
    if (reduced || typeof b.animate !== 'function') {
      window.setTimeout(land, 120);
      return;
    }
    const anim = b.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, easing: 'ease-out' },
        { transform: `translate(${dx * 0.5}px, ${Math.min(dy * 0.35, 0) - lift}px) scale(.85) rotate(160deg)`, opacity: 1, offset: 0.45, easing: 'ease-in' },
        { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(360deg)`, opacity: 0.9 },
      ],
      { duration: FLY_MS, fill: 'forwards' },
    );
    anim.onfinish = land;
    anim.oncancel = land;
  };

  const spawn = () => {
    const roll = Math.random();
    // Never two red buttons in a row (one apart on Hard), and none in the first moments of a round.
    const kind: Kind = roll < GOLD_CHANCE ? 'gold' : roll < GOLD_CHANCE + RED_CHANCE && sinceRed >= (ctx.level === 2 ? 1 : 2) && clock.now() > 1500 ? 'red' : 'plain';
    sinceRed = kind === 'red' ? 0 : sinceRed + 1;
    // A drawn red button if its art is in; otherwise the normal button tinted red.
    const redArt = kind === 'red' && !!artUrl('game_button_catch_red');
    const b = el('button', `catch-btn${kind === 'plain' ? '' : ` ${kind}`}${redArt ? ' drawn' : ''}`);
    b.dataset.kind = kind;
    b.setAttribute('aria-label', kind === 'gold' ? 'Golden button, 3 points' : kind === 'red' ? `Red button, do not tap: minus ${t.redPenalty} point${t.redPenalty > 1 ? 's' : ''}` : 'Button, 1 point');
    b.append(art(kind === 'gold' ? 'game_button_catch_gold' : redArt ? 'game_button_catch_red' : 'game_button_catch_button'));
    const size = Math.round(Math.max(52, Math.min(68, field.clientHeight * 0.2)));
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    const x = 6 + Math.random() * 84;
    b.style.left = `${x}%`;
    const item = {
      node: b,
      y: reduced ? 10 + Math.random() * 55 : -size,
      speed: (field.clientHeight / t.fallSeconds) * ramp() * (0.8 + Math.random() * 0.4),
      x,
      phase: Math.random() * Math.PI * 2,
      sway: reduced ? 0 : t.sway * 100 * (0.5 + Math.random()),
    };
    b.style.top = `${reduced ? `${item.y}%` : `${item.y}px`}`;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!live.has(item)) return;
      live.delete(item);
      if (kind === 'red') {
        ctx.addScore(-t.redPenalty, b);
        ctx.say('Oops, not the red ones!');
        b.classList.add('oops');
        window.setTimeout(() => b.remove(), reduced ? 120 : 460);
        return;
      }
      ctx.addScore(kind === 'gold' ? 3 : 1, b);
      flyToBasket(b);
    });
    field.append(b);
    live.add(item);
    if (reduced) {
      // No motion: buttons appear in place and fade after a while.
      clock.after(1800, () => {
        if (live.delete(item)) b.remove();
      });
    }
  };

  const stopFrames = clock.onFrame((dt) => {
    if (reduced) return;
    for (const item of [...live]) {
      item.y += (item.speed * dt) / 1000;
      item.node.style.top = `${item.y}px`;
      if (item.sway) item.node.style.left = `${Math.max(2, Math.min(90, item.x + Math.sin(item.phase + item.y / 60) * item.sway))}%`;
      if (item.y > field.clientHeight) {
        live.delete(item);
        item.node.remove();
      }
    }
  });
  spawn();
  // Buttons come a little more often as the round goes on.
  const loop = () => {
    spawn();
    clock.after(t.every / ramp(), loop);
  };
  clock.after(t.every, loop);
  return { destroy: () => stopFrames() };
};
