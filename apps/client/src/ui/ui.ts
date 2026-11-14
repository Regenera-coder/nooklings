import type { Content, GameState } from '@nooklings/core';
import { reasonText, type PendingEdit, type RoomScene, type Selection } from '../game/RoomScene';

type Tab = 'home' | 'nookbook' | 'explore' | 'tasks';

const PLACEHOLDERS: Record<Exclude<Tab, 'home'>, { title: string; body: string }> = {
  nookbook: { title: 'Nookbook', body: 'Your collection album arrives in Milestone B, starting with Snug, Tinker and Mischi.' },
  explore: { title: 'Explore', body: 'Gathering and short expeditions arrive in Milestone C.' },
  tasks: { title: 'Tasks', body: 'Welcome quests and daily tasks arrive in Milestones B and C.' },
};

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

function tagChips(tags: Record<string, number>): HTMLElement {
  const wrap = el('div', 'tags');
  const entries = Object.entries(tags);
  if (entries.length === 0) wrap.append(el('span', 'tag', 'No atmosphere'));
  for (const [k, v] of entries) wrap.append(el('span', 'tag', `${k} +${v}`));
  return wrap;
}

/** DOM interface around the canvas: left tab rail, top bar and the right slide-in panel. */
export class GameUI {
  private tab: Tab = 'home';
  private build = false;
  private selection: Selection = { kind: 'none' };
  private pending: PendingEdit | null = null;
  private toastTimer = 0;
  private readonly panel = document.getElementById('panel')!;
  private readonly buildBtn = document.getElementById('build-btn') as HTMLButtonElement;

  constructor(
    private readonly content: Content,
    private readonly getState: () => GameState,
    private readonly getScene: () => RoomScene | null,
    private readonly onLayoutChange: () => void,
  ) {
    document.querySelectorAll<HTMLButtonElement>('#rail .tab').forEach((b) =>
      b.addEventListener('click', () => this.setTab(b.dataset.tab as Tab)),
    );
    this.buildBtn.addEventListener('click', () => this.setBuild(!this.build));
    document.getElementById('fs-btn')!.addEventListener('click', () => void this.toggleFullscreen());
    document.getElementById('home-name')!.textContent = getState().homeName;
  }

  setTab(tab: Tab): void {
    this.tab = tab;
    document.querySelectorAll<HTMLButtonElement>('#rail .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const ph = document.getElementById('tab-placeholder')!;
    if (tab === 'home') {
      ph.hidden = true;
    } else {
      if (this.build) this.setBuild(false);
      ph.hidden = false;
      ph.querySelector('.ph-title')!.textContent = PLACEHOLDERS[tab].title;
      ph.querySelector('.ph-body')!.textContent = PLACEHOLDERS[tab].body;
      this.selection = { kind: 'none' };
    }
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

  onSelection(sel: Selection): void {
    const changedKind = sel.kind !== this.selection.kind || (sel.kind === 'furniture' && this.selection.kind === 'furniture' && sel.uid !== this.selection.uid);
    this.selection = sel;
    if (changedKind || sel.kind === 'resident') this.render();
  }

  onPending(edit: PendingEdit | null): void {
    this.pending = edit;
    this.render();
  }

  onStateChanged(): void {
    this.render();
  }

  toast(text: string): void {
    const t = document.getElementById('toast')!;
    t.textContent = text;
    t.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.remove('show'), 1800);
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

  private render(): void {
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
      this.renderResident(panel, this.selection.id, this.selection.status);
    }
    panel.hidden = !show;
    if (wasHidden !== panel.hidden) this.onLayoutChange();
  }

  private renderTray(panel: HTMLElement): void {
    panel.append(el('h2', '', 'Build'));
    panel.append(el('p', 'sub', 'Tap an item to place it, or tap furniture in the room to move it.'));
    const inv = this.getState().inventory;
    for (const group of GROUPS) {
      const defs = Object.values(this.content.furniture).filter((d) => d.layer === group.layer);
      if (defs.length === 0) continue;
      panel.append(el('h3', '', group.label));
      const tray = el('div', 'tray');
      for (const def of defs) {
        const count = inv[def.id] ?? 0;
        const b = el('button', `chip${count === 0 ? ' empty' : ''}`);
        b.append(el('span', '', def.name), el('span', 'n', count === 0 ? 'None stored' : `×${count}`));
        b.addEventListener('click', () => {
          if (count === 0) return this.toast(`No ${def.name} in storage`);
          this.getScene()?.beginPlace(def.id);
        });
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
    const confirm = el('button', 'act primary', e.mode === 'new' ? 'Place' : 'Confirm');
    confirm.addEventListener('click', () => scene?.confirmPending());
    acts.append(confirm);
    if (def.canFlip) {
      const flip = el('button', 'act', 'Flip');
      flip.addEventListener('click', () => scene?.flipPending());
      acts.append(flip);
    }
    if (e.mode === 'move') {
      const store = el('button', 'act', 'Store');
      store.addEventListener('click', () => scene?.storePending());
      acts.append(store);
    }
    const cancel = el('button', `act${def.canFlip && e.mode === 'move' ? ' wide' : ''}`, 'Cancel');
    cancel.addEventListener('click', () => scene?.cancelPending());
    acts.append(cancel);
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
    const edit = el('button', 'act primary', 'Move this');
    edit.addEventListener('click', () => {
      this.setBuild(true);
      this.getScene()?.beginMove(uid);
    });
    acts.append(edit);
    panel.append(acts);
  }

  private renderResident(panel: HTMLElement, id: string, status: string): void {
    const def = this.content.residents[id];
    if (!def) return;
    panel.append(el('h2', '', def.name));
    panel.append(el('p', 'sub', `${def.rarity} · ${status}`));
    panel.append(el('p', 'hint', def.tagline));
    panel.append(el('p', 'hint', 'Full character page arrives in Milestone B.'));
  }
}
