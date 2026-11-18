import { artUrl } from '../../assets';
import { art, centreIn, el, hits, nudge, pick, pointIn, shuffle, type GameFactory } from '../engine';

/**
 * Easy, Normal, Hard: baskets at the start and later, belt speed, and what a wrong basket costs.
 * On Hard the baskets also change places now and then.
 */
const TUNE = [
  { baskets: 3, later: 4, laterAt: 20_000, speed: 0.08, top: 0.15, wrong: 0, shuffleEvery: 0 },
  { baskets: 4, later: 5, laterAt: 20_000, speed: 0.1, top: 0.19, wrong: 2, shuffleEvery: 0 },
  { baskets: 5, later: 6, laterAt: 15_000, speed: 0.12, top: 0.22, wrong: 3, shuffleEvery: 12_000 },
];

const BOXES = ['game_parcel_box_01', 'game_parcel_box_02', 'game_parcel_box_03', 'game_parcel_box_04'];

interface Parcel {
  node: HTMLElement;
  who: string;
  x: number;
  held: boolean;
}

/**
 * Parcel Sorting (Pippo): parcels slide along the belt, each with a resident's stamp. Drag a
 * parcel to the basket with the same stamp (5 points), or tap a parcel then its basket. A
 * parcel dropped on the wrong basket hops back onto the belt; parcels that reach the end go
 * round again. Three baskets to start, a fourth after 20 seconds; the belt speeds up gently.
 */
export const parcel: GameFactory = (ctx) => {
  const { field, clock, reduced, content, state } = ctx;
  const cfg = TUNE[ctx.level]!;
  field.classList.add('g-parcel');
  const belt = el('div', 'parcel-belt');
  belt.append(art('game_parcel_belt', 'parcel-belt-img'));
  const lane = el('div', 'parcel-lane');
  belt.append(lane);
  const baskets = el('div', 'parcel-baskets');
  field.append(belt, baskets);
  ctx.say('Drag each parcel to the basket with the same face!');

  // Stamps: the player's own residents first, topped up from the rest of the cast (only friends with a drawn stamp).
  const stamped = (id: string) => !!content.residents[id] && !!artUrl(`game_parcel_stamp_${id}`);
  const owned = state.residentOrder.filter(stamped);
  const cast = [...shuffle(owned), ...shuffle(Object.keys(content.residents).filter((id) => stamped(id) && !owned.includes(id)))];
  const faces = cast.slice(0, cfg.later);
  let active = faces.slice(0, cfg.baskets);
  const basketEls = new Map<string, HTMLElement>();
  let picked: Parcel | null = null;

  const addBasket = (who: string) => {
    const b = el('button', 'parcel-basket');
    b.setAttribute('aria-label', `${content.residents[who]?.name ?? who}'s basket`);
    b.append(art('game_parcel_basket', 'basket-img'), art(`game_parcel_stamp_${who}`, 'basket-stamp', content.residents[who]?.name ?? who));
    b.addEventListener('click', () => {
      if (picked) deliver(picked, who);
    });
    baskets.append(b);
    basketEls.set(who, b);
  };
  active.forEach(addBasket);

  const parcels = new Set<Parcel>();
  let speed = cfg.speed; // share of the belt width per second

  const spawn = () => {
    if (parcels.size >= 6) return;
    const who = pick(active);
    const node = el('div', 'parcel');
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `Parcel for ${content.residents[who]?.name ?? who}`);
    node.append(art(pick(BOXES), 'parcel-box-img'), art(`game_parcel_stamp_${who}`, 'parcel-stamp'));
    lane.append(node);
    const p: Parcel = { node, who, x: -0.12, held: false };
    parcels.add(p);
    node.style.left = `${p.x * 100}%`;
    node.style.touchAction = 'none';
    node.addEventListener('pointerdown', (down) => {
      down.preventDefault();
      node.setPointerCapture?.(down.pointerId);
      p.held = true;
      const start = pointIn(field, down);
      let moved = false;
      const move = (ev: PointerEvent) => {
        const q = pointIn(field, ev);
        if (!moved && Math.hypot(q.x - start.x, q.y - start.y) < 8) return;
        moved = true;
        node.classList.add('ar-dragging');
        node.style.transform = `translate(${q.x - start.x}px, ${q.y - start.y}px)`;
      };
      const up = (ev: PointerEvent) => {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        node.classList.remove('ar-dragging');
        if (!moved) {
          // Tap to pick, then tap a basket.
          p.held = false;
          if (picked) picked.node.classList.remove('picked');
          picked = picked === p ? null : p;
          picked?.node.classList.add('picked');
          return;
        }
        const at = pointIn(field, ev);
        const target = [...basketEls].find(([, b]) => hits(field, b, at, 12))?.[0];
        if (target) deliver(p, target);
        else bounce(p);
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
    });
  };

  const bounce = (p: Parcel) => {
    p.held = false;
    p.node.style.transform = '';
    nudge(p.node, reduced);
  };

  const deliver = (p: Parcel, who: string) => {
    if (picked === p) picked = null;
    p.node.classList.remove('picked');
    if (p.who !== who) {
      nudge(basketEls.get(who)!, reduced);
      if (cfg.wrong) ctx.addScore(-cfg.wrong, basketEls.get(who)!);
      bounce(p);
      return;
    }
    parcels.delete(p);
    const basket = basketEls.get(who)!;
    ctx.addScore(5, basket);
    basket.classList.remove('got');
    void basket.offsetWidth;
    basket.classList.add('got');
    if (reduced) {
      p.node.remove();
      return;
    }
    const from = centreIn(field, p.node);
    const to = centreIn(field, basket);
    const t = p.node.style.transform;
    p.node.classList.add('delivered');
    p.node.style.transform = `${t} translate(${to.x - from.x}px, ${to.y - from.y}px) scale(.3)`;
    window.setTimeout(() => p.node.remove(), 350);
  };

  const stopFrames = clock.onFrame((dt) => {
    for (const p of parcels) {
      if (p.held || picked === p) continue;
      p.x += (speed * dt) / 1000;
      if (p.x > 1.02) p.x = -0.12; // round the belt again
      p.node.style.left = `${p.x * 100}%`;
    }
  });

  spawn();
  let spawnTimer = clock.every(2200, spawn);
  clock.every(5000, () => {
    speed = Math.min(cfg.top, speed + 0.012);
    clock.cancel(spawnTimer);
    spawnTimer = clock.every(Math.max(1100, 2200 - Math.round((speed - cfg.speed) * 9000) - ctx.level * 200), spawn);
  });
  clock.after(cfg.laterAt, () => {
    while (active.length < faces.length) {
      const who = faces[active.length]!;
      active = [...active, who];
      addBasket(who);
    }
    ctx.say('A new basket!');
  });
  if (cfg.shuffleEvery) {
    clock.every(cfg.shuffleEvery, () => {
      baskets.replaceChildren(...shuffle([...basketEls.values()]));
      ctx.say('The baskets moved!');
    });
  }
  return { destroy: () => stopFrames() };
};
