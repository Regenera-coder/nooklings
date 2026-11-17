import {
  bondProgress,
  canAfford,
  gatherReadyIn,
  invitationStatus,
  isRoomOpen,
  purchaseKey,
  residentsInRoom,
  spotUnlocked,
  companionOf,
  visibleCostumes,
  isUnlocked,
  levelFor,
  nextLevel,
  parcelOdds,
  playReadyAt,
  playsLeftToday,
  poolCanOpen,
  taskStates,
  bakeRecipes,
  bakeYield,
  bakingOpen,
  canBake,
  seriesProgress,
  friendParcelHasNew,
  parcelCost,
  parcelGuaranteed,
  treatGivenToday,
  gardenOpen,
  gardenReady,
  nextPotCost,
  succulentGrowth,
  type Content,
  type Cost,
  type Currency,
  type GameEvent,
  type GameState,
  type ParcelKind,
  type ResidentDef,
  type TaskDef,
} from '@nooklings/core';
import { Arcade } from '../arcade/arcade';
import { artUrl, costumeArtName } from '../assets';
import { succulentArtUrl, succulentImage } from '../garden/succulentArt';
import { reasonText, type PendingEdit, type RoomScene, type Selection } from '../game/RoomScene';
import { portraitUrl } from '../portraits';
import type { CommandInput } from '../store';

type Tab = 'home' | 'nookbook' | 'explore' | 'tasks';
type Filter = 'all' | 'owned' | 'missing';
type ExploreView = 'arcade' | 'outdoors' | 'garden' | 'kitchen' | 'parcels';
type TasksView = 'tasks' | 'invitations';

const CURRENCY: Record<Currency | 'hearts', { name: string; icon: string; glyph: string }> = {
  buttons: { name: 'Buttons', icon: 'icon_buttons', glyph: '●' },
  wood: { name: 'Wood', icon: 'icon_wood', glyph: '▤' },
  fabric: { name: 'Fabric', icon: 'icon_fabric', glyph: '◈' },
  wishStamps: { name: 'Wish Stamps', icon: 'icon_wish_stamp', glyph: '✉' },
  mendingThread: { name: 'Mending Thread', icon: 'icon_mending_thread', glyph: '✂' },
  keepsakes: { name: 'Keepsakes', icon: 'icon_keepsake', glyph: '❖' },
  ribbons: { name: 'Ribbons', icon: 'icon_ribbon', glyph: '🎀' },
  treats: { name: 'Treats', icon: 'icon_treats', glyph: '🍪' },
  hearts: { name: 'Home Hearts', icon: 'icon_home_heart', glyph: '♥' },
};

const UNLOCK_NAMES: Record<string, string> = {
  crafting: 'Crafting', parcels: 'Mystery Parcels', sunroom: 'The Sunroom', gardening: 'Gardening',
  yard_expansion: 'Bigger yard', rain_decor: 'Rainy-day decor', expeditions: 'Expeditions',
  tranquil_decor: 'Tranquil decor', heirloom: 'Heirloom restoring', exterior: 'Wishing Lantern',
  kitchen: 'The Kitchen', baking: 'Baking', teatime_parcels: 'Teatime Parcels', tea_service: 'Tea service', berry_patch: 'Berry Patch',
  tea_garden: 'The Tea Garden', party_decor: 'Party decor', moonlit_market: 'The Moonlit Market', old_oven: 'Old Oven restoring',
  tea_party: 'Tea Party Table', grand_tea_party: 'The Grand Tea Party', succulents: 'The Succulent Garden',
};

const GROUPS: Array<{ label: string; layer: 'floor' | 'rug' | 'wall' | 'ceiling' }> = [
  { label: 'Furniture', layer: 'floor' },
  { label: 'Rugs', layer: 'rug' },
  { label: 'Wall', layer: 'wall' },
  { label: 'Hanging', layer: 'ceiling' },
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(label: string, cls: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const b = el('button', cls, label);
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

function icon(kind: Currency | 'hearts'): HTMLElement {
  const meta = CURRENCY[kind];
  const url = artUrl(meta.icon);
  if (url) {
    const img = el('img', 'ico-img');
    img.src = url;
    img.alt = '';
    return img;
  }
  return el('span', '', meta.glyph);
}

function costChips(cost: Cost & { hearts?: number }, cls = 'reward'): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const [k, v] of Object.entries(cost) as Array<[Currency | 'hearts', number | undefined]>) {
    if (!v) continue;
    const chip = el('span', cls);
    const name = CURRENCY[k].name;
    chip.append(icon(k), document.createTextNode(` ${v} ${v === 1 && name.endsWith('s') ? name.slice(0, -1) : name}`));
    out.push(chip);
  }
  return out;
}

function tagChips(tags: Record<string, number>): HTMLElement {
  const wrap = el('div', 'tags');
  const entries = Object.entries(tags);
  if (entries.length === 0) wrap.append(el('span', 'tag', 'No atmosphere'));
  for (const [k, v] of entries) wrap.append(el('span', 'tag', `${k} +${v}`));
  return wrap;
}

function bondHearts(level: number): HTMLElement {
  const wrap = el('span', 'bond');
  for (let i = 1; i <= 5; i++) wrap.append(el('span', i <= level ? '' : 'off', '♥'));
  return wrap;
}

function seconds(ms: number): string {
  return `${Math.max(1, Math.ceil(ms / 1000))}s`;
}

/** DOM interface around the canvas: left tab rail, top bar, right slide-in panel and full pages. */
export class GameUI {
  private tab: Tab = 'home';
  private build = false;
  private selection: Selection = { kind: 'none' };
  private pending: PendingEdit | null = null;
  private filter: Filter = 'all';
  private detailId: string | null = null;
  /** Nookbook tab (a series id). */
  private seriesTab = '';
  private bakerPick = '';
  private toastTimer = 0;
  private revealing = false;
  private exploreView: ExploreView = 'outdoors';
  private readonly arcade: Arcade;
  /** Where to return after Hide and Seek. */
  private beforeHide: { tab: Tab; roomId: string } | null = null;
  private readonly panel = document.getElementById('panel')!;
  private readonly page = document.getElementById('page')!;
  private readonly reveal = document.getElementById('reveal')!;
  private readonly buildBtn = document.getElementById('build-btn') as HTMLButtonElement;

  constructor(
    private readonly content: Content,
    private readonly getState: () => GameState,
    private readonly dispatch: (cmd: CommandInput) => { ok: true; events: GameEvent[] } | { ok: false; error: string },
    private readonly getScene: () => RoomScene | null,
    private readonly onLayoutChange: () => void,
  ) {
    document.querySelectorAll<HTMLButtonElement>('#rail .tab').forEach((b) =>
      b.addEventListener('click', () => this.setTab(b.dataset.tab as Tab)),
    );
    this.buildBtn.addEventListener('click', () => this.setBuild(!this.build));
    document.getElementById('fs-btn')!.addEventListener('click', () => void this.toggleFullscreen());
    document.getElementById('res-stamps-btn')!.addEventListener('click', () => this.setTab('explore'));
    document.getElementById('res-buttons-btn')!.addEventListener('click', () => {
      const w = this.getState().wallet;
      this.toast((Object.keys(w) as Currency[]).map((c) => `${CURRENCY[c].name} ${w[c]}`).join(' · '), 3200);
    });
    for (const span of document.querySelectorAll<HTMLElement>('.res-ico')) {
      const url = artUrl(`icon_${span.dataset.icon}`);
      if (url) {
        span.textContent = '';
        const img = el('img', 'ico-img');
        img.src = url;
        img.alt = '';
        span.append(img);
      }
    }
    this.arcade = new Arcade({
      content,
      getState,
      dispatch,
      getScene,
      showRoomForHide: () => this.showRoomForHide(),
      leaveRoomAfterHide: () => this.leaveRoomAfterHide(),
      placeNow: (defId) => this.placeNow(defId),
      openResident: (id) => this.openCharacter(id),
      onClosed: () => this.render(),
      errorText,
    });
    this.applyInterfaceArt();
    this.renderRoomTabs();
    window.setInterval(() => this.tick(), 1000);
    this.renderTop();
    this.renderBadges();
  }

  /** Swaps in ChatGPT interface art where it exists: tab icons and stitched panels/buttons. */
  private applyInterfaceArt(): void {
    for (const b of document.querySelectorAll<HTMLElement>('#rail .tab')) {
      const url = artUrl(`icon_tab_${b.dataset.tab}`);
      const ico = b.querySelector('.ico');
      if (!url || !ico) continue;
      ico.textContent = '';
      const img = el('img', 'tab-img');
      img.src = url;
      img.alt = '';
      ico.append(img);
    }
    const root = document.documentElement;
    const pairs: Array<[string, string]> = [['--ui-panel', 'ui_panel'], ['--ui-button', 'ui_button'], ['--ui-button-primary', 'ui_button_primary']];
    // Arcade pieces (used by the Arcade styles when present).
    for (const [v, key] of [['--ui-card-frame', 'ui_card_frame'], ['--ui-play-button', 'ui_play_button']]) {
      const url = artUrl(key!);
      if (url) root.style.setProperty(v!, `url("${url}")`);
    }
    let any = false;
    for (const [v, key] of pairs) {
      const url = artUrl(key);
      if (url) {
        root.style.setProperty(v, `url("${url}")`);
        any = true;
      }
    }
    document.body.classList.toggle('ui-art', any);
  }

  // ---------- navigation ----------

  setTab(tab: Tab): void {
    this.tab = tab;
    document.querySelectorAll<HTMLButtonElement>('#rail .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab !== 'home') {
      if (this.build) this.setBuild(false);
      this.selection = { kind: 'none' };
    }
    if (tab !== 'nookbook') this.detailId = null;
    this.page.scrollTop = 0;
    this.buildBtn.hidden = tab !== 'home';
    this.buildBtn.disabled = !isRoomOpen(this.getState(), this.content, this.roomId);
    this.render();
  }

  setBuild(on: boolean): void {
    this.build = on;
    this.buildBtn.classList.toggle('on', on);
    this.buildBtn.textContent = on ? 'Done' : 'Build';
    this.getScene()?.setBuildMode(on);
    this.render();
  }

  openCharacter(id: string): void {
    this.setTab('nookbook');
    this.openDetail(id);
  }

  private get roomId(): string {
    return this.getScene()?.currentRoomId ?? this.content.roomOrder[0]!;
  }

  showRoom(roomId: string): void {
    if (this.tab !== 'home') this.setTab('home');
    if (this.build) this.setBuild(false);
    this.getScene()?.switchRoom(roomId);
    this.selection = { kind: 'none' };
    this.render();
  }

  private renderRoomTabs(): void {
    const bar = document.getElementById('room-tabs');
    if (!bar) return;
    const s = this.getState();
    bar.hidden = this.tab !== 'home';
    bar.replaceChildren();
    const level = levelFor(s.hearts, this.content);
    for (const id of this.content.roomOrder) {
      const room = this.content.rooms[id]!;
      const open = isRoomOpen(s, this.content, id);
      // Hide rooms that aren't even unlockable yet, so the bar stays short early on.
      const unlockLevel = room.access ? this.content.levels.find((l) => l.unlocks.includes(room.access!.unlock))?.level ?? 99 : 1;
      if (!open && level < unlockLevel) continue;
      const b = el('button', id === this.roomId ? 'on' : '');
      b.append(document.createTextNode(open ? room.name : `🔒 ${room.name}`));
      if (!open && canAfford(s, room.access!.cost)) b.append(el('span', 'dot'));
      b.addEventListener('click', () => this.showRoom(id));
      bar.append(b);
    }
    if (bar.children.length < 2) bar.hidden = true;
    const had = document.body.classList.contains('has-rooms');
    document.body.classList.toggle('has-rooms', !bar.hidden);
    if (had !== !bar.hidden) this.onLayoutChange();
  }

  /** Extra cards for the bottom of the Tasks page (cloud save). */
  tasksExtra: (() => HTMLElement | null) | null = null;

  /** Redraw after something outside the game state changed. */
  refresh(): void {
    this.render();
  }

  // ---------- scene and store callbacks ----------

  onSelection(sel: Selection): void {
    const prev = this.selection;
    this.selection = sel;
    const same =
      (prev.kind === 'none' && sel.kind === 'none') ||
      (prev.kind === 'furniture' && sel.kind === 'furniture' && prev.uid === sel.uid) ||
      (prev.kind === 'resident' && sel.kind === 'resident' && prev.id === sel.id && prev.status === sel.status);
    if (!same) this.render();
  }

  onPending(edit: PendingEdit | null): void {
    this.pending = edit;
    this.render();
  }

  onStateChanged(events: GameEvent[]): void {
    for (const e of events) this.announce(e);
    this.render();
  }

  toast(text: string, ms = 1900): void {
    const t = document.getElementById('toast')!;
    t.textContent = text;
    t.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.remove('show'), ms);
  }

  private announce(e: GameEvent): void {
    switch (e.type) {
      case 'level_up': {
        const def = this.content.levels.find((l) => l.level === e.level);
        const unlocked = def?.unlocks.map((u) => UNLOCK_NAMES[u] ?? u).join(', ');
        this.toast(`Home Level ${e.level}!${unlocked ? ` Unlocked: ${unlocked}` : ''}`, 3200);
        break;
      }
      case 'crafted':
        this.toast(`Crafted ${this.content.furniture[e.furnitureId]?.name ?? 'item'}. It's in your storage.`);
        break;
      case 'resident_joined': {
        const where = this.content.rooms[e.roomId]?.name ?? 'your home';
        if (e.via === 'invitation') this.toast(`${this.content.residents[e.residentId]?.name} moved into the ${where}!`, 2600);
        if (e.via === 'expedition') this.toast(`${this.content.residents[e.residentId]?.name} came home with you and moved into the ${where}!`, 3400);
        break;
      }
      case 'room_bought':
        this.toast(e.kind === 'open' ? `The ${this.content.rooms[e.roomId]?.name} is open!` : `The ${this.content.rooms[e.roomId]?.name} is bigger now!`, 2600);
        break;
      case 'gathered':
        this.toast(`Gathered ${Object.entries(e.yield).map(([k, v]) => `${v} ${CURRENCY[k as Currency].name}`).join(', ')}`);
        break;
      case 'expedition_started':
        this.toast(`${this.content.residents[e.residentId]?.name} set off to ${this.content.expeditions[e.routeId]?.name}`, 2400);
        break;
      case 'expedition_done':
        this.toast(`${this.content.residents[e.residentId]?.name} is back from ${this.content.expeditions[e.routeId]?.name}!`, 2400);
        break;
      case 'ribbons_earned':
        // Arcade Ribbons are shown on the results card.
        if (e.source !== 'arcade') this.toast(`+${e.amount} Ribbon${e.amount > 1 ? 's' : ''}`);
        break;
      case 'companion_assigned': {
        const pet = this.content.companions[e.companionId]?.name ?? 'Companion';
        this.toast(e.residentId ? `${pet} now follows ${this.content.residents[e.residentId]?.name}` : `${pet} is resting in the Nookbook`);
        break;
      }
      case 'costume_bought':
        this.toast(`Bought ${this.content.costumes[e.costumeId]?.name}!`, 2200);
        break;
      case 'resident_moved':
        this.toast(`${this.content.residents[e.residentId]?.name} now lives in the ${this.content.rooms[e.roomId]?.name}`);
        break;
      case 'task_claimed':
        this.toast('Reward collected');
        break;
      case 'played':
        if (e.bondUp) this.toast(`${this.content.residents[e.residentId]?.name} reached Bond ${e.newBondLevel}!`, 2400);
        break;
      case 'form_upgraded':
        this.toast(`${this.content.residents[e.residentId]?.name} has a new look!`, 2400);
        break;
      case 'baking_started':
        this.toast(`${this.content.baking?.recipes[e.recipeId]?.name ?? 'A batch'} is in the oven`, 2200);
        break;
      case 'baking_done':
        this.toast(`Fresh from the oven: +${e.treats} Treats${e.bonus ? ` (${e.bonus} extra from ${this.content.residents[e.bakerId ?? '']?.name ?? 'your baker'})` : ''}`, 2800);
        break;
      case 'treat_given':
        this.toast(e.bondUp ? `${this.content.residents[e.residentId]?.name} loved it and reached Bond ${e.newBondLevel}!` : `${this.content.residents[e.residentId]?.name} loved the Treat`, 2200);
        break;
      case 'thread_traded':
        this.toast(`Stitched ${e.thread} Mending Thread into a Wish Stamp`, 2400);
        break;
      case 'succulent_planted':
        this.toast(`Planted ${this.content.garden?.species[e.speciesId]?.name ?? 'a seed'}`);
        break;
      case 'succulent_sold': {
        const name = this.content.garden?.species[e.speciesId]?.name ?? 'Succulent';
        this.toast(e.firstTime ? `${name} grown for the first time! Added to your Succulent book.` : `Sold ${name} for ${e.reward.buttons ?? 0} Buttons`, e.firstTime ? 2800 : 2000);
        break;
      }
      case 'pot_bought':
        this.toast(`A new pot! You have ${e.pots} now.`);
        break;
      case 'series_claimed': {
        const gift = e.furnitureId ? this.content.furniture[e.furnitureId]?.name : null;
        this.toast(`Series complete!${gift ? ` ${gift} is in your storage.` : ''}`, 3200);
        break;
      }
      default:
        break;
    }
  }

  private run(cmd: CommandInput): GameEvent[] | null {
    const res = this.dispatch(cmd);
    if (!res.ok) {
      this.toast(errorText(res.error));
      return null;
    }
    return res.events;
  }

  private tick(): void {
    const hasCountdown =
      (this.tab === 'home' && this.selection.kind === 'resident') ||
      (this.tab === 'nookbook' && this.detailId !== null) ||
      (this.tab === 'explore' && (this.exploreView === 'outdoors' || this.exploreView === 'kitchen' || this.exploreView === 'garden'));
    if (hasCountdown && !this.revealing && !this.arcade.isOpen) this.render();
    else this.renderBadges();
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await orientation.lock?.('landscape').catch(() => undefined);
      }
    } catch {
      this.toast('Full screen is not available here');
    }
  }

  // ---------- rendering ----------

  private render(): void {
    this.renderTop();
    this.renderRoomTabs();
    this.buildBtn.disabled = !isRoomOpen(this.getState(), this.content, this.roomId);
    this.renderBadges();
    this.renderPanel();
    this.page.hidden = this.tab === 'home';
    const scroll = this.page.scrollTop;
    this.page.replaceChildren();
    if (this.tab === 'tasks') this.renderTasks();
    if (this.tab === 'nookbook') this.renderNookbook();
    if (this.tab === 'explore') this.renderExplore();
    this.page.scrollTop = scroll;
  }

  private renderTop(): void {
    const s = this.getState();
    const level = levelFor(s.hearts, this.content);
    const next = nextLevel(s, this.content);
    const here = this.content.levels.find((l) => l.level === level)?.hearts ?? 0;
    document.getElementById('home-name')!.textContent = s.homeName;
    document.getElementById('lvl')!.textContent = `Lv ${level}`;
    document.getElementById('hearts-text')!.textContent = next ? `♥ ${s.hearts}/${next.hearts}` : `♥ ${s.hearts}`;
    const pct = next ? ((s.hearts - here) / (next.hearts - here)) * 100 : 100;
    (document.getElementById('hearts-fill') as HTMLElement).style.width = `${Math.max(0, Math.min(100, pct))}%`;
    document.getElementById('res-buttons')!.textContent = String(s.wallet.buttons);
    document.getElementById('res-stamps')!.textContent = String(s.wallet.wishStamps);
  }

  private renderBadges(): void {
    const s = this.getState();
    const tasksDue =
      taskStates(s, this.content).some((t) => t.status === 'claimable') ||
      Object.keys(this.content.invitations).some((id) => invitationStatus(s, this.content, id)?.ready);
    const now = Date.now();
    const parcelDue = this.parcelsDue() || this.outdoorsDue(now) || (!!s.baking && s.baking.endAt <= now);
    const bookDue =
      s.residentOrder.some((id) => !s.flags.includes(`viewed:${id}`) && id !== 'snug') ||
      this.content.series.some((x) => x.reward && seriesProgress(s, this.content, x.id).complete && !s.seriesClaimed.includes(x.id));
    const set = (tab: Tab, on: boolean) => {
      const b = document.querySelector<HTMLElement>(`#rail .tab[data-tab="${tab}"] .badge`);
      if (b) b.hidden = !on;
    };
    set('tasks', tasksDue);
    set('explore', parcelDue);
    set('nookbook', bookDue);
  }

  // ---------- right panel (Home tab) ----------

  private renderPanel(): void {
    const panel = this.panel;
    const wasHidden = panel.hidden;
    panel.replaceChildren();
    let show = false;
    if (this.tab === 'home' && !isRoomOpen(this.getState(), this.content, this.roomId)) {
      show = true;
      this.renderLockedRoom(panel, this.roomId);
    } else if (this.tab === 'home' && this.build) {
      show = true;
      if (this.pending) this.renderPending(panel, this.pending);
      else this.renderTray(panel);
    } else if (this.tab === 'home' && this.selection.kind === 'furniture') {
      show = true;
      this.renderFurniture(panel, this.selection.defId, this.selection.uid);
    } else if (this.tab === 'home' && this.selection.kind === 'resident') {
      show = true;
      this.renderResidentPanel(panel, this.selection.id, this.selection.status);
    }
    panel.hidden = !show;
    if (wasHidden !== panel.hidden) this.onLayoutChange();
  }

  private renderLockedRoom(panel: HTMLElement, roomId: string): void {
    const s = this.getState();
    const room = this.content.rooms[roomId]!;
    const access = room.access!;
    panel.append(el('h2', '', room.name));
    const unlocked = isUnlocked(s, this.content, access.unlock);
    const lvl = this.content.levels.find((l) => l.unlocks.includes(access.unlock))?.level;
    panel.append(el('p', 'sub', unlocked ? `Open the ${room.name} to decorate it and give residents more space.` : `Opens at Home Level ${lvl}.`));
    const req = el('div', 'req');
    const cost = el('span', canAfford(s, access.cost) ? 'ok' : 'no');
    cost.append(...costChips(access.cost, ''));
    req.append(cost);
    panel.append(req);
    const acts = el('div', 'acts');
    acts.append(button(`Open the ${room.name}`, 'act primary wide', () => this.run({ type: 'buy_room', roomId, kind: 'open' }), !unlocked));
    panel.append(acts);
    panel.append(el('p', 'hint', 'Tip: the Yard has a woodpile and a berry bush you can gather from in Explore.'));
  }

  private renderTray(panel: HTMLElement): void {
    const s = this.getState();
    const room = this.content.rooms[this.roomId]!;
    panel.append(el('h2', '', `Build · ${room.name}`));
    panel.append(el('p', 'sub', 'Tap an item to place it, or tap furniture in the room to move it.'));
    if (room.walls === false) panel.append(el('p', 'hint', 'Outdoors: no wall or hanging items here.'));
    if (room.expansion && !s.purchases.includes(purchaseKey(room.id, 'expand'))) {
      const unlocked = isUnlocked(s, this.content, room.expansion.unlock);
      const lvl = this.content.levels.find((l) => l.unlocks.includes(room.expansion!.unlock))?.level;
      const card = el('div', 'req');
      const cost = el('span', canAfford(s, room.expansion.cost) ? 'ok' : 'no');
      cost.append(...costChips(room.expansion.cost, ''));
      card.append(el('span', unlocked ? 'ok' : 'no', `Expand: Home Level ${lvl}`), cost);
      panel.append(card);
      panel.append(button(`Expand the ${room.name}`, 'btn', () => this.run({ type: 'buy_room', roomId: room.id, kind: 'expand' }), !unlocked));
    }

    panel.append(el('h3', '', 'Craft'));
    if (!isUnlocked(s, this.content, 'crafting')) {
      panel.append(el('p', 'hint', 'Crafting unlocks at Home Level 2.'));
    } else {
      const tray = el('div', 'tray');
      const level = levelFor(s.hearts, this.content);
      const later = Object.values(this.content.recipes).filter((r) => r.requiresLevel > level);
      for (const r of Object.values(this.content.recipes).filter((r) => r.requiresLevel <= level)) {
        const def = this.content.furniture[r.furnitureId]!;
        const affordable = canAfford(s, r.cost);
        const b = el('button', `chip${affordable ? '' : ' empty'}`);
        const cost = el('span', 'cost');
        cost.append(...costChips(r.cost, '').flatMap((c) => [c, document.createTextNode(' ')]));
        b.append(el('span', '', def.name), cost);
        b.addEventListener('click', () => {
          if (!affordable) return this.toast(`Not enough to craft ${def.name}`);
          this.run({ type: 'craft', recipeId: r.id });
        });
        tray.append(b);
      }
      panel.append(tray);
      if (later.length) panel.append(el('p', 'hint', `${later.length} more recipes unlock at higher Home Levels.`));
    }

    const inv = s.inventory;
    for (const group of GROUPS) {
      if ((group.layer === 'wall' || group.layer === 'ceiling') && room.walls === false) continue;
      const defs = Object.values(this.content.furniture).filter((d) => d.layer === group.layer && (inv[d.id] ?? 0) > 0);
      panel.append(el('h3', '', group.label));
      if (defs.length === 0) {
        panel.append(el('p', 'hint', 'Nothing in storage.'));
        continue;
      }
      const tray = el('div', 'tray');
      for (const def of defs) {
        const b = el('button', 'chip');
        b.append(el('span', '', def.name), el('span', 'n', `×${inv[def.id]}`));
        b.addEventListener('click', () => this.getScene()?.beginPlace(def.id));
        tray.append(b);
      }
      panel.append(tray);
    }
  }

  private renderPending(panel: HTMLElement, e: PendingEdit): void {
    const def = this.content.furniture[e.defId]!;
    panel.append(el('h2', '', def.name));
    panel.append(el('p', 'sub', e.mode === 'new' ? 'Drag it into place, then confirm.' : 'Drag to move, or store it away.'));
    panel.append(tagChips(def.tags));
    panel.append(el('p', `status ${e.valid ? 'ok' : 'bad'}`, e.valid ? 'Fits here' : reasonText(e.reason)));
    const acts = el('div', 'acts');
    const scene = this.getScene();
    acts.append(button(e.mode === 'new' ? 'Place' : 'Confirm', 'act primary', () => scene?.confirmPending()));
    if (def.canFlip) acts.append(button('Flip', 'act', () => scene?.flipPending()));
    if (e.mode === 'move') acts.append(button('Store', 'act', () => scene?.storePending()));
    acts.append(button('Cancel', `act${def.canFlip && e.mode === 'move' ? ' wide' : ''}`, () => scene?.cancelPending()));
    panel.append(acts);
  }

  private renderFurniture(panel: HTMLElement, defId: string, uid: string): void {
    const def = this.content.furniture[defId];
    if (!def) return;
    panel.append(el('h2', '', def.name));
    panel.append(el('p', 'sub', `${def.w}×${def.h} · ${def.layer === 'wall' ? (def.overlay ? 'Wall, can hang over a window' : 'Wall') : def.layer === 'rug' ? 'Rug' : def.layer === 'ceiling' ? 'Hangs from the ceiling, anywhere in the room' : 'Floor'}`));
    panel.append(tagChips(def.tags));
    if (def.rest) panel.append(el('p', 'hint', def.rest === 'sleep' ? 'Residents nap here.' : 'Residents sit here.'));
    const acts = el('div', 'acts');
    acts.append(
      button('Move this', 'act primary', () => {
        this.setBuild(true);
        this.getScene()?.beginMove(uid);
      }),
    );
    panel.append(acts);
  }

  private renderResidentPanel(panel: HTMLElement, id: string, status: string): void {
    const def = this.content.residents[id];
    const owned = this.getState().residents[id];
    if (!def || !owned) return;
    const mini = el('div', 'mini');
    const img = el('img');
    img.src = portraitUrl(def, { decorated: owned.form === 'decorated', costume: owned.costume });
    img.alt = '';
    const names = el('div');
    names.append(el('h2', '', def.name), el('p', 'sub', `${def.rarity} · ${status} · ${this.content.rooms[owned.room]?.name ?? ''}`));
    mini.append(img, names);
    panel.append(mini);
    const bond = bondProgress(owned.bondXp, this.content);
    const line = el('p', 'hint');
    line.append(document.createTextNode('Bond '), bondHearts(bond.level));
    panel.append(line);
    panel.append(el('p', 'hint', def.tagline));
    const acts = el('div', 'acts');
    acts.append(this.playButton(id, 'act primary'), button('Open page', 'act wide', () => this.openCharacter(id)));
    panel.append(acts);
  }

  private playButton(id: string, cls: string): HTMLButtonElement {
    const wait = playReadyAt(this.getState(), this.content, id) - Date.now();
    const def = this.content.residents[id]!;
    if (this.getState().expedition?.residentId === id) return button(`${def.name} is exploring`, cls, () => undefined, true);
    const left = playsLeftToday(this.getState(), this.content, id, Date.now());
    if (left <= 0) return button('Play again tomorrow', cls, () => undefined, true);
    return button(wait > 0 ? `Play in ${seconds(wait)}` : `Play · ${left} left today`, cls, () => {
      this.run({ type: 'play', residentId: id, at: Date.now() });
    }, wait > 0);
  }

  // ---------- Tasks page ----------

  private tasksView: TasksView = 'tasks';

  private renderTasks(): void {
    const s = this.getState();
    const open = Object.keys(this.content.invitations).filter((id) => {
      const st = invitationStatus(s, this.content, id);
      return !!st && !st.owned && st.def.requiresLevel <= levelFor(s.hearts, this.content) + 1;
    });
    const ready = open.some((id) => invitationStatus(s, this.content, id)?.ready);
    const claimable = taskStates(s, this.content).some((t) => t.status === 'claimable');
    const head = el('div', 'page-h');
    head.append(el('h2', '', this.tasksView === 'tasks' ? 'Tasks' : 'Invitations'));
    const seg = el('div', 'filters');
    for (const [view, label, due] of [['tasks', 'Tasks', claimable], ['invitations', `Invitations${open.length ? ` (${open.length})` : ''}`, ready]] as Array<[TasksView, string, boolean]>) {
      const b = button(label, `filter${this.tasksView === view ? ' on' : ''}`, () => {
        this.tasksView = view;
        this.page.scrollTop = 0;
        this.render();
      });
      b.setAttribute('aria-pressed', String(this.tasksView === view));
      if (due && this.tasksView !== view) b.append(el('span', 'dot'));
      seg.append(b);
    }
    head.append(seg);
    this.page.append(head);
    if (this.tasksView === 'invitations') return this.renderInvitations();
    this.page.append(el('p', 'muted', 'Finish a task to unlock the next one.'));

    // Current task first, then what's coming, then finished ones at the bottom.
    const order: Record<string, number> = { claimable: 0, active: 0, locked: 1, claimed: 2 };
    const all = taskStates(s, this.content);
    const sorted = [...all].sort((a, b) => order[a.status]! - order[b.status]!);
    let shownLocked = 0;
    for (const { def, status } of sorted) {
      if (status === 'locked' && ++shownLocked > 1) continue;
      this.page.append(this.taskCard(def, status));
    }
    const doneCount = all.filter((t) => t.status === 'claimed').length;
    if (doneCount === all.length) this.page.prepend(el('p', 'muted', 'Every task is done. Your home is complete!'));
    const extra = this.tasksExtra?.();
    if (extra) this.page.append(extra);
  }

  /** Friends who can be invited now, and a peek at the next one. */
  private renderInvitations(): void {
    const s = this.getState();
    let shown = 0;
    for (const id of Object.keys(this.content.invitations)) {
      const st = invitationStatus(s, this.content, id);
      if (!st || st.owned) continue;
      const def = this.content.residents[id]!;
      const card = el('div', 'card');
      const row = el('div', 'row');
      const img = el('img');
      img.src = portraitUrl(def, { silhouette: !st.levelOk });
      img.alt = '';
      img.style.cssText = 'width:52px;height:52px;border-radius:10px;background:#f3e4ec;object-fit:contain';
      const body = el('div', 'grow');
      body.append(el('h3', '', st.levelOk ? `Invitation: ${def.name}` : 'Invitation: ???'));
      if (!st.levelOk && st.def.requiresLevel > levelFor(s.hearts, this.content) + 1) {
        // Only tease the next level's invitation; later ones stay off the page.
        continue;
      }
      body.append(el('p', '', st.levelOk ? `${st.def.welcomeText} Once the room is right, ${def.name} is guaranteed to join.` : `Unlocks at Home Level ${st.def.requiresLevel}.`));
      const req = el('div', 'req');
      req.append(el('span', st.levelOk ? 'ok' : 'no', `Home Level ${st.def.requiresLevel}`));
      const roomName = this.content.rooms[st.def.roomId]?.name ?? '';
      if (!st.roomOpen) req.append(el('span', 'no', `Open the ${roomName}`));
      for (const a of st.atmosphere) req.append(el('span', a.ok ? 'ok' : 'no', `${roomName}: ${a.tag} ${a.have}/${a.need}`));
      for (const p of st.placed) req.append(el('span', p.ok ? 'ok' : 'no', `${this.content.furniture[p.furnitureId]?.name} placed`));
      const friendsOk = st.friends.filter((f) => f.ok).length;
      if (st.friends.length) req.append(el('span', friendsOk === st.friends.length ? 'ok' : 'no', `Friends ${friendsOk}/${st.friends.length}`));
      const gift = el('span', st.giftOk ? 'ok' : 'no');
      gift.append(...costChips(st.def.welcomeGift, ''));
      gift.prepend(document.createTextNode('Gift: '));
      req.append(gift);
      body.append(req);
      const cell = el('div', 'actions');
      cell.style.flexDirection = 'column';
      cell.append(button('Invite', 'btn primary', () => this.run({ type: 'invite', residentId: id }), !st.ready));
      if (st.levelOk && st.roomOpen && !st.ready) cell.append(button('Decorate', 'btn', () => { this.showRoom(st.def.roomId); this.setBuild(true); }));
      row.append(img, body, cell);
      card.append(row);
      this.page.append(card);
      shown++;
    }
    if (!shown) this.page.append(el('p', 'muted', 'Nobody is waiting for an invitation right now. New friends can be invited as your Home Level rises.'));
  }


  private taskCard(def: TaskDef, status: string): HTMLElement {
    const card = el('div', `card task ${status}`);
    const row = el('div', 'row');
    const body = el('div', 'grow');
    // A task from a later chapter waits for its Home Level, not for another task.
    const waitsForLevel = status === 'locked' && levelFor(this.getState().hearts, this.content) < (def.fromLevel ?? 1);
    body.append(el('h3', '', waitsForLevel ? 'A new chapter' : status === 'locked' ? '???' : def.title));
    body.append(el('p', '', waitsForLevel ? `Opens at Home Level ${def.fromLevel}. Play with your friends, upgrade their looks and craft new things to earn Home Hearts.` : status === 'locked' ? 'Finish the task above to reveal this one.' : def.description));
    if (status !== 'locked' && status !== 'claimed') {
      const rewards = el('div', 'rewards');
      rewards.append(...costChips(def.reward));
      body.append(rewards);
    }
    row.append(body);
    if (status === 'claimable') row.append(button('Claim', 'btn primary', () => this.run({ type: 'claim_task', taskId: def.id })));
    else if (status === 'active' && def.goTo) row.append(button('Go', 'btn', () => this.go(def.goTo!, taskRoom(def))));
    else if (status === 'claimed') row.append(el('span', 'muted', 'Done'));
    card.append(row);
    return card;
  }

  private go(target: NonNullable<TaskDef['goTo']>, roomId?: string): void {
    if (target === 'build') {
      this.setTab('home');
      if (roomId) this.showRoom(roomId);
      if (isRoomOpen(this.getState(), this.content, this.roomId)) this.setBuild(true);
    } else if (target === 'nookbook') this.setTab('nookbook');
    else if (target === 'parcels' || target === 'explore' || target === 'kitchen') {
      this.exploreView = target === 'explore' ? 'outdoors' : target;
      this.setTab('explore');
    } else {
      this.tasksView = 'invitations';
      this.page.scrollTop = 0;
      this.render();
    }
  }

  // ---------- Nookbook ----------

  private renderNookbook(): void {
    if (this.detailId) return this.renderDetail(this.detailId);
    const s = this.getState();
    const allSeries = this.content.series;
    if (!allSeries.some((x) => x.id === this.seriesTab)) this.seriesTab = allSeries[0]?.id ?? 'first_residents';
    const seriesDef = allSeries.find((x) => x.id === this.seriesTab);
    const seriesNo = allSeries.findIndex((x) => x.id === this.seriesTab) + 1;
    const series = Object.values(this.content.residents).filter((r) => r.series === this.seriesTab);
    const ownedCount = series.filter((r) => r.id in s.residents).length;
    if (allSeries.length > 1) {
      // One tab per series, each with its own count.
      const tabs = el('div', 'filters series-tabs');
      for (const x of allSeries) {
        const p = seriesProgress(s, this.content, x.id);
        const b = button(`${x.name} ${p.owned}/${p.total}`, `filter${x.id === this.seriesTab ? ' on' : ''}`, () => {
          this.seriesTab = x.id;
          this.page.scrollTop = 0;
          this.render();
        });
        if (x.reward && p.complete && !p.claimed) b.append(el('span', 'dot'));
        tabs.append(b);
      }
      this.page.append(tabs);
    }
    const head = el('div', 'page-h');
    head.append(el('h2', '', allSeries.length > 1 ? `Series ${seriesNo} · ${seriesDef?.name ?? ''}` : 'Series 1 · The First Residents'), el('span', 'grow'), el('span', 'muted', `${ownedCount}/${series.length}`));
    this.page.append(head);
    const bar = el('div', 'progress');
    const fill = el('span');
    fill.style.width = `${(ownedCount / series.length) * 100}%`;
    bar.append(fill);
    this.page.append(bar);
    const filters = el('div', 'filters');
    filters.style.margin = '8px 0';
    for (const f of ['all', 'owned', 'missing'] as Filter[]) {
      filters.append(button(f === 'all' ? 'All' : f === 'owned' ? 'Owned' : 'Missing', `filter${this.filter === f ? ' on' : ''}`, () => {
        this.filter = f;
        this.render();
      }));
    }
    this.page.append(filters);
    const grid = el('div', 'grid');
    for (const r of series) {
      const owned = r.id in s.residents;
      if ((this.filter === 'owned' && !owned) || (this.filter === 'missing' && owned)) continue;
      const card = el('button', `ncard${owned ? '' : ' missing'}`);
      const img = el('img');
      img.src = portraitUrl(r, { silhouette: !owned, decorated: s.residents[r.id]?.form === 'decorated', costume: s.residents[r.id]?.costume });
      img.alt = owned ? r.name : 'Not yet found';
      card.append(img, el('span', 'nm', owned ? r.name : '???'), el('span', `rar ${r.rarity}`, r.rarity));
      card.addEventListener('click', () => this.openDetail(r.id));
      grid.append(card);
    }
    this.page.append(grid);
    if (seriesDef?.reward) {
      // One-time reward for the whole series.
      const p = seriesProgress(s, this.content, seriesDef.id);
      const card = el('div', 'card');
      card.append(el('h3', '', p.claimed ? 'Series complete!' : 'Series reward'));
      const rewards = el('div', 'rewards');
      rewards.append(...costChips(seriesDef.reward.cost));
      const gift = seriesDef.reward.furnitureId ? this.content.furniture[seriesDef.reward.furnitureId] : undefined;
      if (gift) rewards.append(el('span', 'reward', `✦ ${gift.name}`));
      card.append(rewards);
      if (p.claimed) card.append(el('p', 'muted', 'Collected. Thank you for giving everyone a home.'));
      else if (p.complete) card.append(button('Collect', 'btn primary', () => this.run({ type: 'claim_series', seriesId: seriesDef.id })));
      else card.append(el('p', 'muted', `Find all ${p.total} friends in this series to collect it (${p.owned}/${p.total}).`));
      this.page.append(card);
      return;
    }
    this.page.append(el('p', 'cabinet', ownedCount === series.length ? 'Series complete! Your display cabinet is ready.' : 'Complete the series to unlock its display cabinet.'));
  }

  private openDetail(id: string): void {
    this.detailId = id;
    const s = this.getState();
    if (id in s.residents && !s.flags.includes(`viewed:${id}`)) this.run({ type: 'set_flag', flag: `viewed:${id}` });
    this.page.scrollTop = 0;
    this.render();
  }

  private renderDetail(id: string): void {
    const s = this.getState();
    const def = this.content.residents[id]!;
    const owned = s.residents[id];
    const head = el('div', 'page-h');
    head.append(button('‹ Back', 'btn light', () => { this.detailId = null; this.render(); }), el('span', 'grow'));
    this.page.append(head);
    const wrap = el('div', 'detail');
    const art = el('div', 'art');
    const img = el('img');
    img.src = portraitUrl(def, { silhouette: !owned, decorated: owned?.form === 'decorated', costume: owned?.costume });
    img.alt = owned ? def.name : 'Not yet found';
    art.append(img);
    const info = el('div', 'info');
    const title = el('div', 'row');
    title.append(el('h2', '', owned ? def.name : '???'), el('span', `rar ${def.rarity}`, def.rarity));
    info.append(title);
    if (!owned) {
      info.append(el('p', 'tagline', 'Not found yet.'), el('p', 'story', def.hint));
    } else {
      info.append(el('p', 'tagline', def.tagline));
      const bond = bondProgress(owned.bondXp, this.content);
      const kv = el('dl', 'kv');
      const add = (k: string, v: string | HTMLElement) => {
        kv.append(el('dt', '', k));
        const dd = el('dd');
        dd.append(v);
        kv.append(dd);
      };
      add('Mood', def.mood);
      add('Favourite decor', def.favouriteTags.join(', '));
      const bondCell = el('span');
      bondCell.append(bondHearts(bond.level), document.createTextNode(bond.span ? `  ${bond.into}/${bond.span} to next` : '  Max'));
      add('Bond', bondCell);
      add('Form', owned.form === 'decorated' ? 'Decorated' : 'Original');
      add('Lives in', this.homePicker(id, owned.room));
      const pets = this.companionPicker(id);
      if (pets) add('Companion', pets);
      info.append(kv, el('p', 'story', def.story));
      const actions = el('div', 'actions');
      actions.append(this.playButton(id, 'btn primary'));
      if (this.content.baking && levelFor(s.hearts, this.content) >= (this.content.levels.find((l) => l.unlocks.includes('baking'))?.level ?? 99)) {
        const away = s.expedition?.residentId === id;
        const given = treatGivenToday(s, this.content, id, Date.now());
        const afford = canAfford(s, this.content.baking.giftCost);
        actions.append(button(given ? 'Treat given today' : `Give a Treat (${s.wallet.treats})`, 'btn', () => this.run({ type: 'give_treat', residentId: id, at: Date.now() }), away || given || !afford));
      }
      const upgrade = this.content.formUpgrades.find((u) => u.form === 'decorated');
      if (upgrade && owned.form === 'original') {
        const bondOk = bond.level >= upgrade.requiresBond;
        const afford = canAfford(s, upgrade.cost);
        const b = button('Upgrade to Decorated', 'btn', () => this.run({ type: 'upgrade_form', residentId: id }), !(bondOk && afford));
        actions.append(b);
        const req = el('div', 'req');
        req.append(el('span', bondOk ? 'ok' : 'no', `Bond ${upgrade.requiresBond}`));
        const cost = el('span', afford ? 'ok' : 'no');
        cost.append(...costChips(upgrade.cost, ''));
        req.append(cost);
        info.append(actions, req);
      } else {
        info.append(actions);
      }
      const wardrobe = this.renderWardrobe(id);
      if (wardrobe) info.append(wardrobe);
    }
    wrap.append(art, info);
    this.page.append(wrap);
  }

  /** Costumes for one resident: buy with Ribbons, then wear or take off. */
  private renderWardrobe(id: string): HTMLElement | null {
    const s = this.getState();
    const list = visibleCostumes(this.content, id);
    if (!list.length) return null;
    const box = el('div', 'wardrobe');
    box.append(el('h3', '', 'Wardrobe'));
    const have = el('div', 'rewards');
    have.append(...costChips({ ribbons: s.wallet.ribbons ?? 0 }));
    box.append(have);
    const level = levelFor(s.hearts, this.content);
    const worn = s.residents[id]?.costume ?? null;
    for (const c of list) {
      const row = el('div', 'spot-row');
      const body = el('div', 'grow');
      body.append(el('b', '', c.name), el('p', '', c.description));
      if (!hasCostumeArt(id, c.id)) body.append(el('p', 'hint', 'Costume art is on its way.'));
      row.append(body);
      const owned = s.costumesOwned.includes(c.id);
      if (!owned) {
        if (level < c.requiresLevel) row.append(el('span', 'muted', `Home Level ${c.requiresLevel}`));
        else {
          const cost = el('div', 'rewards');
          cost.append(...costChips(c.cost));
          row.append(cost, button('Buy', 'btn primary', () => this.run({ type: 'buy_costume', costumeId: c.id }), !canAfford(s, c.cost)));
        }
      } else if (worn === c.id) row.append(button('Take off', 'btn', () => this.run({ type: 'wear_costume', residentId: id, costumeId: null })));
      else row.append(button('Wear', 'btn primary', () => this.run({ type: 'wear_costume', residentId: id, costumeId: c.id })));
      box.append(row);
    }
    return box;
  }

  /** Choose which Arcade companion follows this resident (one each). */
  private companionPicker(id: string): HTMLElement | null {
    const s = this.getState();
    const owned = Object.keys(s.companions);
    if (!owned.length) return null;
    const current = companionOf(s, id);
    const select = el('select', 'pick');
    const none = el('option', '', 'None');
    none.value = '';
    select.append(none);
    for (const pet of owned) {
      const def = this.content.companions[pet];
      if (!def) continue;
      const with_ = s.companions[pet]?.residentId;
      const note = with_ && with_ !== id ? ` (with ${this.content.residents[with_]?.name})` : '';
      const opt = el('option', '', `${def.name}${note}`);
      opt.value = pet;
      opt.selected = pet === current;
      select.append(opt);
    }
    if (!current) none.selected = true;
    select.addEventListener('change', () => {
      if (select.value) this.run({ type: 'assign_companion', companionId: select.value, residentId: id });
      else if (current) this.run({ type: 'assign_companion', companionId: current, residentId: null });
    });
    return select;
  }

  // ---------- Arcade hooks ----------

  /** Hide and Seek is played in a room of the player's home: the current one if it has enough furniture to hide behind. */
  private showRoomForHide(): void {
    const s = this.getState();
    this.beforeHide = { tab: this.tab, roomId: this.roomId };
    const spots = (roomId: string) =>
      (s.rooms[roomId]?.placements ?? []).filter((p) => {
        const layer = this.content.furniture[p.defId]?.layer;
        return layer === 'floor' || layer === 'wall';
      }).length;
    let room = this.roomId;
    if (spots(room) < 3) {
      const open = this.content.roomOrder.filter((r) => isRoomOpen(s, this.content, r));
      room = open.reduce((best, r) => (spots(r) > spots(best) ? r : best), room);
    }
    this.showRoom(room);
  }

  private leaveRoomAfterHide(): void {
    const back = this.beforeHide;
    this.beforeHide = null;
    if (!back) return;
    this.getScene()?.switchRoom(back.roomId);
    this.setTab(back.tab);
  }

  /** From the prize reveal: go home in Build mode with the new item ready to place. */
  private placeNow(defId: string): void {
    this.setTab('home');
    if (!isRoomOpen(this.getState(), this.content, this.roomId)) this.showRoom(this.content.roomOrder[0]!);
    this.setBuild(true);
    this.getScene()?.beginPlace(defId);
  }

  private homePicker(id: string, current: string): HTMLElement {
    const s = this.getState();
    const select = el('select', 'pick');
    for (const roomId of this.content.roomOrder) {
      if (!isRoomOpen(s, this.content, roomId)) continue;
      const count = residentsInRoom(s, roomId).length;
      const full = roomId !== current && count >= this.content.rules.maxResidentsPerRoom;
      const opt = el('option', '', `${this.content.rooms[roomId]!.name} (${count}/${this.content.rules.maxResidentsPerRoom})${full ? ' · full' : ''}`);
      opt.value = roomId;
      opt.disabled = full;
      opt.selected = roomId === current;
      select.append(opt);
    }
    select.addEventListener('change', () => this.run({ type: 'move_resident', residentId: id, roomId: select.value }));
    return select;
  }

  // ---------- Explore: gathering, expeditions and Mystery Parcels ----------

  private renderGathering(): void {
    const s = this.getState();
    const now = Date.now();
    const card = el('div', 'card');
    card.append(el('h3', '', 'Gathering in the Yard'));
    for (const spot of Object.values(this.content.gatherSpots)) {
      const row = el('div', 'spot-row');
      const thumb = cardArt(`spot_${spot.id}`);
      if (thumb) row.append(thumb);
      const body = el('div', 'grow');
      body.append(el('b', '', spot.name));
      const yieldLine = el('div', 'rewards');
      yieldLine.append(...costChips(spot.yield));
      body.append(yieldLine);
      row.append(body);
      if (!spotUnlocked(s, this.content, spot.id)) {
        const lvl = spot.requiresUnlock ? this.content.levels.find((l) => l.unlocks.includes(spot.requiresUnlock!))?.level : undefined;
        row.append(el('span', 'muted', lvl ? `Home Level ${lvl}` : 'Locked'));
      } else {
        const wait = gatherReadyIn(s, this.content, spot.id, now);
        row.append(wait > 0 ? el('span', 'timer', `Ready in ${clock(wait)}`) : button('Gather', 'btn primary', () => this.run({ type: 'gather', spotId: spot.id, at: Date.now() })));
      }
      card.append(row);
    }
    this.page.append(card);
  }

  private tripResident = '';

  private renderExpeditions(): void {
    const s = this.getState();
    const now = Date.now();
    const card = el('div', 'card');
    card.append(el('h3', '', 'Expeditions'));
    if (!isUnlocked(s, this.content, 'expeditions')) {
      const lvl = this.content.levels.find((l) => l.unlocks.includes('expeditions'))?.level;
      card.append(el('p', '', `Send a resident on a little trip for Keepsakes. Unlocks at Home Level ${lvl}.`));
      this.page.append(card);
      return;
    }
    const trip = s.expedition;
    if (trip) {
      const route = this.content.expeditions[trip.routeId]!;
      const who = this.content.residents[trip.residentId]!.name;
      const left = trip.endAt - now;
      card.append(el('p', '', left > 0 ? `${who} is exploring ${route.name}.` : `${who} is back from ${route.name}!`));
      const bar = el('div', 'trip-bar');
      const fill = el('span');
      fill.style.width = `${Math.min(100, Math.max(0, ((now - trip.startAt) / (trip.endAt - trip.startAt)) * 100))}%`;
      bar.append(fill);
      card.append(bar);
      card.append(left > 0 ? el('p', 'timer', `Home in ${clock(left)}`) : button('Welcome home', 'btn primary', () => this.run({ type: 'collect_expedition', at: Date.now() })));
      this.page.append(card);
      return;
    }
    const owned = s.residentOrder;
    if (!owned.includes(this.tripResident)) this.tripResident = owned[0] ?? '';
    const pickRow = el('div', 'spot-row');
    pickRow.append(el('span', 'grow', 'Who goes?'));
    const select = el('select', 'pick');
    for (const id of owned) {
      const opt = el('option', '', this.content.residents[id]!.name);
      opt.value = id;
      opt.selected = id === this.tripResident;
      select.append(opt);
    }
    select.addEventListener('change', () => { this.tripResident = select.value; });
    pickRow.append(select);
    card.append(pickRow);
    for (const route of Object.values(this.content.expeditions)) {
      const row = el('div', 'spot-row');
      const thumb = cardArt(`exp_${route.id}`);
      if (thumb) row.append(thumb);
      const body = el('div', 'grow');
      body.append(el('b', '', `${route.name} · ${route.durationMs >= 3_600_000 ? `${Math.round(route.durationMs / 360_000) / 10} h` : `${Math.round(route.durationMs / 60_000)} min`}`), el('p', '', route.description));
      const rewards = el('div', 'rewards');
      rewards.append(...costChips(route.reward));
      if (route.firstTimeResident && !s.expeditionsDone[route.id] && !(route.firstTimeResident in s.residents)) rewards.append(el('span', 'reward', '✦ Someone special'));
      body.append(rewards);
      if (isUnlocked(s, this.content, route.requiresUnlock)) {
        row.append(body, button('Send', 'btn primary', () => this.run({ type: 'start_expedition', routeId: route.id, residentId: this.tripResident, at: Date.now() })));
      } else {
        row.append(body, el('span', 'muted', `Home Level ${this.content.levels.find((l) => l.unlocks.includes(route.requiresUnlock))?.level ?? '?'}`));
      }
      card.append(row);
    }
    this.page.append(card);
  }

  // ---------- Explore: Baking (Series 2) ----------

  private renderBaking(): void {
    const rules = this.content.baking;
    if (!rules) return;
    const s = this.getState();
    const now = Date.now();
    const level = levelFor(s.hearts, this.content);
    const at = this.content.levels.find((l) => l.unlocks.includes('baking'))?.level ?? 99;
    if (level < at - 1) return;
    const card = el('div', 'card');
    const title = el('h3', '', 'Baking in the Kitchen');
    card.append(title);
    if (level < at || !bakingOpen(s, this.content)) {
      card.append(el('p', '', level < at ? `Bake Treats for your friends. Unlocks at Home Level ${at}.` : `Open the ${this.content.rooms[rules.roomId]?.name ?? 'Kitchen'} to start baking Treats.`));
      this.page.append(card);
      return;
    }
    const have = el('p', 'muted');
    have.append(document.createTextNode('You have '), ...costChips({ treats: s.wallet.treats || 0 }, ''), document.createTextNode(s.wallet.treats ? '' : '0 Treats'));
    card.append(have);
    const batch = s.baking;
    if (batch) {
      const recipe = rules.recipes[batch.recipeId];
      const who = batch.bakerId ? this.content.residents[batch.bakerId]?.name : null;
      const left = batch.endAt - now;
      const total = bakeYield(this.content, batch.recipeId, batch.bakerId && batch.bakerId in s.residents ? batch.bakerId : null).treats;
      card.append(el('p', '', left > 0 ? `${recipe?.name ?? 'A batch'} ${who ? `with ${who} ` : ''}is in the oven.` : `${recipe?.name ?? 'Your batch'} is ready!`));
      const bar = el('div', 'trip-bar');
      const fill = el('span');
      fill.style.width = `${Math.min(100, Math.max(0, ((now - batch.startAt) / (batch.endAt - batch.startAt)) * 100))}%`;
      bar.append(fill);
      card.append(bar);
      card.append(left > 0 ? el('p', 'timer', `Ready in ${clock(left)} · ${total} Treats`) : button(`Collect ${total} Treats`, 'btn primary', () => this.run({ type: 'collect_baking', at: Date.now() })));
      this.page.append(card);
      return;
    }
    const bakers = s.residentOrder.filter((id) => canBake(s, this.content, id));
    if (this.bakerPick && !bakers.includes(this.bakerPick)) this.bakerPick = '';
    if (bakers.length) {
      const pickRow = el('div', 'spot-row');
      pickRow.append(el('span', 'grow', 'Who helps?'));
      const select = el('select', 'pick');
      const none = el('option', '', 'Nobody');
      none.value = '';
      none.selected = this.bakerPick === '';
      select.append(none);
      for (const id of bakers) {
        const opt = el('option', '', this.content.residents[id]!.name);
        opt.value = id;
        opt.selected = id === this.bakerPick;
        select.append(opt);
      }
      select.addEventListener('change', () => { this.bakerPick = select.value; this.render(); });
      pickRow.append(select);
      card.append(pickRow);
    } else {
      card.append(el('p', 'muted', 'A Teatime Friend can help at the oven for extra Treats.'));
    }
    const baker = this.bakerPick || null;
    for (const { def, unlocked } of bakeRecipes(s, this.content)) {
      const row = el('div', 'spot-row');
      const body = el('div', 'grow');
      const hours = def.durationMs / 3_600_000;
      const y = bakeYield(this.content, def.id, baker);
      const favourite = !!baker && this.content.residents[baker]?.favouriteBake === def.id;
      body.append(el('b', '', `${def.name} · ${hours >= 1 ? `${hours} h` : `${Math.round(def.durationMs / 60_000)} min`}`), el('p', '', def.description));
      const rewards = el('div', 'rewards');
      rewards.append(...costChips({ treats: y.treats }));
      if (favourite) rewards.append(el('span', 'reward', `♥ ${this.content.residents[baker!]?.name}'s favourite`));
      const cost = el('span', canAfford(s, def.cost) ? 'muted' : 'no');
      cost.append(document.createTextNode('Costs '), ...costChips(def.cost, ''));
      rewards.append(cost);
      body.append(rewards);
      row.append(body);
      if (!unlocked) row.append(el('span', 'muted', `Home Level ${def.requiresLevel}`));
      else row.append(button('Bake', 'btn primary', () => this.run({ type: 'start_baking', recipeId: def.id, bakerId: baker, at: Date.now() }), !canAfford(s, def.cost)));
      card.append(row);
    }
    this.page.append(card);
  }

  // ---------- Explore: Succulent Garden ----------

  private renderGarden(): void {
    const g = this.content.garden;
    if (!g) return;
    const s = this.getState();
    const now = Date.now();
    const at = this.content.levels.find((l) => l.unlocks.includes(g.unlock))?.level ?? 99;
    const palette = { seedling: g.seedlingColour };
    // The pot is art when it has been imported, else a drawn stand-in.
    const pot = (hanging: boolean): HTMLElement => {
      const url = artUrl(hanging ? 'garden_pot_hanging' : 'garden_pot');
      if (!url) return el('span', 'felt-pot');
      const img = el('img', 'pot-art');
      img.src = url;
      img.alt = '';
      return img;
    };
    const card = el('div', 'card');
    card.append(el('h3', '', 'Succulent Garden'));
    if (!gardenOpen(s, this.content)) {
      card.append(el('p', '', `Grow little succulents that change colour as they grow. Unlocks at Home Level ${at}.`));
      this.page.append(card);
      return;
    }
    card.append(el('p', 'muted', 'Seedlings start green and slowly take on their own colour. Sell a grown plant, or keep it on show.'));
    const pots = el('div', 'pots');
    s.garden.pots.forEach((plant, i) => {
      const tile = el('div', 'pot-tile');
      const def = plant ? g.species[plant.speciesId] : undefined;
      if (!plant || !def) {
        tile.classList.add('empty');
        const empty = el('div', 'pot-stage');
        empty.append(pot(false));
        tile.append(empty, el('b', '', 'Empty pot'), el('span', 'muted', 'Pick a seed below'));
        pots.append(tile);
        return;
      }
      const grow = succulentGrowth(this.content, def.id, plant.plantedAt, now)!;
      const stage = el('div', `pot-stage${def.anchor === 'top' ? ' hang' : ''}`);
      const img = el('img', 'plant');
      img.alt = def.name;
      img.src = succulentImage(def, palette, grow.colour, () => this.render()) ?? succulentArtUrl(def) ?? '';
      // Seedlings are small and fill out as they grow.
      const ease = grow.progress * grow.progress * (3 - 2 * grow.progress);
      img.style.setProperty('--grow', String(0.42 + 0.58 * ease));
      stage.append(img, pot(def.anchor === 'top'));
      tile.append(stage, el('b', '', def.name));
      if (grow.stage === 'grown') {
        tile.append(button(`Sell · ${def.sellPrice.buttons ?? 0}`, 'btn primary small', () => this.run({ type: 'sell_succulent', pot: i, at: Date.now() })));
      } else {
        tile.append(el('span', 'muted', `${grow.stage === 'seedling' ? 'Seedling' : 'Growing'} · ${clock(grow.grownAt - now)}`));
        const bar = el('div', 'trip-bar');
        const fill = el('span');
        fill.style.width = `${Math.round(grow.progress * 100)}%`;
        bar.append(fill);
        tile.append(bar);
      }
      pots.append(tile);
    });
    const potCost = nextPotCost(s, this.content);
    if (potCost) {
      const tile = el('div', 'pot-tile buy');
      tile.append(el('b', '', 'Another pot'));
      const price = el('span', canAfford(s, potCost) ? 'muted' : 'no');
      price.append(...costChips(potCost, ''));
      tile.append(price, button('Buy', 'btn small', () => this.run({ type: 'buy_pot' }), !canAfford(s, potCost)));
      pots.append(tile);
    }
    card.append(pots);
    this.page.append(card);

    const seeds = el('div', 'card');
    seeds.append(el('h3', '', `Seed packets · grown ${s.garden.grown.length} of ${g.order.length}`));
    const freePot = s.garden.pots.findIndex((p) => p === null);
    for (const id of g.order) {
      const def = g.species[id]!;
      const row = el('div', 'spot-row');
      const thumb = el('img', 'seed-thumb');
      thumb.alt = '';
      const grown = s.garden.grown.includes(id);
      // The seed packet art; without it, the plant itself (full colour once grown, a green seedling before).
      thumb.src = artUrl(`garden_seed_${id}`) ?? succulentImage(def, palette, grown ? 1 : 0, () => this.render()) ?? succulentArtUrl(def) ?? '';
      const body = el('div', 'grow');
      const hours = (def.sproutMs + def.growMs) / 3_600_000;
      body.append(el('b', '', `${def.name}${grown ? ' ✓' : ''}`), el('p', '', def.description));
      const info = el('div', 'rewards');
      info.append(el('span', 'reward', `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h to grow`));
      const sells = el('span', 'reward');
      sells.append(document.createTextNode('Sells for '), ...costChips(def.sellPrice, ''));
      info.append(sells);
      body.append(info);
      const cost = el('span', canAfford(s, def.seedCost) ? 'muted' : 'no');
      cost.append(...costChips(def.seedCost, ''));
      const plant = button('Plant', 'btn primary', () => this.run({ type: 'plant_succulent', pot: freePot, speciesId: id, at: Date.now() }), freePot < 0 || !canAfford(s, def.seedCost));
      const side = el('div', 'seed-side');
      side.append(cost, plant);
      row.append(thumb, body, side);
      seeds.append(row);
    }
    if (freePot < 0) seeds.append(el('p', 'muted', 'Every pot is in use. Sell a grown plant or buy another pot.'));
    this.page.append(seeds);
  }

  // ---------- Explore: Mystery Parcels ----------

  private renderExplore(): void {
    const s = this.getState();
    const level = levelFor(s.hearts, this.content);
    const head = el('div', 'page-h');
    head.append(el('h2', '', 'Explore'));
    // One short tab per activity, so nothing has to be scrolled past to reach something else.
    const bakingAt = this.content.baking ? this.content.levels.find((l) => l.unlocks.includes('baking'))?.level ?? 99 : 99;
    const now = Date.now();
    const views: Array<[ExploreView, string, boolean]> = [
      ['arcade', 'Arcade', false],
      ['outdoors', 'Outdoors', this.outdoorsDue(now)],
    ];
    const gardenAt = this.content.garden ? this.content.levels.find((l) => l.unlocks.includes(this.content.garden!.unlock))?.level ?? 99 : 99;
    if (this.content.garden && level >= gardenAt - 1) views.push(['garden', 'Garden', gardenReady(s, this.content, now)]);
    if (this.content.baking && level >= bakingAt - 1) views.push(['kitchen', 'Kitchen', !!s.baking && s.baking.endAt <= now]);
    views.push(['parcels', 'Parcels', this.parcelsDue()]);
    if (!views.some(([v]) => v === this.exploreView)) this.exploreView = 'outdoors';
    const seg = el('div', 'filters');
    for (const [view, label, due] of views) {
      const b = button(label, `filter${this.exploreView === view ? ' on' : ''}`, () => {
        this.exploreView = view;
        this.page.scrollTop = 0;
        this.render();
      });
      b.setAttribute('aria-pressed', String(this.exploreView === view));
      if (due && this.exploreView !== view) b.append(el('span', 'dot'));
      seg.append(b);
    }
    head.append(seg);
    this.page.append(head);
    if (this.exploreView === 'arcade') return this.arcade.renderHub(this.page);
    if (this.exploreView === 'kitchen') return this.renderBaking();
    if (this.exploreView === 'garden') return this.renderGarden();
    if (this.exploreView === 'parcels') return this.renderParcels();
    this.renderGathering();
    this.renderExpeditions();
  }

  /** Something outdoors is ready: a gathering spot, or a friend back from a trip. */
  private outdoorsDue(now: number): boolean {
    const s = this.getState();
    return (
      Object.keys(this.content.gatherSpots).some((id) => spotUnlocked(s, this.content, id) && gatherReadyIn(s, this.content, id, now) === 0) ||
      (!!s.expedition && s.expedition.endAt <= now)
    );
  }

  /** A Friend Parcel that can bring someone new is affordable. */
  private parcelsDue(): boolean {
    const s = this.getState();
    return Object.values(this.content.parcels).some((p) => poolCanOpen(s, this.content, p, 'friend'));
  }

  // ---------- Explore: Parcels ----------

  /** Which parcel's odds are open, as "<pool>:<kind>". */
  private oddsOpen = '';

  private renderParcels(): void {
    const s = this.getState();
    const level = levelFor(s.hearts, this.content);
    for (const pool of Object.values(this.content.parcels)) {
      const card = el('div', 'card');
      const title = pool.id === 'first_residents' ? 'Mystery Parcels' : pool.name;
      if (!isUnlocked(s, this.content, pool.requiresUnlock)) {
        const at = this.content.levels.find((l) => l.unlocks.includes(pool.requiresUnlock))?.level ?? 99;
        // Pools from a later chapter stay out of sight until the level before they open.
        if (at > level + 1 && pool.id !== 'first_residents') continue;
        card.append(el('h3', '', title), el('p', '', `Unlock at Home Level ${at}. Keep finishing tasks to earn Home Hearts.`));
        this.page.append(card);
        continue;
      }
      const wrap = el('div', 'parcel-wrap');
      wrap.append(this.parcelArt(pool.id === 'first_residents' ? 'parcel_closed' : `parcel_${pool.id}_closed`));
      const info = el('div');
      info.append(el('h3', '', pool.name));
      for (const kind of ['friend', 'furniture'] as ParcelKind[]) {
        const price = parcelCost(pool, kind);
        const odds = parcelOdds(s, this.content, pool.id, kind);
        if (!odds.length) continue;
        const row = el('div', 'spot-row');
        const body = el('div', 'grow');
        body.append(el('b', '', kind === 'friend' ? 'Friend Parcel' : 'Furniture Parcel'));
        const hasNew = kind === 'furniture' || friendParcelHasNew(s, this.content, pool.id);
        let note: string;
        if (kind === 'furniture') note = 'Always a piece of furniture.';
        else if (!hasNew && seriesProgress(s, this.content, pool.series).complete) note = 'You have every friend in this series.';
        else if (!hasNew) note = 'You have every friend this parcel can bring right now. New friends appear in it as your Home Level rises.';
        else if (parcelGuaranteed(s, this.content, pool.id)) note = `Your first one is guaranteed: ${this.content.residents[odds[0]!.id]?.name}.`;
        else note = 'Always a friend. A friend you already have turns into Mending Thread.';
        body.append(el('p', '', note));
        const cost = el('div', 'rewards');
        const chip = el('span', canAfford(s, price) ? 'muted' : 'no');
        const payWith = (Object.keys(price) as Currency[])[0] ?? 'wishStamps';
        chip.append(document.createTextNode('Costs '), ...costChips(price, ''), document.createTextNode(` · You have ${s.wallet[payWith]}`));
        cost.append(chip);
        body.append(cost);
        const key = `${pool.id}:${kind}`;
        const acts = el('div', 'actions');
        acts.style.flexDirection = 'column';
        acts.append(
          button('Open', 'btn primary', () => this.openParcel(pool.id, kind), !poolCanOpen(s, this.content, pool, kind)),
          button(this.oddsOpen === key ? 'Hide odds' : 'Odds', 'btn', () => { this.oddsOpen = this.oddsOpen === key ? '' : key; this.render(); }),
        );
        row.append(body, acts);
        info.append(row);
        if (this.oddsOpen === key) {
          const table = el('table', 'odds');
          for (const o of odds) {
            const tr = el('tr');
            const name = o.kind === 'resident' ? `${this.content.residents[o.id]?.name} (${this.content.residents[o.id]?.rarity})${o.id in s.residents ? ' · have' : ''}` : `${this.content.furniture[o.id]?.name}`;
            tr.append(el('td', '', name), el('td', '', `${(o.chance * 100).toFixed(1)}%`));
            table.append(tr);
          }
          info.append(table);
        }
      }
      const recent = s.parcelLog.filter((r) => r.poolId === pool.id).slice(-5).reverse();
      if (recent.length) {
        info.append(el('p', 'log', `Recent: ${recent.map((r) => this.outcomeName(r.kind, r.id) + (r.duplicate ? ' (duplicate)' : '')).join(', ')}`));
      }
      wrap.append(info);
      card.append(wrap);
      this.page.append(card);
    }
    // Mending Thread from duplicate friends buys Wish Stamps.
    const need = this.content.rules.threadPerStamp;
    if (need > 0 && (s.wallet.mendingThread > 0 || s.parcelLog.some((r) => r.duplicate))) {
      const card = el('div', 'card');
      card.append(el('h3', '', 'Mending Thread'));
      const row = el('div', 'spot-row');
      const body = el('div', 'grow');
      body.append(el('p', '', 'Thread from duplicate friends can be stitched into a new Wish Stamp.'));
      const rewards = el('div', 'rewards');
      const have = el('span', s.wallet.mendingThread >= need ? 'muted' : 'no');
      have.append(...costChips({ mendingThread: need }, ''), document.createTextNode(` · You have ${s.wallet.mendingThread}`));
      rewards.append(have, el('span', 'muted', '→'), ...costChips({ wishStamps: 1 }));
      body.append(rewards);
      row.append(body, button('Trade', 'btn primary', () => this.run({ type: 'trade_thread' }), s.wallet.mendingThread < need));
      card.append(row);
      this.page.append(card);
    }
  }

  /** A pool's own parcel picture (parcel_<pool>_closed / _open), or the standard parcel until it has one. */
  private parcelArt(key: string): HTMLElement {
    const box = el('div', 'parcel-art');
    const url = artUrl(key) ?? artUrl(key.endsWith('_open') ? 'parcel_open' : 'parcel_closed');
    if (url) {
      const img = el('img');
      img.src = url;
      img.alt = 'Mystery Parcel';
      box.append(img);
    } else {
      box.append(el('div', 'parcel-box'));
    }
    return box;
  }

  private outcomeName(kind: 'resident' | 'furniture', id: string): string {
    return kind === 'resident' ? this.content.residents[id]?.name ?? id : this.content.furniture[id]?.name ?? id;
  }

  private openParcel(poolId: string, kind: ParcelKind): void {
    if (this.revealing) return;
    const events = this.run({ type: 'open_parcel', poolId, kind });
    const opened = events?.find((e): e is Extract<GameEvent, { type: 'parcel_opened' }> => e.type === 'parcel_opened');
    if (!opened) return;
    this.revealing = true;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const r = this.reveal;
    r.replaceChildren();
    r.hidden = false;
    const shaking = el('div', 'reveal-parcel');
    const own = poolId === 'first_residents' ? null : `parcel_${poolId}_`;
    const url = (own && artUrl(own + 'closed')) ?? artUrl('parcel_closed');
    if (url) {
      const img = el('img');
      img.src = url;
      img.alt = '';
      shaking.append(img);
    } else shaking.append(el('div', 'parcel-box'));
    r.append(shaking);
    const openUrl = (own && artUrl(own + 'open')) ?? artUrl('parcel_open');
    if (openUrl && !reduced) {
      window.setTimeout(() => {
        shaking.replaceChildren();
        shaking.classList.add('opened');
        const img = el('img');
        img.src = openUrl;
        img.alt = '';
        shaking.append(img);
      }, 950);
      window.setTimeout(() => this.showResult(opened), 1550);
    } else {
      window.setTimeout(() => this.showResult(opened), reduced ? 50 : 950);
    }
  }

  private showResult(e: Extract<GameEvent, { type: 'parcel_opened' }>): void {
    const r = this.reveal;
    r.replaceChildren();
    const card = el('div', 'reveal-card');
    const { record } = e;
    let art: HTMLElement;
    let title = this.outcomeName(record.kind, record.id);
    const lines: string[] = [];
    let def: ResidentDef | undefined;
    if (record.kind === 'resident') {
      def = this.content.residents[record.id];
      const img = el('img');
      img.src = def ? portraitUrl(def) : '';
      img.alt = '';
      art = img;
      if (record.duplicate) lines.push(`You already have ${title}.`, `+${e.threadGranted} Mending Thread`);
      else lines.push('New resident!', `${title} moved into your ${this.content.rooms[this.getState().residents[record.id]?.room ?? '']?.name ?? 'home'}.`);
      if (record.guaranteed) lines.push('Your guaranteed first parcel.');
    } else {
      const furl = artUrl(`furn_${record.id}`);
      if (furl) {
        const img = el('img');
        img.src = furl;
        img.alt = '';
        art = img;
      } else art = el('div', 'furn-thumb', title);
      lines.push('New furniture! It is in your Build storage.');
      title = `${title}`;
    }
    const info = el('div');
    const head = el('div', 'row');
    head.append(el('h2', '', title));
    if (def) head.append(el('span', `rar ${def.rarity}`, def.rarity));
    info.append(head);
    for (const l of lines) info.append(el('p', '', l));
    const actions = el('div', 'actions');
    actions.append(button('Nice!', 'btn primary', () => this.closeReveal()));
    if (def && !record.duplicate) actions.append(button('See page', 'btn', () => { this.closeReveal(); this.openCharacter(record.id); }));
    info.append(actions);
    card.append(art, info);
    r.append(card);
  }

  private closeReveal(): void {
    this.revealing = false;
    this.reveal.hidden = true;
    this.reveal.replaceChildren();
    this.render();
  }
}

function errorText(error: string): string {
  switch (error) {
    case 'cannot_afford':
      return "You don't have enough for that yet";
    case 'locked':
      return 'Not unlocked yet';
    case 'cooldown':
      return 'They need a little rest first';
    case 'not_ready':
      return 'Not ready yet';
    case 'already_done':
      return 'Already done';
    case 'daily_limit':
      return 'That’s all for today. Come back tomorrow!';
    case 'room_full':
      return 'That room is full (4 residents)';
    case 'busy':
      return 'Someone is already exploring';
    case 'away':
      return "They're away exploring";
    default:
      return reasonText(error);
  }
}

function clock(ms: number): string {
  const total = Math.max(1, Math.ceil(ms / 1000));
  if (total >= 3600) {
    const mins = Math.ceil(total / 60);
    const rest = mins % 60;
    return rest ? `${Math.floor(mins / 60)} h ${rest} min` : `${Math.floor(mins / 60)} h`;
  }
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

/** The room a task is about, so "Go" can take the player straight there. */
function taskRoom(def: TaskDef): string | undefined {
  const c = def.condition;
  if (c.kind === 'placed' || c.kind === 'room_items') return c.roomId;
  if (c.kind === 'purchased') return c.key.split(':')[0];
  return undefined;
}

/** Small square scene art for Explore rows, once ChatGPT delivers it. */
function cardArt(key: string): HTMLElement | null {
  const url = artUrl(key);
  if (!url) return null;
  const img = el('img', 'card-thumb');
  img.src = url;
  img.alt = '';
  return img;
}

function hasCostumeArt(id: string, costumeId: string): boolean {
  return !!artUrl(`char_${id}_costume_${costumeArtName(id, costumeId)}_idle`);
}
