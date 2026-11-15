import { art, centreIn, el, pick, sparkle, type GameFactory } from '../engine';

type Stage = 'empty' | 'thirsty' | 'droop' | 'growing' | 'bloom' | 'weed';

interface Pot {
  node: HTMLButtonElement;
  plant: HTMLElement;
  badge: HTMLElement;
  stage: Stage;
  timer: number;
  bloom: string;
}

const BLOOMS = ['game_garden_bloom_01', 'game_garden_bloom_02', 'game_garden_bloom_03'];
const LABEL: Record<Stage, string> = {
  empty: 'Empty pot',
  thirsty: 'Thirsty sprout: tap to water',
  droop: 'Droopy sprout: tap to water',
  growing: 'Growing',
  bloom: 'Flower in bloom: tap to pick',
  weed: 'Weed: tap to pull',
};

/**
 * Garden Tending (Bloomi): six pots. Sprouts come up thirsty (a water-drop badge shows it):
 * tap to water (1 point) and they grow a bud, then bloom. Tap a bloom to pick it (5 points).
 * Weeds sometimes take a pot; tap to pull (2 points). A sprout left too long only droops;
 * it still perks up with water. Nothing is ever lost.
 */
export const garden: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  field.classList.add('g-garden');
  field.append(art('game_garden_bed', 'garden-bg'));
  const beds = el('div', 'garden-pots');
  field.append(beds);
  const can = art('game_garden_can', 'garden-can');
  field.append(can);
  ctx.say('Water the sprouts, pick the flowers, pull the weeds!');

  const pots: Pot[] = [];
  for (let i = 0; i < 6; i++) {
    const node = el('button', 'garden-pot');
    const plant = el('span', 'garden-plant');
    const badge = el('span', 'garden-badge');
    node.append(plant, art('game_garden_pot', 'garden-pot-img'), badge);
    beds.append(node);
    const pot: Pot = { node, plant, badge, stage: 'empty', timer: 0, bloom: BLOOMS[0]! };
    pots.push(pot);
    node.addEventListener('click', () => tap(pot));
  }

  const setStage = (pot: Pot, stage: Stage) => {
    pot.stage = stage;
    clock.cancel(pot.timer);
    pot.node.dataset.stage = stage;
    pot.node.setAttribute('aria-label', LABEL[stage]);
    pot.plant.replaceChildren();
    pot.badge.textContent = '';
    const key = { empty: '', thirsty: 'game_garden_sprout', droop: 'game_garden_droop', growing: 'game_garden_bud', bloom: pot.bloom, weed: 'game_garden_weed' }[stage];
    if (key) pot.plant.append(art(key));
    // Shape cues, not just colour: a drop for thirsty, scissors for ready to pick.
    if (stage === 'thirsty' || stage === 'droop') pot.badge.textContent = '💧';
    if (stage === 'bloom') pot.badge.textContent = '✂';
    if (stage === 'weed') pot.badge.textContent = '✋';
    if (stage === 'thirsty') pot.timer = clock.after(5000, () => setStage(pot, 'droop'));
    if (stage === 'growing') pot.timer = clock.after(2200, () => setStage(pot, 'bloom'));
  };

  const tap = (pot: Pot) => {
    const at = centreIn(field, pot.node);
    switch (pot.stage) {
      case 'thirsty':
      case 'droop': {
        ctx.addScore(1, pot.node);
        can.style.left = `${at.x}px`;
        can.style.top = `${at.y - pot.node.clientHeight * 0.6}px`;
        can.classList.remove('pour');
        void can.offsetWidth;
        can.classList.add('pour');
        pot.bloom = pick(BLOOMS);
        setStage(pot, 'growing');
        break;
      }
      case 'bloom':
        ctx.addScore(5, pot.node);
        sparkle(field, at, 90, reduced);
        setStage(pot, 'empty');
        break;
      case 'weed':
        ctx.addScore(2, pot.node);
        setStage(pot, 'empty');
        break;
      default:
        break;
    }
  };

  pots.forEach((p) => setStage(p, 'empty'));
  // Something new comes up in a random empty pot every so often: mostly sprouts, sometimes weeds.
  const tick = () => {
    const empty = pots.filter((p) => p.stage === 'empty');
    if (!empty.length) return;
    const pot = pick(empty);
    setStage(pot, Math.random() < 0.22 ? 'weed' : 'thirsty');
  };
  tick();
  tick();
  clock.every(1100, tick);
  return {};
};
