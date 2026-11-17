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
  gardenDue,
  nextPotCost,
  parseSeedKey,
  plantStatus,
  succulentName,
  succulentSellPrice,
  undiscovered,
  unseenPatterns,
  researchLevel,
  dailyGiftReady,
  researchSpeed,
  nextStudyLevel,
  nextGardenGoal,
  succulentGrowth,
  readySummary,
  happyGiftAmount,
  happyStatus,
  happyFriends as happyFriendsOf,
  friendSkills,
  seriesMilestones,
  onTrip,
  tripSlots,
  nextTripSlotAt,
  type FriendSkill,
  type ReadyItem,
  type Content,
  type Currency,
  type GameEvent,
  type GameState,
  type Placement,
  type ParcelKind,
  type ResidentDef,
  type TaskDef,
} from '@nooklings/core';
import { Arcade } from '../arcade/arcade';
import { artUrl } from '../assets';
import { succulentArtUrl, succulentImage } from '../garden/succulentArt';
import { reasonText, type PendingEdit, type RoomScene, type Selection } from '../game/RoomScene';
import { portraitUrl } from '../portraits';
import { bondHearts, button, cardArt, clock, costChips, CURRENCY, el, icon, iconButton, seconds, tagChips, uiIcon } from './dom';
import { prefs, setPrefs } from './prefs';
import { ShopView } from './shop';
import type { CommandInput } from '../store';

type Tab = 'home' | 'nookbook' | 'explore' | 'tasks' | 'shop' | 'research';
const RAIL_TABS: Tab[] = ['home', 'nookbook', 'explore', 'tasks', 'shop'];

/** How each friend skill is shown. Icons reuse existing art. */
const SKILL: Record<FriendSkill, { name: string; does: (pct: number) => string; icon: string; glyph: string }> = {
  gathering: { name: 'Gathering', does: (p) => `gathering spots refill ${p}% sooner`, icon: 'icon_wood', glyph: '▤' },
  trips: { name: 'Trips', does: (p) => `trips are ${p}% shorter`, icon: 'icon_keepsake', glyph: '❖' },
  baking: { name: 'Baking', does: (p) => `Treats bake ${p}% sooner`, icon: 'icon_treats', glyph: '🍪' },
  study: { name: 'Study', does: (p) => `studies finish ${p}% sooner`, icon: 'icon_research', glyph: '✎' },
};

/**
 * Where each pot stands on the garden map (fractions of the picture): x is the pot's centre, y where its base sits,
 * w its width. The first three are the stepping stones in front; bought pots go on the potting bench behind.
 */
const GARDEN_SPOTS: Array<{ x: number; y: number; w: number; back?: boolean }> = [
  { x: 0.254, y: 0.775, w: 0.15 },
  { x: 0.5, y: 0.775, w: 0.15 },
  { x: 0.749, y: 0.775, w: 0.15 },
  { x: 0.303, y: 0.445, w: 0.115, back: true },
  { x: 0.506, y: 0.445, w: 0.115, back: true },
  { x: 0.713, y: 0.445, w: 0.115, back: true },
];
type Filter = 'all' | 'owned' | 'missing';
type ExploreView = 'arcade' | 'outdoors' | 'garden' | 'kitchen' | 'parcels';
type TasksView = 'tasks' | 'invitations';

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
  /** Pot whose flower's pollen is on the brush, while choosing where to brush it. */
  private pollenFrom: number | null = null;
  /** Pot whose grown plant is being given to a resident, while choosing who. */
  private giftFrom: number | null = null;
  /** Pot shown in the garden map's side panel. */
  private gardenPot: number | null = null;
  private tending = false;
  private gardenTab: 'plants' | 'bag' | 'goals' = 'plants';
  private gardenView: 'map' | 'book' = 'map';
  /** A dropdown on the page is being used: hold off redrawing until it is done (a redraw would close it). */
  private pickingUntil = 0;
  private renderWaiting = false;
  private readonly arcade: Arcade;
  /** Where to return after Hide and Seek. */
  private beforeHide: { tab: Tab; roomId: string } | null = null;
  private readonly panel = document.getElementById('panel')!;
  private page = document.getElementById('page')!;
  private readonly reveal = document.getElementById('reveal')!;
  private readonly buildBtn = document.getElementById('build-btn') as HTMLButtonElement;
  private readonly researchBtn = document.getElementById('research-btn') as HTMLButtonElement;
  private readonly homeActions = document.getElementById('home-actions')!;
  private readonly materials = document.getElementById('materials')!;
  private readonly shop: ShopView;
  /** Where every placed item was after the last change, so the last Build change can be undone. */
  private placementsBefore = new Map<string, { roomId: string; p: Placement }>();
  /** Commands that put the last Build change back, newest first. */
  private undo: CommandInput[] = [];
  private undoAt = 0;
  private undoing = false;
  private readonly readyBox = document.getElementById('ready')!;
  private readyKey = '';

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
    this.researchBtn.addEventListener('click', () => this.setTab(this.tab === 'research' ? 'home' : 'research'));
    document.getElementById('fs-btn')!.addEventListener('click', () => void this.toggleFullscreen());
    // The money in the top bar opens every material the home has.
    const resources = document.getElementById('resources')!;
    resources.addEventListener('click', () => this.toggleMaterials());
    resources.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleMaterials();
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!this.materials.hidden && !this.materials.contains(e.target as Node) && !resources.contains(e.target as Node)) this.materials.hidden = true;
    }, true);
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
    this.shop = new ShopView({
      content,
      getState,
      run: (cmd) => this.run(cmd),
      render: () => this.render(),
      toast: (t, ms) => this.toast(t, ms),
      placeNow: (defId) => this.placeNow(defId),
      openGarden: () => {
        this.exploreView = 'garden';
        this.setTab('explore');
      },
      scrollTop: () => { this.page.scrollTop = 0; },
      confirmSpend: (cost, what, then) => this.confirmSpend(cost as Partial<Record<Currency, number>>, what, then),
    });
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
    document.body.classList.toggle('reduce-motion', !!prefs().reducedMotion);
    this.applyInterfaceArt();
    this.renderRoomTabs();
    this.watchPickers();
    window.setInterval(() => this.tick(), 1000);
    window.setTimeout(() => this.claimDailyGift(), 1500);
    this.renderTop();
    this.renderBadges();
    this.snapshotPlacements();
    // Come back to where the player was.
    const saved = prefs();
    if (saved.exploreView && ['arcade', 'outdoors', 'garden', 'kitchen', 'parcels'].includes(saved.exploreView)) this.exploreView = saved.exploreView as ExploreView;
    if (saved.tab && saved.tab !== 'home' && RAIL_TABS.includes(saved.tab as Tab)) this.setTab(saved.tab as Tab);
    else this.setTab('home');
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
    for (const span of document.querySelectorAll<HTMLElement>('.ha-ico')) {
      const url = artUrl(`icon_${span.dataset.icon}`);
      if (!url) continue;
      span.textContent = '';
      const img = el('img', 'ha-img');
      img.src = url;
      img.alt = '';
      span.append(img);
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
    if (RAIL_TABS.includes(tab)) setPrefs({ tab });
    this.materials.hidden = true;
    // Research opens from the Home screen, so Home stays highlighted on the rail.
    document.querySelectorAll<HTMLButtonElement>('#rail .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === (tab === 'research' ? 'home' : tab)));
    this.researchBtn.hidden = !this.content.research;
    this.homeActions.hidden = tab !== 'home';
    if (tab !== 'home') {
      if (this.build) this.setBuild(false);
      this.selection = { kind: 'none' };
    }
    if (tab !== 'nookbook') this.detailId = null;
    this.page.scrollTop = 0;
    this.buildBtn.disabled = !isRoomOpen(this.getState(), this.content, this.roomId);
    this.render();
  }

  setBuild(on: boolean): void {
    this.build = on;
    this.buildBtn.classList.toggle('on', on);
    const label = this.buildBtn.querySelector('.ha-lbl');
    if (label) label.textContent = on ? 'Done' : 'Build';
    if (!on) this.undo = [];
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
      // Every room shows, so players can see what is coming; locked ones say what they need when tapped.
      const unlockLevel = room.access ? this.content.levels.find((l) => l.unlocks.includes(room.access!.unlock))?.level ?? 99 : 1;
      const b = el('button', `${id === this.roomId ? 'on' : ''}${open ? '' : ' locked'}`);
      if (!open) b.append(uiIcon('icon_lock', '🔒', 'room-lock'));
      b.append(document.createTextNode(room.name));
      if (!open) b.title = level < unlockLevel ? `Opens at Home Level ${unlockLevel}` : 'Ready to open';
      if (!open && level >= unlockLevel && canAfford(s, room.access!.cost)) b.append(el('span', 'dot'));
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

  /** Friends who were Happy after the last change, so a friend who just became Happy gets a word. */
  private happyBefore: Set<string> | null = null;

  private noticeHappy(events: GameEvent[]): void {
    const now = new Set(happyFriendsOf(this.getState(), this.content));
    const before = this.happyBefore;
    this.happyBefore = now;
    if (!before || !events.length) return;
    const fresh = [...now].filter((id) => !before.has(id) && !events.some((e) => e.type === 'resident_joined' && e.residentId === id) && !events.some((e) => e.type === 'expedition_done' && e.residentId === id));
    if (fresh.length) this.toast(`${fresh.map((id) => this.content.residents[id]?.name ?? id).join(' and ')} ${fresh.length > 1 ? 'are' : 'is'} Happy here!`, 2600);
  }

  onStateChanged(events: GameEvent[]): void {
    for (const e of events) this.announce(e);
    this.noticeHappy(events);
    this.recordUndo(events);
    // Something changed by itself (the daily gift, a cloud save) while a dropdown is open: redraw once it closes.
    if (this.picking()) {
      this.renderWaiting = true;
      this.renderBadges();
      return;
    }
    this.render();
  }

  private picking(): boolean {
    const active = document.activeElement;
    return Date.now() < this.pickingUntil || (active instanceof HTMLSelectElement && this.page.contains(active));
  }

  /** Watch the page's dropdowns from the first touch, before the browser has even opened them. */
  private watchPickers(): void {
    const isSelect = (t: EventTarget | null) => t instanceof HTMLSelectElement;
    const start = (e: Event) => {
      if (isSelect(e.target)) this.pickingUntil = Date.now() + 20_000;
    };
    const finish = (e: Event) => {
      if (!isSelect(e.target)) return;
      this.pickingUntil = 0;
      // Let the change go through first, then catch up on anything that was held back.
      window.setTimeout(() => {
        if (this.renderWaiting && !this.picking()) {
          this.renderWaiting = false;
          this.render();
        }
      }, 0);
    };
    this.page.addEventListener('pointerdown', start, true);
    this.page.addEventListener('touchstart', start, { capture: true, passive: true });
    this.page.addEventListener('focusin', start, true);
    this.page.addEventListener('change', finish, true);
    this.page.addEventListener('focusout', finish, true);
  }

  toast(text: string, ms = 1900): void {
    const t = document.getElementById('toast')!;
    t.textContent = text;
    t.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- Ready list (Home) ----------

  private static readonly READY: Record<ReadyItem['kind'], { icon: string; glyph: string; label: (n: number) => string; act: string; collect?: boolean }> = {
    happy: { icon: 'icon_mood', glyph: '☺', label: (n) => `${n} happy friend${n > 1 ? 's' : ''} left you gifts`, act: 'Collect', collect: true },
    gather: { icon: 'icon_wood', glyph: '▤', label: (n) => `${n} gathering spot${n > 1 ? 's' : ''} ready`, act: 'Gather all', collect: true },
    trip: { icon: 'icon_keepsake', glyph: '❖', label: (n) => (n > 1 ? `${n} friends back from trips` : 'Back from a trip'), act: 'Welcome', collect: true },
    garden: { icon: 'garden_pot', glyph: '✿', label: (n) => `${n} plant${n > 1 ? 's' : ''} ready`, act: 'Garden' },
    garden_goal: { icon: 'icon_home_heart', glyph: '♥', label: () => 'Garden goal done', act: 'Claim', collect: true },
    research: { icon: 'icon_research', glyph: '✎', label: () => 'Study finished', act: 'Learn', collect: true },
    baking: { icon: 'icon_treats', glyph: '🍪', label: () => 'Treats are baked', act: 'Collect', collect: true },
    tasks: { icon: 'icon_tab_tasks', glyph: '✓', label: (n) => `${n} task reward${n > 1 ? 's' : ''}`, act: 'Claim', collect: true },
    invitations: { icon: 'icon_tab_nookbook', glyph: '✉', label: (n) => `${n} friend${n > 1 ? 's' : ''} can be invited`, act: 'Invite' },
    series: { icon: 'icon_tab_nookbook', glyph: '★', label: (n) => `${n} series reward${n > 1 ? 's' : ''}`, act: 'Collect', collect: true },
    parcels: { icon: 'icon_wish_stamp', glyph: '✉', label: () => 'A Friend Parcel to open', act: 'Open' },
  };

  /** What is waiting right now, over the room on the Home screen. Folds down to a small button. */
  private renderReady(): void {
    const box = this.readyBox;
    const items = this.tab === 'home' && !this.build && !this.revealing && this.selection.kind === 'none' && isRoomOpen(this.getState(), this.content, this.roomId) ? readySummary(this.getState(), this.content, Date.now()) : [];
    const open = prefs().readyOpen ?? true;
    const key = `${open}|${items.map((i) => `${i.kind}:${i.count}`).join(',')}`;
    if (key === this.readyKey) return;
    this.readyKey = key;
    box.replaceChildren();
    box.hidden = items.length === 0;
    if (!items.length) return;
    const total = items.reduce((a, i) => a + i.count, 0);
    box.classList.toggle('folded', !open);
    const head = el('button', 'ready-h');
    head.setAttribute('aria-expanded', String(open));
    head.append(el('b', '', 'Ready'), el('span', 'ready-n', String(total)), el('span', 'ready-caret', open ? '▾' : '▸'));
    head.addEventListener('click', () => {
      setPrefs({ readyOpen: !open });
      this.renderReady();
    });
    const bar = el('div', 'ready-bar');
    bar.append(head);
    const collectable = items.filter((i) => GameUI.READY[i.kind].collect);
    if (open && collectable.length > 1) bar.append(button('Collect all', 'btn small primary', () => { for (const i of collectable) this.actReady(i.kind, true); }));
    box.append(bar);
    if (!open) return;
    const list = el('div', 'ready-list');
    for (const item of items) {
      const meta = GameUI.READY[item.kind];
      const row = el('div', 'ready-row');
      const url = artUrl(meta.icon);
      if (url) {
        const img = el('img', 'ready-ico');
        img.src = url;
        img.alt = '';
        row.append(img);
      } else row.append(el('span', 'ready-ico glyph', meta.glyph));
      const label = el('span', 'grow', meta.label(item.count));
      if (item.kind === 'happy') label.append(' ', ...costChips(happyGiftAmount(this.getState(), this.content)));
      row.append(label);
      row.append(button(meta.act, 'btn small primary', () => this.actReady(item.kind)));
      list.append(row);
    }
    box.append(list);
  }

  private actReady(kind: ReadyItem['kind'], quiet = false): void {
    const s = this.getState();
    const now = Date.now();
    const go = (view: ExploreView) => { this.exploreView = view; this.setTab('explore'); };
    switch (kind) {
      case 'gather': {
        const spots = Object.keys(this.content.gatherSpots).filter((id) => spotUnlocked(s, this.content, id) && gatherReadyIn(s, this.content, id, now) === 0);
        const got: Partial<Record<Currency, number>> = {};
        for (const id of spots) {
          const res = this.dispatch({ type: 'gather', spotId: id, at: Date.now() });
          if (res.ok) for (const e of res.events) if (e.type === 'gathered') for (const [k, v] of Object.entries(e.yield)) got[k as Currency] = (got[k as Currency] ?? 0) + (v ?? 0);
        }
        const text = Object.entries(got).map(([k, v]) => `${v} ${CURRENCY[k as Currency].name}`).join(', ');
        if (text) this.toast(`Gathered ${text}`);
        break;
      }
      case 'happy': this.run({ type: 'collect_happy_gifts', at: now }); break;
      case 'trip': this.run({ type: 'collect_expedition', at: now }); break;
      case 'garden': go('garden'); break;
      case 'garden_goal': { const g = nextGardenGoal(s, this.content); if (g?.done) this.run({ type: 'claim_garden_goal', goalId: g.def.id }); break; }
      case 'research': this.run({ type: 'finish_research', at: now }); break;
      case 'baking': this.run({ type: 'collect_baking', at: now }); break;
      case 'tasks':
        for (const t of taskStates(this.getState(), this.content).filter((x) => x.status === 'claimable')) this.dispatch({ type: 'claim_task', taskId: t.def.id });
        if (!quiet) this.toast('Rewards collected');
        break;
      case 'invitations': this.tasksView = 'invitations'; this.setTab('tasks'); break;
      case 'series':
        for (const x of this.content.series) {
          for (const m of seriesMilestones(this.getState(), this.content, x.id)) if (m.claimable) this.run({ type: 'claim_series_milestone', seriesId: x.id, count: m.count });
          if (x.reward && seriesProgress(this.getState(), this.content, x.id).complete && !this.getState().seriesClaimed.includes(x.id)) this.run({ type: 'claim_series', seriesId: x.id });
        }
        break;
      case 'parcels': go('parcels'); break;
    }
    this.readyKey = '';
    this.render();
  }

  // ---------- confirmations and reward pop-ups ----------

  /** Wish Stamps and Keepsakes are scarce: ask once before spending them. Anything else goes straight through. */
  confirmSpend(cost: Partial<Record<Currency, number>>, what: string, then: () => void): void {
    const scarce = (['wishStamps', 'keepsakes'] as Currency[]).filter((c) => (cost[c] ?? 0) > 0);
    if (!scarce.length) return then();
    const box = el('div', 'confirm');
    const card = el('div', 'confirm-card');
    card.append(el('h3', '', what));
    const price = el('div', 'rewards');
    price.append(...costChips(cost));
    card.append(el('p', '', `This uses ${scarce.map((c) => CURRENCY[c].name).join(' and ')}, which are hard to come by.`), price);
    const acts = el('div', 'actions');
    const close = () => box.remove();
    acts.append(button('Not now', 'btn', close), button('Yes, go ahead', 'btn primary', () => { close(); then(); }));
    card.append(acts);
    box.append(card);
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.getElementById('stage-wrap')!.append(box);
  }

  private lastWallet: Partial<Record<Currency, number>> | null = null;

  /** A little "+40" rises from the top bar when Buttons, Wish Stamps or Ribbons go up. */
  private floatGains(): void {
    const w = this.getState().wallet;
    const before = this.lastWallet;
    this.lastWallet = { ...w };
    if (!before || prefs().reducedMotion) return;
    const spots: Array<[Currency, string]> = [['buttons', 'res-buttons'], ['wishStamps', 'res-stamps'], ['ribbons', 'res-ribbons']];
    for (const [c, id] of spots) {
      const gain = (w[c] ?? 0) - (before[c] ?? 0);
      if (gain <= 0) continue;
      const anchorEl = document.getElementById(id);
      if (!anchorEl) continue;
      const r = anchorEl.getBoundingClientRect();
      const pop = el('span', 'gain-pop', `+${gain}`);
      pop.style.left = `${r.left + r.width / 2}px`;
      pop.style.top = `${r.bottom}px`;
      document.body.append(pop);
      window.setTimeout(() => pop.remove(), 1200);
    }
  }

  // ---------- materials ----------

  /** Every material the home has, opened from the money in the top bar. */
  private toggleMaterials(): void {
    const box = this.materials;
    if (!box.hidden) {
      box.hidden = true;
      return;
    }
    const s = this.getState();
    box.replaceChildren();
    box.append(el('h3', '', 'Your materials'));
    const list = el('div', 'mat-list');
    const order: Currency[] = ['buttons', 'wishStamps', 'ribbons', 'wood', 'fabric', 'keepsakes', 'mendingThread', 'treats'];
    for (const c of order) {
      if (!(c in s.wallet)) continue;
      // Treats only matter once baking exists.
      if (c === 'treats' && !this.content.baking) continue;
      const row = el('div', 'mat');
      row.append(icon(c), el('span', 'grow', CURRENCY[c].name), el('b', '', String(s.wallet[c] ?? 0)));
      list.append(row);
    }
    box.append(list);
    const links = el('div', 'mat-links');
    links.append(
      button('Get Wood & Fabric', 'btn small', () => { this.exploreView = 'outdoors'; this.setTab('explore'); }),
      button('Ribbons → Costumes', 'btn small', () => { this.shop.open('costumes'); this.setTab('shop'); }),
    );
    box.append(links);
    box.hidden = false;
  }

  // ---------- Build undo ----------

  private snapshotPlacements(): void {
    const map = new Map<string, { roomId: string; p: Placement }>();
    for (const [roomId, room] of Object.entries(this.getState().rooms)) for (const p of room.placements) map.set(p.uid, { roomId, p });
    this.placementsBefore = map;
  }

  /** Remember how to put back the furniture change these events made (moves, flips, placing and storing). */
  private recordUndo(events: GameEvent[]): void {
    const before = this.placementsBefore;
    const steps: CommandInput[] = [];
    for (const e of events) {
      if (e.type === 'moved') {
        const was = before.get(e.placement.uid);
        if (was) steps.unshift({ type: 'move', roomId: e.roomId, uid: e.placement.uid, col: was.p.col, row: was.p.row });
      } else if (e.type === 'flipped') {
        steps.unshift({ type: 'flip', roomId: e.roomId, uid: e.placement.uid });
      } else if (e.type === 'placed') {
        steps.unshift({ type: 'store', roomId: e.roomId, uid: e.placement.uid });
      } else if (e.type === 'stored') {
        const was = before.get(e.uid);
        if (was) steps.unshift({ type: 'place', roomId: e.roomId, defId: was.p.defId, col: was.p.col, row: was.p.row, flipped: was.p.flipped });
      }
    }
    this.snapshotPlacements();
    if (!steps.length || this.undoing || !this.build) return;
    // A move and a flip confirmed together arrive a moment apart: undo them as one.
    const now = Date.now();
    this.undo = now - this.undoAt < 400 ? [...steps, ...this.undo] : steps;
    this.undoAt = now;
  }

  private runUndo(): void {
    const steps = this.undo;
    this.undo = [];
    this.undoing = true;
    let ok = true;
    for (const cmd of steps) if (!this.dispatch(cmd).ok) ok = false;
    this.undoing = false;
    this.snapshotPlacements();
    this.toast(ok ? 'Undone' : 'Could not put everything back: something is in the way');
    this.render();
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
        this.toast(`Bought ${this.content.furniture[e.furnitureId]?.name ?? 'it'}! It's in your storage: tap Place to put it in a room.`, 2600);
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
      case 'seed_bought':
        this.toast(`A ${this.content.garden?.species[e.speciesId]?.name ?? ''} seed went into your seed bag. Plant it in the Garden.`, 2600);
        break;
      case 'succulent_planted':
        this.toast(`Planted ${this.content.garden?.species[e.speciesId]?.name ?? 'a seed'}`);
        break;
      case 'succulent_sold': {
        const name = this.content.garden?.species[e.speciesId]?.name ?? 'Succulent';
        this.toast(`Sold ${name} for ${e.reward.buttons ?? 0} Buttons`, 2000);
        break;
      }
      case 'seed_planted':
        this.toast(`Planted a ${this.content.garden?.species[e.seed.split(':')[0] ?? '']?.name ?? ''} seed. What colour will it be?`, 2400);
        break;
      case 'pollinated':
        this.toast('Pollinated! A seed pod is forming.', 2200);
        break;
      case 'pod_collected':
        this.toast(`${e.seeds.length} seeds went into your seed bag`, 2400);
        break;
      case 'offset_taken':
        this.toast('A little offset went into your seed bag');
        break;
      case 'discovered': {
        const names = e.keys.map((k) => { const [sp, col] = k.split(':'); return succulentName(this.content, sp ?? '', col ?? ''); });
        const pats = e.patterns.map((p) => this.content.garden?.patterns[p]?.name ?? p);
        const parts = [names.length ? `New in your Succulent book: ${names.join(', ')}` : '', pats.length ? `New leaf pattern: ${pats.join(', ')}!` : ''].filter(Boolean);
        this.toast(parts.join(' · '), 3200);
        break;
      }
      case 'garden_tool_bought':
        this.toast(`Bought the ${this.content.garden?.tools[e.toolId]?.name ?? 'tool'}!`, 2200);
        break;
      case 'succulent_given':
        this.toast(e.bondUp ? `${this.content.residents[e.residentId]?.name} loved the ${e.name} and reached Bond ${e.newBondLevel}!` : `${this.content.residents[e.residentId]?.name} loved the ${e.name}`, 2600);
        break;
      case 'daily_gift':
        this.toast(`Daily gift: +${e.buttons} Buttons${e.hearts ? ` and ${e.hearts} Hearts` : ''}. See you tomorrow!`, 3000);
        break;
      case 'research_started':
        this.toast(`Started studying ${this.content.research?.studies[e.studyId]?.name ?? ''}`, 2000);
        break;
      case 'research_finished':
        this.toast(`${this.content.research?.studies[e.studyId]?.name ?? 'Research'} reached Level ${e.level}!`, 2400);
        break;
      case 'succulent_displayed':
        this.toast(`${this.content.furniture[e.furnitureId]?.name ?? 'Your succulent'} is in storage. Place it from Build!`, 2800);
        break;
      case 'garden_goal_claimed':
        this.toast('Garden goal complete!', 2000);
        break;
      case 'pot_bought':
        this.toast(`A new pot! You have ${e.pots} now.`);
        break;
      case 'happy_gifts': {
        const names = e.residents.map((id) => this.content.residents[id]?.name ?? id);
        const who = names.length > 2 ? `${names.length} happy friends` : names.join(' and ');
        this.toast(`Gifts from ${who}: +${e.reward.buttons ?? 0} Buttons`, 2800);
        break;
      }
      case 'series_milestone': {
        const series = this.content.series.find((x) => x.id === e.seriesId)?.name ?? 'Series';
        const got = Object.entries(e.reward).map(([k, v]) => `${v} ${v === 1 ? CURRENCY[k as Currency].name.replace(/s$/, '') : CURRENCY[k as Currency].name}`).join(', ');
        this.toast(`${series}: ${e.count} friends home! +${got}`, 3000);
        break;
      }
      case 'resident_waiting':
        this.toast(`${this.content.residents[e.residentId]?.name} wants to come home, but every room is full. Open a room, then go on that trip again.`, 4200);
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

  /** The daily gift arrives by itself the first time the game is open on a new day. */
  private claimDailyGift(): void {
    if (this.revealing || this.arcade.isOpen) return;
    if (dailyGiftReady(this.getState(), this.content, Date.now())) this.run({ type: 'claim_daily_gift', at: Date.now() });
  }

  private tick(): void {
    this.claimDailyGift();
    const hasCountdown =
      (this.tab === 'home' && this.selection.kind === 'resident') ||
      (this.tab === 'nookbook' && this.detailId !== null) ||
      (this.tab === 'explore' && (this.exploreView === 'outdoors' || this.exploreView === 'kitchen' || this.exploreView === 'garden')) ||
      (this.tab === 'research' && !!this.getState().research.active);
    // Don't redraw under an open dropdown (Lives in, Companion, who goes exploring or bakes): it would close it.
    if (hasCountdown && !this.revealing && !this.arcade.isOpen && !this.picking()) this.render();
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
    if (this.tab === 'research') this.renderResearch();
    if (this.tab === 'shop') this.shop.render(this.page);
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
    document.getElementById('res-ribbons')!.textContent = String(s.wallet.ribbons);
    this.floatGains();
  }

  private renderBadges(): void {
    this.renderReady();
    const s = this.getState();
    const tasksDue =
      taskStates(s, this.content).some((t) => t.status === 'claimable') ||
      Object.keys(this.content.invitations).some((id) => invitationStatus(s, this.content, id)?.ready);
    const now = Date.now();
    const parcelDue = this.parcelsDue() || this.outdoorsDue(now) || (!!s.baking && s.baking.endAt <= now);
    const ready = readySummary(s, this.content, now);
    const bookDue =
      s.residentOrder.some((id) => !s.flags.includes(`viewed:${id}`) && id !== 'snug') ||
      ready.some((r) => r.kind === 'series');
    // Numbers for things waiting to be collected; a plain dot for something new to look at.
    const count = (kinds: ReadyItem['kind'][]) => ready.filter((r) => kinds.includes(r.kind)).reduce((a, r) => a + r.count, 0);
    const counts: Partial<Record<Tab, number>> = {
      explore: count(['gather', 'trip', 'garden', 'garden_goal', 'baking', 'parcels']),
      tasks: count(['tasks', 'invitations']),
      nookbook: count(['series']),
    };
    const set = (tab: Tab, on: boolean) => {
      const b = document.querySelector<HTMLElement>(`#rail .tab[data-tab="${tab}"] .badge`);
      if (!b) return;
      b.hidden = !on;
      const n = counts[tab] ?? 0;
      b.textContent = on && n > 0 ? String(Math.min(n, 9)) : '';
      b.classList.toggle('num', on && n > 0);
    };
    const active = s.research.active;
    const dot = this.researchBtn.querySelector('.pill-dot') as HTMLElement | null;
    if (dot) dot.hidden = !(active && active.endAt <= now);
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

    const tools = el('div', 'acts build-tools');
    tools.append(
      button('↶ Undo', 'act', () => this.runUndo(), this.undo.length === 0),
      button('Get more in the Shop', 'act', () => { this.shop.open('furniture'); this.setTab('shop'); }),
    );
    panel.append(tools);

    const inv = s.inventory;
    for (const group of GROUPS) {
      if ((group.layer === 'wall' || group.layer === 'ceiling') && room.walls === false) continue;
      const defs = Object.values(this.content.furniture).filter((d) => d.layer === group.layer && (inv[d.id] ?? 0) > 0);
      panel.append(el('h3', '', group.label));
      if (defs.length === 0) {
        panel.append(el('p', 'hint', 'Nothing in storage. Buy furniture in the Shop.'));
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
    names.append(el('h2', '', def.name), el('p', 'sub', `${def.mood} · ${status}`));
    mini.append(img, names);
    panel.append(mini);
    const bond = bondProgress(owned.bondXp, this.content);
    const line = el('p', 'hint');
    line.append(document.createTextNode('Bond '), bondHearts(bond.level));
    panel.append(line);
    const happy = this.happyLine(id);
    if (happy) panel.append(happy);
    else panel.append(el('p', 'hint', def.tagline));
    const acts = el('div', 'acts');
    acts.append(this.playButton(id, 'act primary'), button('Open page', 'act wide', () => this.openCharacter(id)));
    panel.append(acts);
  }

  /** "Happy" with today's gift, or what the room still needs, tag by tag. Null when friends rules are off. */
  private happyLine(id: string): HTMLElement | null {
    const s = this.getState();
    const st = happyStatus(s, this.content, id);
    const rules = this.content.friends;
    if (!st || !rules) return null;
    const line = el('span', `happy-line${st.happy ? ' is-happy' : ''}`);
    if (st.happy) {
      const yes = el('b', 'happy-yes');
      yes.append(uiIcon('icon_mood', '☺', 'happy-ico'), document.createTextNode('Happy'));
      line.append(yes);
      if (onTrip(s, id)) line.append(document.createTextNode('· away on a trip'));
      else line.append(document.createTextNode('· a gift a day'), ...costChips(rules.happyGift));
      return line;
    }
    line.append(document.createTextNode('Needs'));
    for (const t of st.tags.filter((x) => !x.ok)) line.append(el('span', 'tag want', `${t.tag} ${t.have}/${t.need}`));
    line.append(document.createTextNode('here'));
    line.title = `More ${st.tags.filter((x) => !x.ok).map((x) => x.tag).join(' and ')} decor in the ${this.content.rooms[st.room]?.name ?? 'room'} makes ${this.content.residents[id]?.name} Happy`;
    return line;
  }

  private playButton(id: string, cls: string): HTMLButtonElement {
    const wait = playReadyAt(this.getState(), this.content, id) - Date.now();
    const def = this.content.residents[id]!;
    if (onTrip(this.getState(), id)) return button(`${def.name} is exploring`, cls, () => undefined, true);
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
    // Settings that belong to this device, not the save.
    const set = el('div', 'card settings');
    const row = el('div', 'spot-row');
    const body = el('div', 'grow');
    body.append(el('b', '', 'Gentle motion'), el('p', '', 'Calmer animations: no bouncing, shaking or floating numbers.'));
    const on = !!prefs().reducedMotion;
    const t = button(on ? 'On' : 'Off', `btn${on ? ' primary' : ''}`, () => {
      setPrefs({ reducedMotion: !on });
      document.body.classList.toggle('reduce-motion', !on);
      this.render();
    });
    t.setAttribute('aria-pressed', String(on));
    row.append(body, t);
    set.append(el('h3', '', 'Settings'), row);
    this.page.append(set);
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


  /** A "place these items" task as a checklist: each item with what it needs next. */
  private taskChecklist(def: TaskDef, status: string): HTMLElement | null {
    const c = def.condition;
    if (c.kind !== 'placed' || (status !== 'active' && status !== 'claimable')) return null;
    const s = this.getState();
    const room = this.content.rooms[c.roomId];
    const placedHere = (fid: string) => (s.rooms[c.roomId]?.placements ?? []).some((p) => p.defId === fid);
    const done = c.furnitureIds.filter(placedHere).length;
    const card = el('div', `card task task-list ${status}`);
    const head = el('div', 'task-head');
    const titles = el('div', 'grow');
    titles.append(el('h3', '', def.title), el('p', '', def.description));
    const where = el('span', 'task-where');
    where.append(uiIcon('icon_pin', '📍'), document.createTextNode(` ${room?.name ?? ''} · ${done}/${c.furnitureIds.length} placed`));
    head.append(titles, where);
    card.append(head);
    for (const fid of c.furnitureIds) {
      const f = this.content.furniture[fid];
      const row = el('div', 'task-item');
      const pic = cardArt(`furn_${fid}`);
      if (pic) { pic.className = 'task-art'; row.append(pic); }
      const body = el('div', 'grow');
      body.append(el('b', '', f?.name ?? fid));
      const stored = s.inventory[fid] ?? 0;
      const here = placedHere(fid);
      body.append(el('span', `task-state ${here ? 'done' : stored ? 'owned' : 'needed'}`, here ? '✓ Placed' : stored ? '✓ Owned' : '◌ Needed'));
      row.append(body);
      if (here) row.append(el('span', 'muted', 'Done'));
      else if (stored) row.append(button('Place', 'btn primary', () => {
        this.showRoom(c.roomId);
        if (!isRoomOpen(this.getState(), this.content, c.roomId)) return;
        this.setBuild(true);
        this.getScene()?.beginPlace(fid);
      }));
      else {
        const recipe = Object.values(this.content.recipes).find((r) => r.furnitureId === fid);
        row.append(button('Get', 'btn', () => {
          if (recipe) { this.shop.open('furniture', { furnitureId: fid }); this.setTab('shop'); }
          else this.toast(`${f?.name ?? 'This'} isn't sold in the Shop: look for it in Furniture Parcels and Arcade prizes.`, 3200);
        }));
      }
      card.append(row);
    }
    const foot = el('div', 'task-foot');
    const rewards = el('div', 'rewards');
    rewards.append(el('b', '', 'Rewards:'), ...costChips(def.reward));
    foot.append(rewards);
    if (status === 'claimable') foot.append(button('Claim', 'btn primary', () => this.run({ type: 'claim_task', taskId: def.id })));
    card.append(foot);
    return card;
  }

  private taskCard(def: TaskDef, status: string): HTMLElement {
    const list = this.taskChecklist(def, status);
    if (list) return list;
    const card = el('div', `card task ${status}`);
    const row = el('div', 'row');
    const body = el('div', 'grow');
    // A task from a later chapter waits for its Home Level, not for another task.
    const waitsForLevel = status === 'locked' && levelFor(this.getState().hearts, this.content) < (def.fromLevel ?? 1);
    const h = el('h3', '', waitsForLevel ? 'A new chapter' : status === 'locked' ? 'Next task' : def.title);
    if (status === 'locked' && !waitsForLevel) h.prepend(uiIcon('icon_lock', '🔒'));
    body.append(h);
    body.append(el('p', '', waitsForLevel ? `Opens at Home Level ${def.fromLevel}. Play with your friends, upgrade their looks and craft new things to earn Home Hearts.` : status === 'locked' ? 'Finish the task above to reveal it.' : def.description));
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
        if ((x.reward && p.complete && !p.claimed) || seriesMilestones(s, this.content, x.id).some((m) => m.claimable)) b.append(el('span', 'dot'));
        tabs.append(b);
      }
      this.page.append(tabs);
    }
    if (allSeries.length <= 1) {
      // With several series the tabs already name each one and its count.
      const head = el('div', 'page-h');
      head.append(el('h2', '', `Series ${seriesNo} · ${seriesDef?.name ?? 'The First Residents'}`), el('span', 'grow'), el('span', 'muted', `${ownedCount}/${series.length}`));
      this.page.append(head);
    }
    const bar = el('div', 'progress');
    const fill = el('span');
    fill.style.width = `${(ownedCount / series.length) * 100}%`;
    bar.append(fill);
    this.page.append(bar);
    const steps = seriesMilestones(s, this.content, this.seriesTab);
    if (steps.length) {
      // Rewards on the way to finishing the series.
      const row = el('div', 'milestones');
      for (const m of steps) {
        const chip = el('div', `milestone${m.claimed ? ' done' : m.reached ? ' ready' : ''}`);
        chip.append(el('b', '', `${m.count} friends`));
        const rewards = el('span', 'rewards');
        rewards.append(...costChips(m.reward));
        chip.append(rewards);
        if (m.claimed) chip.append(el('span', 'ok', '✓'));
        else if (m.reached) chip.append(button('Collect', 'btn small primary', () => this.run({ type: 'claim_series_milestone', seriesId: this.seriesTab, count: m.count })));
        else chip.append(el('span', 'muted', `${ownedCount}/${m.count}`));
        row.append(chip);
      }
      this.page.append(row);
    }
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
      if (owned && happyStatus(s, this.content, r.id)?.happy) {
        const tag = uiIcon('icon_mood', '☺', 'happy-badge');
        tag.title = 'Happy';
        card.append(tag);
      }
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

  private aboutOpen = false;

  private renderDetail(id: string): void {
    const s = this.getState();
    const def = this.content.residents[id]!;
    const owned = s.residents[id];
    const wrap = el('div', 'profile');
    // Left: the portrait, with the story folded away under it.
    const left = el('div', 'profile-art card');
    left.append(button('‹ Back', 'btn small back-btn', () => { this.detailId = null; this.aboutOpen = false; this.render(); }));
    const img = el('img');
    img.src = portraitUrl(def, { silhouette: !owned, decorated: owned?.form === 'decorated', costume: owned?.costume });
    img.alt = owned ? def.name : 'Not yet found';
    left.append(img);
    if (owned) {
      const about = button(`About ${def.name} ${this.aboutOpen ? '▴' : '▾'}`, 'btn small about-btn', () => { this.aboutOpen = !this.aboutOpen; this.render(); });
      about.setAttribute('aria-expanded', String(this.aboutOpen));
      left.append(about);
    }
    const right = el('div', 'profile-info card');
    const title = el('div', 'profile-title');
    title.append(el('h2', '', owned ? def.name : '???'), el('span', `rar ${def.rarity}`, def.rarity));
    right.append(title);
    if (!owned) {
      right.append(el('p', 'tagline', 'Not found yet.'), el('p', 'story', def.hint));
      wrap.append(left, right);
      this.page.append(wrap);
      return;
    }
    if (this.aboutOpen) {
      right.append(el('p', 'tagline', def.tagline), el('p', 'story', def.story));
      wrap.append(left, right);
      this.page.append(wrap);
      return;
    }
    const cols = el('div', 'profile-cols');
    const facts = el('div', 'facts');
    const bond = bondProgress(owned.bondXp, this.content);
    const fact = (ico: [string, string], k: string, v: string | HTMLElement) => {
      const row = el('div', 'fact');
      row.append(uiIcon(ico[0], ico[1], 'fact-ico'), el('span', 'fact-k', k));
      const val = el('span', 'fact-v');
      val.append(v);
      row.append(val);
      facts.append(row);
    };
    fact(['icon_mood', '☺'], 'Mood', def.mood);
    fact(['icon_decor', '✿'], 'Favourite decor', def.favouriteTags.join(', '));
    const happy = this.happyLine(id);
    if (happy) fact(['icon_mood', '☺'], 'Happy', happy);
    if (def.skill && this.content.friends) {
      const meta = SKILL[def.skill];
      const cell = el('span', 'skill-v');
      cell.append(el('b', '', meta.name), document.createTextNode(` · ${meta.does(Math.round(this.content.friends.skillPerFriend * 100))} while Happy at home`));
      fact([meta.icon, meta.glyph], 'Skill', cell);
    }
    const bondCell = el('span');
    bondCell.append(bondHearts(bond.level), document.createTextNode(bond.span ? ` ${bond.into}/${bond.span} to next` : ' Max'));
    fact(['icon_home_heart', '♥'], 'Bond', bondCell);
    fact(['icon_form', '✦'], 'Form', owned.form === 'decorated' ? 'Decorated' : 'Original');
    fact(['icon_tab_home', '⌂'], 'Lives in', this.homePicker(id, owned.room));
    const pets = this.companionPicker(id);
    if (pets) fact(['icon_companion', '🐾'], 'Companion', pets);
    cols.append(facts);

    const acts = el('div', 'profile-acts');
    acts.append(this.playButton(id, 'btn primary big'));
    if (this.content.baking && levelFor(s.hearts, this.content) >= (this.content.levels.find((l) => l.unlocks.includes('baking'))?.level ?? 99)) {
      const away = onTrip(s, id);
      const given = treatGivenToday(s, this.content, id, Date.now());
      const afford = canAfford(s, this.content.baking.giftCost);
      acts.append(button(given ? 'Treat given today' : `Give a Treat (${s.wallet.treats})`, 'btn', () => this.run({ type: 'give_treat', residentId: id, at: Date.now() }), away || given || !afford));
    }
    const upgrade = this.content.formUpgrades.find((u) => u.form === 'decorated');
    if (upgrade && owned.form === 'original') {
      const bondOk = bond.level >= upgrade.requiresBond;
      const afford = canAfford(s, upgrade.cost);
      const box = el('div', 'upgrade-box');
      box.append(el('b', '', 'Upgrade to Decorated'));
      const req = el('div', 'req');
      req.append(el('span', bondOk ? 'ok' : 'no', `${bondOk ? '✓' : '✗'} Bond ${upgrade.requiresBond}`));
      for (const [k, v] of Object.entries(upgrade.cost) as Array<[Currency, number]>) {
        const have = s.wallet[k] ?? 0;
        const chip = el('span', have >= v ? 'ok' : 'no');
        chip.append(icon(k), document.createTextNode(` ${v} ${CURRENCY[k].name}${have < v ? ` (have ${have})` : ''}`));
        req.append(chip);
      }
      box.append(req, button('Upgrade', 'btn primary', () => this.run({ type: 'upgrade_form', residentId: id }), !(bondOk && afford)));
      acts.append(box);
    }
    if (visibleCostumes(this.content, id).length) {
      acts.append(iconButton('icon_costumes', '👚', 'Costumes ›', 'btn costumes-btn', () => { this.shop.open('costumes', { resident: id }); this.setTab('shop'); }));
    }
    cols.append(acts);
    right.append(cols);
    wrap.append(left, right);
    this.page.append(wrap);
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
    const head = el('div', 'section-h');
    head.append(el('h3', '', 'Gathering in the Yard'), el('span', 'grow'));
    const readySpots = Object.keys(this.content.gatherSpots).filter((id) => spotUnlocked(s, this.content, id) && gatherReadyIn(s, this.content, id, now) === 0);
    if (readySpots.length > 1) head.append(button('Gather all', 'btn small primary', () => this.actReady('gather')));
    card.append(head);
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
    const slots = tripSlots(s, this.content);
    const head = el('p', 'muted trip-slots');
    head.append(document.createTextNode(`Trips under way: ${s.expeditions.length} of ${slots}`));
    const nextAt = nextTripSlotAt(s, this.content);
    if (nextAt !== null) head.append(document.createTextNode(` · another trip at ${nextAt} friends`));
    const skill = friendSkills(s, this.content).trips;
    if (skill > 0) head.append(document.createTextNode(` · Happy friends make trips ${Math.round(skill * 100)}% shorter`));
    card.append(head);
    for (const trip of s.expeditions) {
      const route = this.content.expeditions[trip.routeId]!;
      const who = this.content.residents[trip.residentId]!.name;
      const left = trip.endAt - now;
      const row = el('div', 'trip-row');
      row.append(el('p', '', left > 0 ? `${who} is exploring ${route.name}.` : `${who} is back from ${route.name}!`));
      const bar = el('div', 'trip-bar');
      const fill = el('span');
      fill.style.width = `${Math.min(100, Math.max(0, ((now - trip.startAt) / (trip.endAt - trip.startAt)) * 100))}%`;
      bar.append(fill);
      row.append(bar);
      if (left > 0) row.append(el('p', 'timer', `Home in ${clock(left)}`));
      card.append(row);
    }
    if (s.expeditions.some((t) => t.endAt <= now)) card.append(button('Welcome home', 'btn primary', () => this.run({ type: 'collect_expedition', at: Date.now() })));
    if (s.expeditions.length >= slots) {
      this.page.append(card);
      return;
    }
    const owned = s.residentOrder.filter((id) => !onTrip(s, id));
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
      const tripMs = route.durationMs * researchSpeed(s, this.content).trips;
      body.append(el('b', '', `${route.name} · ${tripMs >= 3_600_000 ? `${Math.round(tripMs / 360_000) / 10} h` : `${Math.round(tripMs / 60_000)} min`}`), el('p', '', route.description));
      const rewards = el('div', 'rewards');
      rewards.append(...costChips(route.reward));
      if (route.firstTimeResident && !(route.firstTimeResident in s.residents)) rewards.append(el('span', 'reward', '✦ Someone special'));
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
      const bakeMs = def.durationMs * researchSpeed(s, this.content).baking;
      const hours = Math.round(bakeMs / 360_000) / 10;
      const y = bakeYield(this.content, def.id, baker);
      const favourite = !!baker && this.content.residents[baker]?.favouriteBake === def.id;
      body.append(el('b', '', `${def.name} · ${hours >= 1 ? `${hours} h` : `${Math.round(bakeMs / 60_000)} min`}`), el('p', '', def.description));
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

  // ---------- Research ----------

  private renderResearch(): void {
    const r = this.content.research;
    if (!r) return;
    const s = this.getState();
    const now = Date.now();
    const head = el('div', 'page-h');
    head.append(button('‹ Home', 'btn light', () => this.setTab('home')), el('h2', '', 'Research'));
    this.page.append(head);
    const intro = el('div', 'card research-active');
    if (!s.research.active) intro.append(el('p', 'muted', 'Study one thing at a time. Each level is yours for good and makes things in your home go faster.'));
    const a = s.research.active;
    if (a) {
      const def = r.studies[a.studyId]!;
      const row = el('div', 'spot-row');
      const pic = el('img', 'seed-thumb');
      pic.src = artUrl(def.icon) ?? '';
      pic.alt = '';
      const body = el('div', 'grow');
      body.append(el('b', '', `Studying ${def.name} · Level ${a.level}`));
      if (a.endAt > now) {
        body.append(el('p', 'muted', `${clock(a.endAt - now)} left`));
        const bar = el('div', 'trip-bar');
        const fill = el('span');
        fill.style.width = `${Math.round(Math.min(1, (now - a.startAt) / Math.max(1, a.endAt - a.startAt)) * 100)}%`;
        bar.append(fill);
        body.append(bar);
        row.append(pic, body);
      } else {
        body.append(el('p', '', 'Finished!'));
        row.append(pic, body, button('Learn it', 'btn primary', () => this.run({ type: 'finish_research', at: Date.now() })));
      }
      intro.append(row);
    }
    this.page.append(intro);

    const list = el('div', 'study-grid');
    for (const id of r.order) {
      const def = r.studies[id]!;
      const lvl = researchLevel(s, id);
      const next = nextStudyLevel(s, this.content, id);
      const row = el('div', 'card study');
      const pic = el('img', 'seed-thumb');
      pic.src = artUrl(def.icon) ?? '';
      pic.alt = '';
      const body = el('div', 'grow');
      body.append(el('b', '', `${def.name} · Lv ${lvl}/${def.levels.length}`), el('p', '', def.description));
      const info = el('div', 'rewards');
      const amount = (n: number) => (def.effect === 'mutation' ? `+${Math.round(n * 100)}% chance` : `${Math.round(n * 100)}% faster`);
      if (lvl > 0) info.append(el('span', 'reward', `Now ${amount(def.perLevel * lvl)}`));
      if (next) info.append(el('span', 'reward', `Next ${amount(def.perLevel * next.level)} · ${clock(next.ms)}`));
      body.append(info);
      row.append(pic, body);
      if (!next) row.append(el('span', 'reward', 'Done ✓'));
      else {
        const side = el('div', 'seed-side');
        const cost = el('span', canAfford(s, next.cost) ? 'muted' : 'no');
        cost.append(...costChips(next.cost, ''));
        const busy = !!s.research.active;
        side.append(cost, button(busy ? 'Busy' : 'Study', 'btn primary', () => this.run({ type: 'start_research', studyId: id, at: Date.now() }), busy || !canAfford(s, next.cost)));
        row.append(side);
      }
      list.append(row);
    }
    this.page.append(list);
  }

  // ---------- Explore: Succulent Garden ----------

  private renderGarden(): void {
    const g = this.content.garden;
    if (!g) return;
    const s = this.getState();
    const now = Date.now();
    const at = this.content.levels.find((l) => l.unlocks.includes(g.unlock))?.level ?? 99;
    const palette = { seedling: g.seedlingColour };
    const tintOf = (colour: string) => g.colours[colour] ?? { mature: '#cccccc', blush: '#cccccc' };
    const redraw = () => this.render();
    const tools = s.garden.tools;
    const speed = researchSpeed(s, this.content);
    const sun = tools.includes('sun_shelf');
    const plantPic = (speciesId: string, colour: string, t: number, pattern = 'plain'): string => {
      const def = g.species[speciesId]!;
      return succulentImage(def, palette, tintOf(colour), t, redraw, { pattern, sun }) ?? succulentArtUrl(def) ?? '';
    };
    const overlay = (key: string, cls: string): HTMLElement | null => {
      const url = artUrl(key);
      if (!url) return null;
      const img = el('img', cls);
      img.src = url;
      img.alt = '';
      return img;
    };
    if (!gardenOpen(s, this.content)) {
      const card = el('div', 'card');
      card.append(el('h3', '', 'Succulent Garden'), el('p', '', `Grow little succulents that change colour as they grow. Opens at Home Level ${at}.`));
      this.page.append(card);
      return;
    }
    if (this.gardenView === 'book') return this.renderSucculentBook(plantPic);
    // Grown plants go into the Succulent book as soon as they are seen.
    if ((undiscovered(s, this.content, now).length || unseenPatterns(s, this.content, now).length) && !this.tending) {
      this.tending = true;
      queueMicrotask(() => {
        this.run({ type: 'tend_garden', at: Date.now() });
        this.tending = false;
      });
    }
    const from = this.pollenFrom;
    const fromPlant = from !== null ? s.garden.pots[from] : null;
    if (from !== null && (!fromPlant || !plantStatus(this.content, fromPlant, now, tools, speed)?.blooming)) this.pollenFrom = null;
    const giftPlant = this.giftFrom !== null ? s.garden.pots[this.giftFrom] : null;
    if (this.giftFrom !== null && (!giftPlant || giftPlant.pod || succulentGrowth(this.content, giftPlant.speciesId, giftPlant.plantedAt, now, speed.grow)?.stage !== 'grown')) this.giftFrom = null;

    const potCost = nextPotCost(s, this.content);
    const owned = s.garden.pots.length;
    const maxPots = g.maxPots;
    const plantInfo = (i: number) => {
      const plant = s.garden.pots[i];
      const def = plant ? g.species[plant.speciesId] : undefined;
      if (!plant || !def) return null;
      return { plant, def, st: plantStatus(this.content, plant, now, tools, speed)! };
    };
    const needs = (i: number): boolean => {
      const info = plantInfo(i);
      return !!info && (info.st.growth.stage === 'grown' || info.st.podReady || info.st.offsetReady);
    };
    if (this.gardenPot === null || this.gardenPot >= Math.min(maxPots, owned + (potCost ? 1 : 0))) {
      const first = s.garden.pots.findIndex((_, i) => needs(i));
      this.gardenPot = first >= 0 ? first : 0;
    }
    const selected = this.gardenPot;
    // While pollen is on the brush, the flowers it can go onto glow.
    const canTake = (i: number): boolean => {
      const info = plantInfo(i);
      return this.pollenFrom !== null && this.pollenFrom !== i && !!info?.st.blooming && !info.plant.pod;
    };

    // ----- The map: stays on screen while you work the side panel. -----
    const sceneUrl = artUrl('garden_scene_background');
    const wrap = el('div', sceneUrl ? 'garden-wrap v2' : 'garden-wrap v2 no-scene');
    const scene = el('div', 'garden-scene');
    if (sceneUrl) scene.style.backgroundImage = `url("${sceneUrl}")`;
    for (let i = 0; i < maxPots; i++) {
      const spot = GARDEN_SPOTS[i]!;
      const isOwned = i < owned;
      const isBuy = !isOwned && i === owned && !!potCost;
      if (!isOwned && !isBuy) continue;
      const slot = el('button', `garden-slot${spot.back ? ' back' : ''}${i === selected ? ' selected' : ''}${canTake(i) ? ' target' : ''}`);
      slot.style.left = `${spot.x * 100}%`;
      slot.style.top = `${spot.y * 100}%`;
      slot.style.width = `${spot.w * 100}%`;
      const info = plantInfo(i);
      if (isBuy) {
        slot.classList.add('buy');
        slot.append(el('span', 'slot-plus', '+'));
        slot.setAttribute('aria-label', 'Another pot');
      } else {
        const stack = el('div', `slot-stack${info?.def.anchor === 'top' ? ' trail' : ''}`);
        if (info) {
          const grow = info.st.growth;
          const img = el('img', 'plant');
          img.alt = info.def.name;
          img.src = plantPic(info.def.id, info.plant.colour, grow.colour, info.plant.pattern);
          const ease = grow.progress * grow.progress * (3 - 2 * grow.progress);
          img.style.setProperty('--grow', String(0.42 + 0.58 * ease));
          stack.append(img);
        }
        const potImg = el('img', 'pot-art');
        potImg.src = artUrl('garden_pot') ?? '';
        potImg.alt = '';
        stack.append(potImg);
        if (info?.plant.pod) {
          const pod = overlay('garden_pod', `pod${info.st.podReady ? ' ripe' : ''}`);
          if (pod) stack.append(pod);
        }
        slot.append(stack);
        let tag = '';
        if (!info) tag = 'Empty';
        else if (info.st.podReady) tag = 'Seeds!';
        else if (info.plant.pod) tag = clock(info.plant.pod.readyAt - now);
        else if (info.st.growth.stage !== 'grown') tag = clock(info.st.growth.grownAt - now);
        else if (info.st.offsetReady) tag = 'Offset!';
        else if (info.st.blooming) tag = '✿ In flower';
        else tag = 'Grown';
        slot.append(el('span', `slot-tag${needs(i) ? ' ready' : ''}`, tag));
        slot.setAttribute('aria-label', info ? `${info.def.name}, ${tag}` : 'Empty pot');
        if (this.pollenFrom === i) slot.classList.add('picked');
      }
      slot.addEventListener('click', () => {
        const fromPot = this.pollenFrom;
        if (fromPot !== null && canTake(i)) {
          this.pollenFrom = null;
          this.gardenPot = i;
          this.run({ type: 'pollinate', pot: i, fromPot, at: Date.now() });
          return;
        }
        this.gardenPot = i;
        this.gardenTab = 'plants';
        this.render();
      });
      scene.append(slot);
    }
    const ownedTools = g.toolOrder.filter((t) => tools.includes(t));
    if (ownedTools.length) {
      const table = el('div', 'garden-table');
      for (const t of ownedTools) {
        const im = overlay(`garden_${t}`, 'table-tool');
        if (im) {
          im.title = g.tools[t].name;
          table.append(im);
        }
      }
      scene.append(table);
    }

    // ----- The side panel: Plants, Seed Bag, Goals. -----
    const side = el('div', 'garden-side card');
    const goal = nextGardenGoal(s, this.content);
    const bagCount = Object.values(s.garden.seeds).reduce((a, b) => a + b, 0);
    const tabs = el('div', 'gtabs');
    for (const [t, label, dot] of [['plants', 'Plants', false], ['bag', `Seed Bag${bagCount ? ` ${bagCount}` : ''}`, false], ['goals', 'Goals', !!goal?.done]] as Array<[typeof this.gardenTab, string, boolean]>) {
      const b = button(label, `gtab${this.gardenTab === t ? ' on' : ''}`, () => { this.gardenTab = t; this.render(); });
      if (dot && this.gardenTab !== t) b.append(el('span', 'dot'));
      tabs.append(b);
    }
    side.append(tabs);
    const body = el('div', 'gbody');
    const freePot = (): number => {
      // Plant into the selected pot if it is empty, else the first empty one.
      if (selected < owned && !s.garden.pots[selected]) return selected;
      return s.garden.pots.findIndex((p) => p === null);
    };

    if (this.giftFrom !== null && giftPlant) {
      const pot = this.giftFrom;
      body.append(el('b', '', `Give ${succulentName(this.content, giftPlant.speciesId, giftPlant.colour, giftPlant.pattern)} to:`));
      const who = el('div', 'gift-who');
      for (const id of s.residentOrder.filter((r) => !onTrip(s, r))) {
        const given = treatGivenToday(s, this.content, id, now);
        const b = button(this.content.residents[id]?.name ?? id, 'btn small', () => { this.giftFrom = null; this.run({ type: 'give_succulent', pot, residentId: id, at: Date.now() }); }, given);
        if (given) b.title = 'Already had a gift today';
        who.append(b);
      }
      body.append(who, button('Cancel', 'btn small', () => { this.giftFrom = null; this.render(); }));
    } else if (this.gardenTab === 'plants') {
      if (this.pollenFrom !== null && fromPlant) {
        const bar = el('div', 'pollen-bar');
        const brush = overlay('garden_brush', 'pollen-icon');
        if (brush) bar.append(brush);
        bar.append(el('span', 'grow', 'Pollen on the brush: tap a glowing flower.'));
        bar.append(button('Cancel', 'btn small', () => { this.pollenFrom = null; this.render(); }));
        body.append(bar);
      }
      if (selected >= owned && potCost) {
        body.append(el('b', 'gname', 'Another pot'), el('p', 'muted', `Room for ${maxPots} pots in all.`));
        const price = el('div', 'rewards');
        price.append(...costChips(potCost, ''));
        body.append(price, button('Buy a pot', 'btn primary', () => this.run({ type: 'buy_pot' }), !canAfford(s, potCost)));
      } else {
        const info = plantInfo(selected);
        if (!info) {
          body.append(el('b', 'gname', 'Empty pot'));
          if (bagCount) {
            body.append(el('p', 'muted', 'Plant a seed from your seed bag:'));
            body.append(this.seedBagList(plantPic, selected, true));
          } else {
            body.append(el('p', 'muted', 'Your seed bag is empty. Buy seed packets in the Shop.'));
          }
        } else {
          const { plant, def, st } = info;
          const grow = st.growth;
          const head = el('div', 'ghead');
          const thumb = el('img', 'gthumb');
          thumb.src = plantPic(def.id, plant.colour, grow.colour, plant.pattern);
          thumb.alt = '';
          head.append(thumb, el('b', 'gname', grow.stage === 'grown' ? succulentName(this.content, def.id, plant.colour, plant.pattern) : def.name));
          body.append(head);
          if (grow.stage !== 'grown') {
            body.append(el('p', 'muted', `${grow.stage === 'seedling' ? 'Seedling' : 'Growing'} · ready in ${clock(grow.grownAt - now)}`));
            const bar = el('div', 'trip-bar');
            const fill = el('span');
            fill.style.width = `${Math.round(grow.progress * 100)}%`;
            bar.append(fill);
            body.append(bar);
          } else {
            const acts = el('div', 'gacts');
            const i = selected;
            if (plant.pod) {
              if (st.podReady) acts.append(button('Collect seeds', 'btn primary wide', () => this.run({ type: 'collect_pod', pot: i, at: Date.now() })));
              else acts.append(el('span', 'muted wide', `Seed pod ripens in ${clock(plant.pod.readyAt - now)}`));
            } else if (st.blooming) {
              if (this.pollenFrom === null) acts.append(iconButton('icon_pollinate', '🐝', 'Pollinate', 'btn primary', () => { this.pollenFrom = i; this.giftFrom = null; this.render(); }));
              else if (this.pollenFrom === i) acts.append(el('span', 'muted wide', 'Now tap another flower'));
              else acts.append(button('Brush here', 'btn primary', () => {
                const fromPot = this.pollenFrom;
                this.pollenFrom = null;
                if (fromPot !== null) this.run({ type: 'pollinate', pot: i, fromPot, at: Date.now() });
                else this.render();
              }));
            } else {
              acts.append(el('span', 'muted wide', `Flowers in ${clock(st.bloomAt - now)}`));
            }
            if (st.offsetReady) acts.append(button('Take offset', 'btn', () => this.run({ type: 'take_offset', pot: i, at: Date.now() })));
            if (!plant.pod && s.residentOrder.length) acts.append(iconButton('icon_give', '🎁', 'Give', 'btn', () => { this.giftFrom = i; this.pollenFrom = null; this.render(); }));
            if (!plant.pod) acts.append(iconButton('icon_show', '✦', 'Put on show', 'btn', () => this.run({ type: 'display_succulent', pot: i, at: Date.now() })));
            const price = succulentSellPrice(this.content, plant).buttons ?? 0;
            acts.append(iconButton('icon_buttons', '●', `Sell · ${price}`, 'btn', () => this.run({ type: 'sell_succulent', pot: i, at: Date.now() }), !!plant.pod));
            body.append(acts);
          }
        }
      }
    } else if (this.gardenTab === 'bag') {
      if (!bagCount) body.append(el('p', 'muted', 'No seeds yet. Buy seed packets in the Shop, or collect seeds from pollinated flowers.'));
      else {
        const target = freePot();
        body.append(el('p', 'muted', target < 0 ? 'Every pot is in use. Sell a grown plant or buy another pot.' : `Plants into pot ${target + 1}.`));
        body.append(this.seedBagList(plantPic, target, false));
      }
    } else {
      if (!goal) body.append(el('p', 'muted', 'Every garden goal is done!'));
      else {
        body.append(el('b', 'gname', goal.def.title), el('p', 'muted', `${goal.def.description} (${goal.progress}/${goal.def.check.count})`));
        const rw = el('div', 'rewards');
        rw.append(...costChips(goal.def.reward));
        body.append(rw, button(goal.done ? 'Claim' : 'Not yet', goal.done ? 'btn primary' : 'btn', () => this.run({ type: 'claim_garden_goal', goalId: goal.def.id }), !goal.done));
      }
    }
    side.append(body);
    const links = el('div', 'glinks');
    const total = g.order.length * g.colourOrder.length;
    links.append(
      button(`Succulent Book ${s.garden.discovered.length}/${total}`, 'btn small', () => { this.gardenView = 'book'; this.page.scrollTop = 0; this.render(); }),
      button('Shop · Gardening', 'btn small', () => { this.shop.open('gardening'); this.setTab('shop'); }),
    );
    side.append(links);
    wrap.append(scene, side);
    this.page.append(wrap);
  }

  /** Seeds in the bag, ready to plant into pot `pot` (-1 when every pot is full). */
  private seedBagList(plantPic: (speciesId: string, colour: string, t: number, pattern?: string) => string, pot: number, compact: boolean): HTMLElement {
    const g = this.content.garden!;
    const s = this.getState();
    const list = el('div', `bag-list${compact ? ' compact' : ''}`);
    const plant = (key: string) => this.run({ type: 'plant_seed', pot, seed: key, at: Date.now() });
    if (s.garden.tools.includes('loupe')) {
      // With the Loupe every seed shows what it will grow into.
      for (const [key, count] of Object.entries(s.garden.seeds)) {
        const seed = parseSeedKey(this.content, key);
        if (!seed || count <= 0) continue;
        const row = el('div', 'bag-row');
        const thumb = el('img', 'bag-thumb');
        thumb.src = plantPic(seed.speciesId, seed.colour, 1, seed.pattern);
        thumb.alt = '';
        const isNew = !s.garden.discovered.includes(`${seed.speciesId}:${seed.colour}`);
        row.append(thumb, el('span', 'grow', `${succulentName(this.content, seed.speciesId, seed.colour, seed.pattern)} ×${count}${isNew ? ' ★' : ''}`));
        row.append(button('Plant', 'btn small primary', () => plant(key), pot < 0));
        list.append(row);
      }
      return list;
    }
    // Without it, seeds are grouped by shape: the colour is a surprise until it grows.
    const bySpecies = new Map<string, string[]>();
    for (const [key, count] of Object.entries(s.garden.seeds)) {
      const seed = parseSeedKey(this.content, key);
      if (!seed || count <= 0) continue;
      const keys = bySpecies.get(seed.speciesId) ?? [];
      for (let k = 0; k < count; k++) keys.push(key);
      bySpecies.set(seed.speciesId, keys);
    }
    for (const id of g.order) {
      const keys = bySpecies.get(id);
      if (!keys) continue;
      const row = el('div', 'bag-row');
      const thumb = el('img', 'bag-thumb');
      thumb.src = artUrl(`garden_seed_${id}`) ?? plantPic(id, g.species[id]!.colour, 0);
      thumb.alt = '';
      row.append(thumb, el('span', 'grow', `${g.species[id]!.name} ×${keys.length}`));
      row.append(button('Plant', 'btn small primary', () => plant(keys[0]!), pot < 0));
      list.append(row);
    }
    return list;
  }

  /** Succulent book: every shape in every colour, and the leaf patterns. */
  private renderSucculentBook(plantPic: (speciesId: string, colour: string, t: number, pattern?: string) => string): void {
    const g = this.content.garden!;
    const s = this.getState();
    const head = el('div', 'page-h');
    head.append(button('‹ Garden', 'btn light', () => { this.gardenView = 'map'; this.page.scrollTop = 0; this.render(); }));
    const total = g.order.length * g.colourOrder.length;
    head.append(el('h2', '', `Succulent Book · ${s.garden.discovered.length} of ${total}`));
    this.page.append(head);
    const book = el('div', 'card');
    book.append(el('p', 'muted', 'Seeds take their shape from one parent and their colour from one parent, and now and then come out in a colour neither had. New colours sell for more.'));
    const grid = el('div', 'succ-book');
    grid.append(el('span', ''));
    for (const c of g.colourOrder) grid.append(el('span', 'book-col', g.colours[c]!.name));
    for (const id of g.order) {
      grid.append(el('span', 'book-row', g.species[id]!.name));
      for (const c of g.colourOrder) {
        const key = `${id}:${c}`;
        const found = s.garden.discovered.includes(key);
        const cell = el('img', `book-cell${found ? '' : ' unknown'}`);
        cell.src = found ? plantPic(id, c, 1) : succulentArtUrl(g.species[id]!) ?? '';
        cell.alt = found ? succulentName(this.content, id, c) : 'Not found yet';
        cell.title = cell.alt;
        grid.append(cell);
      }
    }
    book.append(grid);
    const pats = el('div', 'rewards book-patterns');
    pats.append(el('b', '', 'Leaf patterns:'));
    for (const id of g.patternOrder.filter((x) => x !== 'plain')) {
      const found = s.garden.patternsFound.includes(id);
      pats.append(el('span', `reward${found ? '' : ' muted'}`, found ? `${g.patterns[id]!.name} ✓` : '???'));
    }
    book.append(pats);
    this.page.append(book);
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
    if (this.content.garden && level >= gardenAt - 1) views.push(['garden', 'Garden', gardenDue(s, this.content, now) || !!nextGardenGoal(s, this.content)?.done]);
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
    // Gathering and trips side by side, so both are visible without scrolling.
    const split = el('div', 'outdoors');
    const page = this.page;
    this.page = split as unknown as typeof this.page;
    try {
      this.renderGathering();
      this.renderExpeditions();
    } finally {
      this.page = page;
    }
    page.append(split);
  }

  /** Something outdoors is ready: a gathering spot, or a friend back from a trip. */
  private outdoorsDue(now: number): boolean {
    const s = this.getState();
    return (
      Object.keys(this.content.gatherSpots).some((id) => spotUnlocked(s, this.content, id) && gatherReadyIn(s, this.content, id, now) === 0) ||
      s.expeditions.some((t) => t.endAt <= now)
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
          button('Open', 'btn primary', () => this.confirmSpend(price, `Open a ${kind === 'friend' ? 'Friend' : 'Furniture'} Parcel?`, () => this.openParcel(pool.id, kind)), !poolCanOpen(s, this.content, pool, kind)),
          button(this.oddsOpen === key ? 'Hide odds' : 'Odds', 'btn', () => { this.oddsOpen = this.oddsOpen === key ? '' : key; this.render(); }),
        );
        if (!poolCanOpen(s, this.content, pool, kind) && hasNew && !canAfford(s, price)) body.append(el('p', 'why', `You need ${(Object.entries(price) as Array<[Currency, number]>).map(([c, v]) => `${v - (s.wallet[c] ?? 0)} more ${CURRENCY[c].name}`).filter((t) => !t.startsWith('-') && !t.startsWith('0 ')).join(' and ')}.`));
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
    const reduced = (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) || !!prefs().reducedMotion;
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
    case 'home_full':
      return 'Every room is full. Open a new room to make space for a new friend';
    case 'busy':
      return 'Someone is already exploring';
    case 'away':
      return "They're away exploring";
    default:
      return reasonText(error);
  }
}

/** The room a task is about, so "Go" can take the player straight there. */
function taskRoom(def: TaskDef): string | undefined {
  const c = def.condition;
  if (c.kind === 'placed' || c.kind === 'room_items') return c.roomId;
  if (c.kind === 'purchased') return c.key.split(':')[0];
  return undefined;
}
