import { art, centreIn, el, type GameFactory } from '../engine';

/**
 * Button Catch (Snug): sewing buttons drift down; tap them before they reach the bottom.
 * Golden buttons are worth 3. Missed buttons simply float away (no penalty).
 */
export const buttonCatch: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  field.classList.add('g-catch');
  const basket = art('game_parcel_basket', 'catch-basket');
  field.append(basket);
  ctx.say('Tap the buttons!');

  const live = new Set<{ node: HTMLElement; y: number; speed: number }>();
  const spawn = () => {
    const golden = Math.random() < 0.15;
    const b = el('button', `catch-btn${golden ? ' gold' : ''}`);
    b.setAttribute('aria-label', golden ? 'Golden button, 3 points' : 'Button, 1 point');
    b.append(art(golden ? 'game_button_catch_gold' : 'game_button_catch_button'));
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
      ctx.addScore(golden ? 3 : 1, b);
      // Fly into the basket.
      const from = centreIn(field, b);
      const to = centreIn(field, basket);
      b.classList.add('caught');
      b.style.transform = reduced ? '' : `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(.4)`;
      window.setTimeout(() => b.remove(), reduced ? 120 : 380);
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
