import { artUrl } from '../../assets';
import { art, centreIn, el, type GameFactory } from '../engine';

/** Chance that a falling button is golden (3 points) or red (tap it and lose a point). */
const GOLD_CHANCE = 0.15;
const RED_CHANCE = 0.18;
const FLY_MS = 480;

/**
 * Button Catch (Snug): sewing buttons drift down; tap them before they reach the bottom and
 * they fly into the basket. Golden buttons are worth 3. Red buttons are the wrong ones: tapping
 * one takes a point away (the score never goes below zero). Missed buttons simply float away.
 */
export const buttonCatch: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  field.classList.add('g-catch');
  const basket = art('game_parcel_basket', 'catch-basket');
  field.append(basket);
  ctx.say('Tap the buttons, but not the red ones!');

  type Kind = 'plain' | 'gold' | 'red';
  const live = new Set<{ node: HTMLElement; y: number; speed: number }>();
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
    // Never two red buttons in a row, and none in the first moments of a round.
    const kind: Kind = roll < GOLD_CHANCE ? 'gold' : roll < GOLD_CHANCE + RED_CHANCE && sinceRed >= 2 && clock.now() > 1500 ? 'red' : 'plain';
    sinceRed = kind === 'red' ? 0 : sinceRed + 1;
    // A drawn red button if its art is in; otherwise the normal button tinted red.
    const redArt = kind === 'red' && !!artUrl('game_button_catch_red');
    const b = el('button', `catch-btn${kind === 'plain' ? '' : ` ${kind}`}${redArt ? ' drawn' : ''}`);
    b.dataset.kind = kind;
    b.setAttribute('aria-label', kind === 'gold' ? 'Golden button, 3 points' : kind === 'red' ? 'Red button, do not tap: minus 1 point' : 'Button, 1 point');
    b.append(art(kind === 'gold' ? 'game_button_catch_gold' : redArt ? 'game_button_catch_red' : 'game_button_catch_button'));
    const size = Math.round(Math.max(52, Math.min(68, field.clientHeight * 0.2)));
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${6 + Math.random() * 84}%`;
    const item = { node: b, y: reduced ? 10 + Math.random() * 55 : -size, speed: (field.clientHeight / 3.2) * (0.85 + Math.random() * 0.3) };
    b.style.top = `${reduced ? `${item.y}%` : `${item.y}px`}`;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!live.has(item)) return;
      live.delete(item);
      if (kind === 'red') {
        ctx.addScore(-1, b);
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
      if (item.y > field.clientHeight) {
        live.delete(item);
        item.node.remove();
      }
    }
  });
  spawn();
  clock.every(450, spawn);
  return { destroy: () => stopFrames() };
};
