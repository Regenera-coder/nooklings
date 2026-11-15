import { art, centreIn, draggable, el, hits, nudge, sparkle, pointIn, type GameFactory } from '../engine';

type Tool = 'board' | 'bowl' | 'pot' | 'pan';
type Ingredient = 'berry' | 'flour' | 'egg' | 'carrot' | 'potato' | 'butter';

type Step =
  | { kind: 'add'; item: Ingredient | Tool; to: Tool; count?: number }
  | { kind: 'chop'; on: Tool; taps: number }
  | { kind: 'stir'; on: Tool; ms: number }
  | { kind: 'flip'; on: Tool; times: number };

interface Recipe {
  id: 'tart' | 'soup' | 'pancakes';
  name: string;
  dish: string;
  steps: Step[];
}

const RECIPES: Recipe[] = [
  {
    id: 'tart', name: 'Berry Tart', dish: 'game_kitchen_dish_tart',
    steps: [
      { kind: 'add', item: 'flour', to: 'bowl' },
      { kind: 'add', item: 'butter', to: 'bowl' },
      { kind: 'stir', on: 'bowl', ms: 1200 },
      { kind: 'add', item: 'berry', to: 'bowl', count: 3 },
    ],
  },
  {
    id: 'soup', name: 'Vegetable Soup', dish: 'game_kitchen_dish_soup',
    steps: [
      { kind: 'add', item: 'carrot', to: 'board' },
      { kind: 'chop', on: 'board', taps: 4 },
      { kind: 'add', item: 'potato', to: 'board' },
      { kind: 'chop', on: 'board', taps: 4 },
      { kind: 'add', item: 'board', to: 'pot' },
      { kind: 'stir', on: 'pot', ms: 1500 },
    ],
  },
  {
    id: 'pancakes', name: 'Pancakes', dish: 'game_kitchen_dish_pancakes',
    steps: [
      { kind: 'add', item: 'flour', to: 'bowl' },
      { kind: 'add', item: 'egg', to: 'bowl' },
      { kind: 'stir', on: 'bowl', ms: 1200 },
      { kind: 'add', item: 'bowl', to: 'pan' },
      { kind: 'flip', on: 'pan', times: 2 },
      { kind: 'add', item: 'butter', to: 'pan' },
    ],
  },
];

const NAMES: Record<Ingredient | Tool, string> = {
  berry: 'berries', flour: 'flour', egg: 'egg', carrot: 'carrot', potato: 'potato', butter: 'butter',
  board: 'board', bowl: 'bowl', pot: 'pot', pan: 'pan',
};

function stepText(s: Step): string {
  switch (s.kind) {
    case 'add':
      if (s.item === 'board') return 'Tip the board into the pot';
      if (s.item === 'bowl') return 'Pour the bowl into the pan';
      return `Drag the ${NAMES[s.item]} to the ${NAMES[s.to]}${s.count ? ` (${s.count})` : ''}`;
    case 'chop':
      return `Tap the board to chop (${s.taps})`;
    case 'stir':
      return `Hold the ${NAMES[s.on]} to stir`;
    case 'flip':
      return `Swipe up on the pan to flip (${s.times})`;
  }
}

const STEP_POINTS = 5;
const DISH_POINTS = 10;

/**
 * Cosy Kitchen (Bloomi): follow the recipe card. Drag ingredients to the right tool, tap the
 * board to chop, hold to stir, swipe up to flip. Every step is 5 points, every dish 10 more.
 * Recipes come round in turn (Berry Tart, Vegetable Soup, Pancakes) until time runs out.
 * Ingredients can also be moved by tapping them, then tapping the tool.
 */
export const kitchen: GameFactory = (ctx) => {
  const { field, clock, reduced } = ctx;
  field.classList.add('g-kitchen');
  field.append(art('game_kitchen_counter', 'kitchen-bg'));
  const card = el('div', 'kitchen-card');
  const work = el('div', 'kitchen-work');
  const shelf = el('div', 'kitchen-shelf');
  const tools = el('div', 'kitchen-tools');
  work.append(shelf, tools);
  field.append(card, work);

  const toolEls = new Map<Tool, HTMLElement>();
  for (const t of ['board', 'bowl', 'pot', 'pan'] as Tool[]) {
    const wrap = el('div', `kitchen-tool tool-${t}`);
    wrap.dataset.tool = t;
    wrap.setAttribute('aria-label', NAMES[t]);
    wrap.append(art(`game_kitchen_${t}`, 'tool-img', NAMES[t]), el('span', 'tool-fill'), el('span', 'tool-ring'));
    tools.append(wrap);
    toolEls.set(t, wrap);
  }

  let recipeIndex = 0;
  let stepIndex = 0;
  let progress = 0;
  let selected: HTMLElement | null = null;
  let recipe = RECIPES[0]!;
  let between = false;

  const step = () => recipe.steps[stepIndex];

  const renderCard = () => {
    card.replaceChildren(el('h4', '', recipe.name));
    const list = el('ol');
    recipe.steps.forEach((s, i) => {
      const li = el('li', i < stepIndex ? 'done' : i === stepIndex ? 'now' : '', stepText(s));
      if (i < stepIndex) li.prepend(el('span', 'tick', '✓ '));
      list.append(li);
    });
    card.append(list);
    for (const [t, node] of toolEls) node.classList.toggle('target', !between && targetOf(step()) === t);
  };

  const targetOf = (s: Step | undefined): Tool | null => (!s ? null : s.kind === 'add' ? s.to : s.on);

  const renderShelf = () => {
    shelf.replaceChildren();
    const s = step();
    // Shelf shows the ingredients this recipe still needs.
    const needed = new Set<Ingredient>();
    recipe.steps.slice(stepIndex).forEach((x) => {
      if (x.kind === 'add' && !(['board', 'bowl', 'pot', 'pan'] as string[]).includes(x.item)) needed.add(x.item as Ingredient);
    });
    for (const ing of needed) {
      const item = el('button', 'kitchen-ing');
      item.dataset.item = ing;
      item.setAttribute('aria-label', NAMES[ing]);
      item.append(art(`game_kitchen_${ing}`, '', NAMES[ing]));
      shelf.append(item);
      draggable(item, field, {
        onDrop: (at) => {
          const tool = [...toolEls].find(([, n]) => hits(field, n, at, 10))?.[0];
          return tool ? tryAdd(ing, tool, item) : false;
        },
        onTap: () => select(item),
      });
    }
    // Moving a whole tool (board into pot, bowl into pan).
    for (const [t, node] of toolEls) node.classList.toggle('movable', !!s && s.kind === 'add' && s.item === t);
  };

  const select = (item: HTMLElement | null) => {
    selected?.classList.remove('picked');
    selected = item;
    item?.classList.add('picked');
  };

  const tryAdd = (item: Ingredient | Tool, to: Tool, node: HTMLElement | null): boolean => {
    const s = step();
    if (between || !s || s.kind !== 'add' || s.item !== item || s.to !== to) {
      if (node) nudge(node, reduced);
      return false;
    }
    progress += 1;
    const tool = toolEls.get(to)!;
    tool.dataset.has = item;
    sparkle(field, centreIn(field, tool), 70, reduced);
    if (progress >= (s.count ?? 1)) completeStep(tool);
    else ctx.say(`${(s.count ?? 1) - progress} more!`);
    if (node && node.classList.contains('kitchen-ing') && progress < (s.count ?? 1)) return false; // berries: the shelf one stays
    renderShelf();
    return true;
  };

  const completeStep = (where: Element) => {
    ctx.addScore(STEP_POINTS, where);
    stepIndex += 1;
    progress = 0;
    select(null);
    for (const n of toolEls.values()) (n.querySelector('.tool-fill') as HTMLElement).style.width = '0';
    if (stepIndex >= recipe.steps.length) {
      between = true;
      renderCard();
      shelf.replaceChildren();
      const dish = art(recipe.dish, 'kitchen-dish', recipe.name);
      field.append(dish);
      ctx.addScore(DISH_POINTS, dish);
      ctx.say(`${recipe.name} is ready!`);
      sparkle(field, centreIn(field, dish), 140, reduced);
      clock.after(reduced ? 900 : 1300, () => {
        dish.remove();
        recipeIndex = (recipeIndex + 1) % RECIPES.length;
        startRecipe();
      });
      return;
    }
    renderCard();
    renderShelf();
    ctx.say(stepText(step()!));
  };

  const startRecipe = () => {
    recipe = RECIPES[recipeIndex]!;
    stepIndex = 0;
    progress = 0;
    between = false;
    for (const n of toolEls.values()) delete n.dataset.has;
    renderCard();
    renderShelf();
    ctx.say(stepText(step()!));
  };

  // Tools: tap (chop / place a picked ingredient), hold (stir), swipe up (flip), drag (tip into another tool).
  for (const [t, node] of toolEls) {
    node.style.touchAction = 'none';
    node.addEventListener('pointerdown', (down) => {
      down.preventDefault();
      if (between) return;
      node.setPointerCapture?.(down.pointerId);
      const start = pointIn(field, down);
      const s = step();
      let stirTimer = 0;
      let stirStart = 0;
      let dragging = false;
      const fill = node.querySelector('.tool-fill') as HTMLElement;
      if (s?.kind === 'stir' && s.on === t) {
        stirStart = clock.now();
        node.classList.add('stirring');
        stirTimer = clock.every(50, () => {
          const pct = Math.min(1, (clock.now() - stirStart) / s.ms);
          fill.style.width = `${pct * 100}%`;
          if (pct >= 1) {
            clock.cancel(stirTimer);
            stirTimer = 0;
            node.classList.remove('stirring');
            completeStep(node);
          }
        });
      }
      const move = (ev: PointerEvent) => {
        const p = pointIn(field, ev);
        if (s?.kind === 'add' && s.item === t && Math.hypot(p.x - start.x, p.y - start.y) > 8) {
          dragging = true;
          node.classList.add('ar-dragging');
          node.style.transform = `translate(${p.x - start.x}px, ${p.y - start.y}px)`;
        }
      };
      const up = (ev: PointerEvent) => {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        node.classList.remove('stirring', 'ar-dragging');
        if (stirTimer) {
          clock.cancel(stirTimer);
          fill.style.width = '0';
          ctx.say('Keep holding to stir!');
        }
        const p = pointIn(field, ev);
        if (dragging) {
          node.style.transform = '';
          const target = [...toolEls].find(([other, n]) => other !== t && hits(field, n, p, 10))?.[0];
          if (target) tryAdd(t, target, node);
          return;
        }
        const dy = p.y - start.y;
        const dx = p.x - start.x;
        if (s?.kind === 'flip' && s.on === t) {
          if (Math.hypot(dx, dy) > 28) {
            progress += 1;
            node.classList.remove('flipped');
            void node.offsetWidth;
            if (!reduced) node.classList.add('flipped');
            if (progress >= s.times) completeStep(node);
            else ctx.say(`Flip again! (${s.times - progress} more)`);
          } else ctx.say('Swipe up on the pan to flip!');
          return;
        }
        if (s?.kind === 'chop' && s.on === t) {
          progress += 1;
          fill.style.width = `${(progress / s.taps) * 100}%`;
          node.classList.remove('chop');
          void node.offsetWidth;
          if (!reduced) node.classList.add('chop');
          if (progress >= s.taps) completeStep(node);
          return;
        }
        if (selected) {
          tryAdd(selected.dataset.item as Ingredient, t, selected);
          return;
        }
        if (!(s?.kind === 'stir' && s.on === t)) nudge(node, reduced);
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
    });
  }

  startRecipe();
  return {};
};
