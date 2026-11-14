import {
  bondProgress,
  canAfford,
  invitationStatus,
  isUnlocked,
  levelFor,
  nextLevel,
  parcelOdds,
  playReadyAt,
  poolCanOpen,
  taskStates,
  type Content,
  type Cost,
  type Currency,
  type GameEvent,
  type GameState,
  type ResidentDef,
  type TaskDef,
} from '@nooklings/core';
import { artUrl } from '../assets';
import { reasonText, type PendingEdit, type RoomScene, type Selection } from '../game/RoomScene';
import { portraitUrl } from '../portraits';
import type { CommandInput } from '../store';

type Tab = 'home' | 'nookbook' | 'explore' | 'tasks';
type Filter = 'all' | 'owned' | 'missing';

const CURRENCY: Record<Currency | 'hearts', { name: string; icon: string; glyph: string }> = {
  buttons: { name: 'Buttons', icon: 'icon_buttons', glyph: '●' },
  wood: { name: 'Wood', icon: 'icon_wood', glyph: '▤' },
  fabric: { name: 'Fabric', icon: 'icon_fabric', glyph: '◈' },
  wishStamps: { name: 'Wish Stamps', icon: 'icon_wish_stamp', glyph: '✉' },
  mendingThread: { name: 'Mending Thread', icon: 'icon_mending_thread', glyph: '✂' },
  hearts: { name: 'Home Hearts', icon: 'icon_home_heart', glyph: '♥' },
};

const UNLOCK_NAMES: Record<string, string> = { crafting: 'Crafting', parcels: 'Mystery Parcels' };

const GROUPS: Array<{ label: string; layer: 'floor' | 'rug' | 'wall' }> = [
  { label: 'Furniture', layer: 'floor' },
  { label: 'Rugs', layer: 'rug' },
  { label: 'Wall', layer: 'wall' },
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
    chip.append(icon(k), document.createTextNode(` ${v} ${CURRENCY[k].name}`));
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
  private showOdds = false;
  private toastTimer = 0;
  private revealing = false;
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
    window.setInterval(() => this.tick(), 1000);
    this.renderTop();
    this.renderBadges();
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
      case 'resident_joined':
        if (e.via === 'invitation') this.toast(`${this.content.residents[e.residentId]?.name} moved in!`, 2600);
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
      (this.tab === 'home' && this.selection.kind === 'resident') || (this.tab === 'nookbook' && this.detailId !== null);
    if (hasCountdown && !this.revealing) this.render();
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
    const parcelDue = Object.values(this.content.parcels).some((p) => poolCanOpen(s, this.content, p));
    const bookDue = s.residentOrder.some((id) => !s.flags.includes(`viewed:${id}`) && id !== 'snug');
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
    if (this.tab === 'home' && this.build) {
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

  private renderTray(panel: HTMLElement): void {
    const s = this.getState();
    panel.append(el('h2', '', 'Build'));
    panel.append(el('p', 'sub', 'Tap an item to place it, or tap furniture in the room to move it.'));

    panel.append(el('h3', '', 'Craft'));
    if (!isUnlocked(s, this.content, 'crafting')) {
      panel.append(el('p', 'hint', 'Crafting unlocks at Home Level 2.'));
    } else {
      const tray = el('div', 'tray');
      for (const r of Object.values(this.content.recipes)) {
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
    }

    const inv = s.inventory;
    for (const group of GROUPS) {
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
    panel.append(el('p', 'sub', `${def.w}×${def.h} · ${def.layer === 'wall' ? 'Wall' : def.layer === 'rug' ? 'Rug' : 'Floor'}`));
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
    img.src = portraitUrl(def, { decorated: owned.form === 'decorated' });
    img.alt = '';
    const names = el('div');
    names.append(el('h2', '', def.name), el('p', 'sub', `${def.rarity} · ${status}`));
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
    return button(wait > 0 ? `Play in ${seconds(wait)}` : `Play with ${def.name}`, cls, () => {
      this.run({ type: 'play', residentId: id, at: Date.now() });
    }, wait > 0);
  }

  // ---------- Tasks page ----------

  private renderTasks(): void {
    const s = this.getState();
    const head = el('div', 'page-h');
    head.append(el('h2', '', 'Tasks'), el('span', 'grow'), el('span', 'muted', 'Finish a task to unlock the next one.'));
    this.page.append(head);

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
      body.append(el('p', '', st.levelOk ? `${st.def.welcomeText} Once the room is right, ${def.name} is guaranteed to join.` : `Unlocks at Home Level ${st.def.requiresLevel}.`));
      const req = el('div', 'req');
      req.append(el('span', st.levelOk ? 'ok' : 'no', `Home Level ${st.def.requiresLevel}`));
      for (const a of st.atmosphere) req.append(el('span', a.ok ? 'ok' : 'no', `${a.tag} ${a.have}/${a.need}`));
      const gift = el('span', st.giftOk ? 'ok' : 'no');
      gift.append(...costChips(st.def.welcomeGift, ''));
      gift.prepend(document.createTextNode('Gift: '));
      req.append(gift);
      body.append(req);
      row.append(img, body, button('Invite', 'btn primary', () => this.run({ type: 'invite', residentId: id }), !st.ready));
      card.append(row);
      this.page.append(card);
    }

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
    if (doneCount === all.length) this.page.prepend(el('p', 'muted', 'All Milestone B tasks done. More arrive with Home Levels 4 to 10.'));
  }

  private taskCard(def: TaskDef, status: string): HTMLElement {
    const card = el('div', `card task ${status}`);
    const row = el('div', 'row');
    const body = el('div', 'grow');
    body.append(el('h3', '', status === 'locked' ? '???' : def.title));
    body.append(el('p', '', status === 'locked' ? 'Finish the task above to reveal this one.' : def.description));
    if (status !== 'locked' && status !== 'claimed') {
      const rewards = el('div', 'rewards');
      rewards.append(...costChips(def.reward));
      body.append(rewards);
    }
    row.append(body);
    if (status === 'claimable') row.append(button('Claim', 'btn primary', () => this.run({ type: 'claim_task', taskId: def.id })));
    else if (status === 'active' && def.goTo) row.append(button('Go', 'btn', () => this.go(def.goTo!)));
    else if (status === 'claimed') row.append(el('span', 'muted', 'Done'));
    card.append(row);
    return card;
  }

  private go(target: NonNullable<TaskDef['goTo']>): void {
    if (target === 'build') {
      this.setTab('home');
      this.setBuild(true);
    } else if (target === 'nookbook') this.setTab('nookbook');
    else if (target === 'parcels') this.setTab('explore');
    else this.page.scrollTop = 0;
  }

  // ---------- Nookbook ----------

  private renderNookbook(): void {
    if (this.detailId) return this.renderDetail(this.detailId);
    const s = this.getState();
    const series = Object.values(this.content.residents).filter((r) => r.series === 'first_residents');
    const ownedCount = series.filter((r) => r.id in s.residents).length;
    const head = el('div', 'page-h');
    head.append(el('h2', '', 'Series 1 · The First Residents'), el('span', 'grow'), el('span', 'muted', `${ownedCount}/${series.length}`));
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
      img.src = portraitUrl(r, { silhouette: !owned, decorated: s.residents[r.id]?.form === 'decorated' });
      img.alt = owned ? r.name : 'Not yet found';
      card.append(img, el('span', 'nm', owned ? r.name : '???'), el('span', `rar ${r.rarity}`, r.rarity));
      card.addEventListener('click', () => this.openDetail(r.id));
      grid.append(card);
    }
    this.page.append(grid);
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
    img.src = portraitUrl(def, { silhouette: !owned, decorated: owned?.form === 'decorated' });
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
      add('Lives in', 'Living Room');
      info.append(kv, el('p', 'story', def.story));
      const actions = el('div', 'actions');
      actions.append(this.playButton(id, 'btn primary'));
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
    }
    wrap.append(art, info);
    this.page.append(wrap);
  }

  // ---------- Explore: Mystery Parcels ----------

  private renderExplore(): void {
    const s = this.getState();
    const head = el('div', 'page-h');
    head.append(el('h2', '', 'Explore'));
    this.page.append(head);
    for (const pool of Object.values(this.content.parcels)) {
      const card = el('div', 'card');
      if (!isUnlocked(s, this.content, pool.requiresUnlock)) {
        card.append(el('h3', '', 'Mystery Parcels'), el('p', '', 'Unlock at Home Level 3. Keep finishing tasks to earn Home Hearts.'));
        this.page.append(card);
        continue;
      }
      const wrap = el('div', 'parcel-wrap');
      wrap.append(this.parcelArt('parcel_closed'));
      const info = el('div');
      info.append(el('h3', '', pool.name));
      const cost = el('p');
      cost.append(document.createTextNode('Costs '), ...costChips(pool.cost, ''), document.createTextNode(` · You have ${s.wallet.wishStamps}`));
      info.append(cost);
      const odds = parcelOdds(s, this.content, pool.id);
      if (odds.length === 1 && odds[0]!.chance === 1) {
        info.append(el('p', '', `Your first parcel is guaranteed: ${this.content.residents[odds[0]!.id]?.name}.`));
      } else {
        info.append(el('p', '', 'Duplicates turn into Mending Thread. Every character can also be earned without parcels.'));
      }
      const actions = el('div', 'actions');
      actions.append(
        button('Open (1 Wish Stamp)', 'btn primary', () => this.openParcel(pool.id), !canAfford(s, pool.cost)),
        button(this.showOdds ? 'Hide odds' : 'See odds', 'btn', () => { this.showOdds = !this.showOdds; this.render(); }),
      );
      info.append(actions);
      if (this.showOdds) {
        const table = el('table', 'odds');
        for (const o of odds) {
          const tr = el('tr');
          const name = o.kind === 'resident' ? `${this.content.residents[o.id]?.name} (${this.content.residents[o.id]?.rarity})` : `${this.content.furniture[o.id]?.name} (furniture)`;
          tr.append(el('td', '', name), el('td', '', `${(o.chance * 100).toFixed(1)}%`));
          table.append(tr);
        }
        info.append(table);
      }
      const recent = s.parcelLog.slice(-5).reverse();
      if (recent.length) {
        info.append(el('p', 'log', `Recent: ${recent.map((r) => this.outcomeName(r.kind, r.id) + (r.duplicate ? ' (duplicate)' : '')).join(', ')}`));
      }
      wrap.append(info);
      card.append(wrap);
      this.page.append(card);
    }
    const exp = el('div', 'card');
    exp.append(el('h3', '', 'Expeditions'), el('p', '', 'Gathering and short expeditions arrive in Milestone C.'));
    this.page.append(exp);
  }

  private parcelArt(key: 'parcel_closed' | 'parcel_open'): HTMLElement {
    const box = el('div', 'parcel-art');
    const url = artUrl(key);
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

  private openParcel(poolId: string): void {
    if (this.revealing) return;
    const events = this.run({ type: 'open_parcel', poolId });
    const opened = events?.find((e): e is Extract<GameEvent, { type: 'parcel_opened' }> => e.type === 'parcel_opened');
    if (!opened) return;
    this.revealing = true;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const r = this.reveal;
    r.replaceChildren();
    r.hidden = false;
    const shaking = el('div', 'reveal-parcel');
    const url = artUrl('parcel_closed');
    if (url) {
      const img = el('img');
      img.src = url;
      img.alt = '';
      shaking.append(img);
    } else shaking.append(el('div', 'parcel-box'));
    r.append(shaking);
    window.setTimeout(() => this.showResult(opened), reduced ? 50 : 950);
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
      else lines.push('New resident!', `${title} moved into your Living Room.`);
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
    default:
      return reasonText(error);
  }
}
