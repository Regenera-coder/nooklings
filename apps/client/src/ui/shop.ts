import {
  canAfford,
  gardenOpen,
  isUnlocked,
  levelFor,
  nextPotCost,
  researchSpeed,
  visibleCostumes,
  type Content,
  type GameEvent,
  type GameState,
  type Layer,
} from '@nooklings/core';
import { artUrl, costumeArtName } from '../assets';
import { portraitUrl } from '../portraits';
import type { CommandInput } from '../store';
import { art, button, el, priceChips } from './dom';
import { prefs, setPrefs } from './prefs';

export type ShopTab = 'furniture' | 'gardening' | 'costumes';
type FurnFilter = 'all' | Layer;

/** What the Shop needs from the rest of the interface. */
export interface ShopHost {
  content: Content;
  getState: () => GameState;
  run: (cmd: CommandInput) => GameEvent[] | null;
  render: () => void;
  toast: (text: string, ms?: number) => void;
  /** Go home in Build mode with this item ready to place. */
  placeNow: (defId: string) => void;
  /** Open Explore at the Garden (to plant bought seeds). */
  openGarden: () => void;
  scrollTop: () => void;
  /** Ask before spending scarce Wish Stamps or Keepsakes. */
  confirmSpend: (cost: Partial<Record<string, number>>, what: string, then: () => void) => void;
}

const FILTERS: Array<[FurnFilter, string]> = [
  ['all', 'All'],
  ['floor', 'Floor'],
  ['wall', 'Wall'],
  ['rug', 'Rug'],
  ['ceiling', 'Ceiling'],
];

/** How many more Home Levels ahead the Shop shows locked items for, so the list stays short early on. */
const PEEK_LEVELS = 2;

/**
 * The Shop: Furniture (recipes, bought with Buttons and materials), Gardening (seed packets into the seed bag, pots,
 * garden tools) and Costumes (bought with Ribbons, worn here too). Every purchase uses the game's existing commands.
 */
export class ShopView {
  tab: ShopTab = prefs().shopTab ?? 'furniture';
  private filter: FurnFilter = 'all';
  /** Whose costumes are shown. */
  resident = '';
  /** Item to scroll to and highlight once (from a task's Get button). */
  private highlight = '';

  constructor(private readonly host: ShopHost) {}

  /** Open on a tab, optionally preselecting a resident (Costumes) or an item (Furniture). */
  open(tab: ShopTab, opts: { resident?: string; furnitureId?: string } = {}): void {
    this.setTab(tab);
    if (opts.resident) this.resident = opts.resident;
    if (opts.furnitureId) {
      this.highlight = opts.furnitureId;
      this.filter = 'all';
    }
  }

  private setTab(tab: ShopTab): void {
    this.tab = tab;
    setPrefs({ shopTab: tab });
  }

  render(page: HTMLElement): void {
    const head = el('div', 'page-h shop-h');
    head.append(el('h2', '', 'Shop'));
    const seg = el('div', 'filters');
    for (const [t, label] of [['furniture', 'Furniture'], ['gardening', 'Gardening'], ['costumes', 'Costumes']] as Array<[ShopTab, string]>) {
      const b = button(label, `filter${this.tab === t ? ' on' : ''}`, () => {
        this.setTab(t);
        this.host.scrollTop();
        this.host.render();
      });
      b.setAttribute('aria-pressed', String(this.tab === t));
      seg.append(b);
    }
    head.append(seg);
    page.append(head);
    if (this.tab === 'furniture') this.renderFurniture(page);
    else if (this.tab === 'gardening') this.renderGardening(page);
    else this.renderCostumes(page);
  }

  // ---------- Furniture ----------

  private owned(defId: string): { total: number; stored: number } {
    const s = this.host.getState();
    const stored = s.inventory[defId] ?? 0;
    let placed = 0;
    for (const room of Object.values(s.rooms)) placed += room.placements.filter((p) => p.defId === defId).length;
    return { total: stored + placed, stored };
  }

  private renderFurniture(page: HTMLElement): void {
    const { content } = this.host;
    const s = this.host.getState();
    const level = levelFor(s.hearts, content);
    const crafting = isUnlocked(s, content, 'crafting');
    const craftAt = content.levels.find((l) => l.unlocks.includes('crafting'))?.level ?? 2;

    const chips = el('div', 'shop-chips');
    for (const [f, label] of FILTERS) {
      const b = button(label, `chip-filter${this.filter === f ? ' on' : ''}`, () => {
        this.filter = f;
        this.host.render();
      });
      b.setAttribute('aria-pressed', String(this.filter === f));
      chips.append(b);
    }
    page.append(chips);
    if (!crafting) page.append(el('p', 'muted shop-note', `The Shop's furniture opens at Home Level ${craftAt}. Finish tasks to earn Home Hearts.`));

    const recipes = Object.values(content.recipes)
      .filter((r) => {
        const def = content.furniture[r.furnitureId];
        return !!def && (this.filter === 'all' || def.layer === this.filter);
      })
      .sort((a, b) => a.requiresLevel - b.requiresLevel);
    const shown = recipes.filter((r) => r.requiresLevel <= level + PEEK_LEVELS);
    const later = recipes.length - shown.length;

    const grid = el('div', 'shop-grid');
    for (const r of shown) {
      const def = content.furniture[r.furnitureId]!;
      const locked = !crafting || r.requiresLevel > level;
      const own = this.owned(def.id);
      const card = el('div', `shop-card${locked ? ' locked' : ''}${this.highlight === def.id ? ' highlight' : ''}`);
      card.dataset.item = def.id;
      if (own.total) card.append(el('span', 'owned-badge', `✓ Owned ×${own.total}`));
      const pic = art(`furn_${def.id}`, 'shop-art', def.name) ?? el('div', 'shop-art ph', def.name);
      card.append(pic, el('b', 'shop-name', def.name));
      if (locked) {
        card.append(el('span', 'lock-chip', `🔒 Home Level ${Math.max(r.requiresLevel, craftAt)}`));
      } else {
        const price = el('div', 'price-row');
        price.append(...priceChips(r.cost, s.wallet));
        card.append(price);
        const first = !s.craftedRecipes.includes(r.id) && content.rules.heartsPerFirstCraft > 0;
        if (first) card.append(el('span', 'first-chip', `♥ +${content.rules.heartsPerFirstCraft} the first time`));
        const acts = el('div', 'shop-acts');
        acts.append(button('Buy', 'btn primary', () => this.host.confirmSpend(r.cost, `Buy the ${def.name}?`, () => this.host.run({ type: 'craft', recipeId: r.id })), !canAfford(s, r.cost)));
        if (own.stored > 0) acts.append(button('Place', 'btn', () => this.host.placeNow(def.id)));
        card.append(acts);
      }
      grid.append(card);
    }
    page.append(grid);
    if (!shown.length) page.append(el('p', 'muted shop-note', 'Nothing of this kind in the Shop yet.'));
    if (later > 0) page.append(el('p', 'muted shop-note', `${later} more item${later > 1 ? 's' : ''} arrive at higher Home Levels.`));
    if (this.highlight) {
      const id = this.highlight;
      this.highlight = '';
      queueMicrotask(() => page.querySelector(`[data-item="${id}"]`)?.scrollIntoView({ block: 'center' }));
    }
  }

  // ---------- Gardening ----------

  private renderGardening(page: HTMLElement): void {
    const { content } = this.host;
    const g = content.garden;
    if (!g) return;
    const s = this.host.getState();
    if (!gardenOpen(s, content)) {
      const at = content.levels.find((l) => l.unlocks.includes(g.unlock))?.level ?? 99;
      const card = el('div', 'card');
      card.append(el('h3', '', 'Gardening'), el('p', '', `Seed packets, pots and garden tools for the Succulent Garden. Opens at Home Level ${at}.`));
      page.append(card);
      return;
    }
    const speed = researchSpeed(s, content);

    // Seed packets: bought into the seed bag, planted from the Garden.
    const seeds = el('div', 'card shop-section');
    const sh = el('div', 'section-h');
    const inBag = Object.values(s.garden.seeds).reduce((a, b) => a + b, 0);
    sh.append(el('h3', '', 'Seed packets'), el('span', 'grow'));
    if (inBag) sh.append(el('span', 'muted', `${inBag} in your seed bag`), button('Plant in the Garden', 'btn small', () => this.host.openGarden()));
    seeds.append(sh);
    const row = el('div', 'packet-row');
    for (const id of g.order) {
      const def = g.species[id]!;
      const card = el('div', 'packet');
      const pic = art(`garden_seed_${id}`, 'packet-art', def.name);
      if (pic) card.append(pic);
      const hours = Math.round(((def.sproutMs + def.growMs) * speed.grow) / 360_000) / 10;
      card.append(el('b', '', def.name), el('span', 'packet-time', `🌱 ${Number.isInteger(hours) ? hours : hours.toFixed(1)} h to grow`));
      const mine = Object.entries(s.garden.seeds).filter(([k]) => k.startsWith(`${id}:`)).reduce((a, [, n]) => a + n, 0);
      if (mine) card.append(el('span', 'packet-bag', `In bag ×${mine}`));
      const price = el('div', 'price-row');
      price.append(...priceChips(def.seedCost, s.wallet));
      card.append(price, button('Buy', 'btn primary', () => this.host.run({ type: 'buy_seed', speciesId: id }), !canAfford(s, def.seedCost)));
      row.append(card);
    }
    seeds.append(row);
    page.append(seeds);

    // Pots.
    const pots = el('div', 'card shop-section shop-line');
    const potPic = art('garden_pot', 'line-art');
    if (potPic) pots.append(potPic);
    const potCost = nextPotCost(s, content);
    const owned = s.garden.pots.length;
    const body = el('div', 'grow');
    if (potCost) {
      body.append(el('b', '', `Another pot · ${owned + 1} of ${g.maxPots}`));
      const price = el('div', 'price-row');
      price.append(...priceChips(potCost, s.wallet));
      body.append(price);
      pots.append(body, button('Buy', 'btn primary', () => this.host.run({ type: 'buy_pot' }), !canAfford(s, potCost)));
    } else {
      body.append(el('b', '', `Pots · ${owned} of ${g.maxPots}`), el('p', '', 'Every pot spot in the garden is filled.'));
      pots.append(body, el('span', 'owned-chip', 'All bought ✓'));
    }
    page.append(pots);

    // Garden tools.
    const tools = el('div', 'card shop-section');
    tools.append(el('h3', '', 'Garden tools'));
    const trow = el('div', 'tool-row');
    for (const id of g.toolOrder) {
      const t = g.tools[id];
      const card = el('div', 'tool-card');
      const pic = art(`garden_${id}`, 'tool-art', t.name);
      if (pic) card.append(pic);
      const info = el('div', 'grow');
      info.append(el('b', '', t.name), el('p', '', t.description));
      if (s.garden.tools.includes(id)) info.append(el('span', 'owned-chip', 'Owned ✓'));
      else {
        const price = el('div', 'price-row');
        price.append(...priceChips(t.cost, s.wallet));
        info.append(price, button('Buy', 'btn primary small', () => this.host.run({ type: 'buy_garden_tool', toolId: id }), !canAfford(s, t.cost)));
      }
      card.append(info);
      trow.append(card);
    }
    tools.append(trow);
    page.append(tools);
  }

  // ---------- Costumes ----------

  private renderCostumes(page: HTMLElement): void {
    const { content } = this.host;
    const s = this.host.getState();
    const who = s.residentOrder.filter((id) => visibleCostumes(content, id).length > 0);
    if (!who.length) {
      page.append(el('p', 'muted shop-note', 'Costumes appear here once you have friends who can wear them.'));
      return;
    }
    if (!who.includes(this.resident)) this.resident = who[0]!;

    const picker = el('div', 'who-row');
    for (const id of who) {
      const def = content.residents[id]!;
      const owned = s.residents[id]!;
      const b = el('button', `who${id === this.resident ? ' on' : ''}`);
      const img = el('img');
      img.src = portraitUrl(def, { decorated: owned.form === 'decorated', costume: owned.costume });
      img.alt = '';
      b.append(img, el('span', '', def.name));
      b.setAttribute('aria-pressed', String(id === this.resident));
      b.addEventListener('click', () => {
        this.resident = id;
        this.host.render();
      });
      picker.append(b);
    }
    page.append(picker);
    queueMicrotask(() => picker.querySelector('.who.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }));

    const id = this.resident;
    const def = content.residents[id]!;
    const mine = s.residents[id]!;
    const level = levelFor(s.hearts, content);
    const worn = mine.costume ?? null;
    const decorated = mine.form === 'decorated';
    const grid = el('div', 'costume-grid');

    // Their own look, to take a costume off.
    const base = el('div', 'costume-card');
    const look = art(`char_${id}${decorated ? '_decorated' : ''}_idle`, 'costume-art', def.name);
    if (look) base.append(look);
    else {
      const img = el('img', 'costume-art');
      img.src = portraitUrl(def, { decorated });
      img.alt = '';
      base.append(img);
    }
    base.append(el('b', 'shop-name', decorated ? 'Decorated look' : 'Original look'));
    base.append(worn === null ? el('span', 'wearing', 'Wearing ✓') : button('Wear', 'btn primary', () => this.host.run({ type: 'wear_costume', residentId: id, costumeId: null })));
    grid.append(base);

    for (const c of visibleCostumes(content, id)) {
      const card = el('div', 'costume-card');
      const key = `char_${id}_costume_${costumeArtName(id, c.id)}_idle`;
      const pic = art(key, 'costume-art', c.name);
      if (pic) card.append(pic);
      else {
        const img = el('img', 'costume-art');
        img.src = portraitUrl(def, { decorated });
        img.alt = '';
        card.append(img);
      }
      card.append(el('b', 'shop-name', c.name), el('p', 'costume-desc', c.description));
      const owned = s.costumesOwned.includes(c.id);
      if (!owned) {
        if (level < c.requiresLevel) card.append(el('span', 'lock-chip', `🔒 Home Level ${c.requiresLevel}`));
        else {
          const price = el('div', 'price-row');
          price.append(...priceChips(c.cost, s.wallet));
          card.append(price, button('Buy', 'btn primary', () => this.host.run({ type: 'buy_costume', costumeId: c.id }), !canAfford(s, c.cost)));
        }
      } else if (worn === c.id) card.append(el('span', 'wearing', 'Wearing ✓'));
      else card.append(button('Wear', 'btn primary', () => this.host.run({ type: 'wear_costume', residentId: id, costumeId: c.id })));
      if (!artUrl(key)) card.append(el('p', 'hint', 'Costume art is on its way.'));
      grid.append(card);
    }
    page.append(grid);
  }
}
