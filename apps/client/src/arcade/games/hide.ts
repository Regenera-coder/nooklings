import { art, el, nudge, pick, shuffle, sparkle, type GameFactory } from '../engine';
import { portraitUrl } from '../../portraits';

/** Easy, Normal, Hard: how many hide, how often and how long eyes peek, and whether hiders sneak to new spots. */
const TUNE = [
  { hiders: 2, peekEvery: 2000, peekFor: 1100, sneakEvery: 0, wrong: 0 },
  { hiders: 3, peekEvery: 2800, peekFor: 700, sneakEvery: 9000, wrong: 0 },
  { hiders: 4, peekEvery: 3300, peekFor: 500, sneakEvery: 6000, wrong: 1 },
];

interface Spot {
  uid: string;
  node: HTMLButtonElement;
  hider: string | null;
}

/**
 * Hide and Seek (Hush): played over the player's own room. Residents hide behind furniture;
 * now and then a pair of eyes peeks out. Tap the furniture someone is behind to find them
 * (10 points), then they run off to hide somewhere new. Tapping an empty spot is fine.
 */
export const hide: GameFactory = (ctx) => {
  const { field, clock, reduced, content, state, scene } = ctx;
  const cfg = TUNE[ctx.level]!;
  field.classList.add('g-hide');
  if (!scene) {
    ctx.say('The room is not ready yet.');
    return {};
  }
  scene.setHiding(true);

  const canvas = scene.canvasElement;
  const cRect = canvas.getBoundingClientRect();
  const fRect = field.getBoundingClientRect();
  const sx = cRect.width / Math.max(1, canvas.width);
  const sy = cRect.height / Math.max(1, canvas.height);
  const spots: Spot[] = scene.hidingSpots().map((b) => {
    const node = el('button', 'hide-spot');
    // Furniture bounds are in canvas pixels; line them up with the field in CSS pixels.
    const x0 = cRect.left - fRect.left + b.x0 * sx;
    const y0 = cRect.top - fRect.top + b.y0 * sy;
    const w = Math.max(44, (b.x1 - b.x0) * sx);
    const h = Math.max(44, (b.y1 - b.y0) * sy);
    node.style.left = `${x0 + ((b.x1 - b.x0) * sx - w) / 2}px`;
    node.style.top = `${y0 + ((b.y1 - b.y0) * sy - h) / 2}px`;
    node.style.width = `${w}px`;
    node.style.height = `${h}px`;
    node.setAttribute('aria-label', content.furniture[b.defId]?.name ?? 'Furniture');
    field.append(node);
    const spot: Spot = { uid: b.uid, node, hider: null };
    node.addEventListener('click', () => look(spot));
    return spot;
  });

  if (spots.length === 0) {
    ctx.say('Place some furniture first so everyone has somewhere to hide!');
    clock.after(2500, () => ctx.end());
    return { destroy: () => scene.setHiding(false) };
  }

  const players = state.residentOrder.filter((id) => content.residents[id]);
  const hiders = shuffle(players).slice(0, Math.min(cfg.hiders, spots.length, players.length));
  const waiting: string[] = [];

  const hideIn = (who: string) => {
    const free = spots.filter((s) => !s.hider);
    if (!free.length) {
      waiting.push(who);
      return;
    }
    pick(free).hider = who;
  };
  hiders.forEach(hideIn);
  ctx.say(`${hiders.length === 1 ? 'Someone is' : `${hiders.length} friends are`} hiding. Watch for peeking eyes!`);

  const look = (spot: Spot) => {
    const r = spot.node;
    const at = { x: r.offsetLeft + r.offsetWidth / 2, y: r.offsetTop + r.offsetHeight / 2 };
    if (!spot.hider) {
      nudge(r, reduced);
      if (cfg.wrong) ctx.addScore(-cfg.wrong, at);
      const dust = art('game_hide_found', 'hide-dust');
      dust.style.left = `${at.x}px`;
      dust.style.top = `${at.y}px`;
      field.append(dust);
      window.setTimeout(() => dust.remove(), 450);
      return;
    }
    const who = spot.hider;
    spot.hider = null;
    ctx.addScore(10, at);
    const pop = el('div', 'hide-found');
    pop.style.left = `${at.x}px`;
    pop.style.top = `${r.offsetTop}px`;
    pop.append(art('game_hide_found', 'puff'));
    const def = content.residents[who];
    if (def) {
      const face = el('img', 'face');
      face.src = portraitUrl(def);
      face.alt = def.name;
      pop.append(face, el('b', '', `${def.name}!`));
    }
    field.append(pop);
    sparkle(field, at, 90, reduced);
    window.setTimeout(() => pop.remove(), reduced ? 1000 : 1300);
    // They run off and hide again somewhere else.
    clock.after(1500, () => {
      const w = waiting.shift();
      if (w) hideIn(w);
      hideIn(who);
    });
  };

  // Peeking eyes: one hidden friend peeks out every couple of seconds.
  const peek = () => {
    const hidden = spots.filter((s) => s.hider);
    if (!hidden.length) return;
    const s = pick(hidden);
    const eyes = art('game_hide_peek', 'hide-eyes');
    eyes.style.left = `${s.node.offsetLeft + s.node.offsetWidth * (0.25 + Math.random() * 0.5)}px`;
    eyes.style.top = `${s.node.offsetTop + s.node.offsetHeight * 0.2}px`;
    field.append(eyes);
    clock.after(reduced ? Math.max(1200, cfg.peekFor) : cfg.peekFor, () => eyes.remove());
  };
  clock.after(800, peek);
  clock.every(cfg.peekEvery, peek);

  // Normal and Hard: now and then a hider sneaks off to a different spot.
  if (cfg.sneakEvery) {
    clock.every(cfg.sneakEvery, () => {
      const hidden = spots.filter((s) => s.hider);
      const free = spots.filter((s) => !s.hider);
      if (!hidden.length || !free.length) return;
      const from = pick(hidden);
      pick(free).hider = from.hider;
      from.hider = null;
    });
  }

  return { destroy: () => scene.setHiding(false) };
};
