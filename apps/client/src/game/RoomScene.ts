import * as Phaser from 'phaser';
import { blockedGrid, validatePlacement, type Cell, type FurnitureDef, type GameEvent, type PlacementError, type Placement } from '@nooklings/core';
import type { GameStore } from '../store';
import { drawFurniture, type DrawnItem } from './art';
import { computeLayout, floorCellAt, wallSlotAt, type RoomLayout } from './layout';
import { Resident, type ResidentStatus, type World } from './resident';

export interface PendingEdit {
  mode: 'new' | 'move';
  defId: string;
  uid?: string;
  col: number;
  row: number;
  flipped: boolean;
  originalFlipped: boolean;
  valid: boolean;
  reason?: PlacementError;
}

export type Selection =
  | { kind: 'none' }
  | { kind: 'furniture'; uid: string; defId: string }
  | { kind: 'resident'; id: string; status: ResidentStatus };

export interface SceneCallbacks {
  onSelection(sel: Selection): void;
  onPending(edit: PendingEdit | null): void;
  onError(error: string): void;
}

const BG = 0x2b2130;

export class RoomScene extends Phaser.Scene {
  private store!: GameStore;
  private cb!: SceneCallbacks;
  private roomId!: string;
  private layout!: RoomLayout;
  private roomGfx!: Phaser.GameObjects.Graphics;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private ghostCells!: Phaser.GameObjects.Graphics;
  private drawn = new Map<string, DrawnItem>();
  private ghost: DrawnItem | null = null;
  private residents: Resident[] = [];
  private blocked: boolean[][] = [];
  private buildMode = false;
  private pending: PendingEdit | null = null;
  private drag: { offC: number; offR: number } | null = null;
  private selection: Selection = { kind: 'none' };
  private reducedMotion = false;
  private unsubscribe?: () => void;

  constructor() {
    super('room');
  }

  init(data: { store: GameStore; callbacks: SceneCallbacks; roomId: string }): void {
    this.store = data.store;
    this.cb = data.callbacks;
    this.roomId = data.roomId;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private get room() {
    return this.store.content.rooms[this.roomId]!;
  }

  private get placements(): readonly Placement[] {
    return this.store.state.rooms[this.roomId]?.placements ?? [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BG);
    this.roomGfx = this.add.graphics().setDepth(0);
    this.gridGfx = this.add.graphics().setDepth(12);
    this.ghostCells = this.add.graphics().setDepth(13);
    this.layout = computeLayout(this.room, this.scale.width, this.scale.height);
    this.blocked = blockedGrid(this.room, this.placements, this.store.content);

    for (const def of Object.values(this.store.content.residents)) {
      const start = this.firstFreeNear({ col: 6, row: 4 });
      const r = new Resident(this, def, start, this.reducedMotion);
      r.setLayout(this.layout);
      this.residents.push(r);
    }
    this.redrawAll();

    this.scale.on('resize', this.onResize, this);
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.unsubscribe = this.store.subscribe((_s, events) => this.onStateChanged(events));
    this.events.once('shutdown', () => this.unsubscribe?.());
  }

  override update(_time: number, delta: number): void {
    const now = this.time.now;
    const world = this.world();
    for (const r of this.residents) r.update(delta, now, world);
    if (this.selection.kind === 'resident') {
      const sel = this.selection;
      const r = this.residents.find((x) => x.def.id === sel.id);
      if (r && r.status !== sel.status) this.select({ kind: 'resident', id: sel.id, status: r.status });
    }
  }

  // ---------- public API used by the UI ----------

  setBuildMode(on: boolean): void {
    this.buildMode = on;
    if (!on) this.cancelPending();
    this.select({ kind: 'none' });
    this.drawGrid();
  }

  beginPlace(defId: string): void {
    const def = this.store.content.furniture[defId];
    if (!def) return;
    const spot = this.findValidSpot(def) ?? { col: Math.max(0, Math.floor((this.room.cols - def.w) / 2)), row: def.layer === 'wall' ? 0 : 2 };
    this.setPending({ mode: 'new', defId, col: spot.col, row: spot.row, flipped: false, originalFlipped: false, valid: true });
  }

  beginMove(uid: string): void {
    const p = this.placements.find((q) => q.uid === uid);
    if (!p) return;
    this.setPending({ mode: 'move', defId: p.defId, uid, col: p.col, row: p.row, flipped: p.flipped, originalFlipped: p.flipped, valid: true });
  }

  flipPending(): void {
    if (!this.pending) return;
    if (!this.store.content.furniture[this.pending.defId]?.canFlip) return;
    this.setPending({ ...this.pending, flipped: !this.pending.flipped });
  }

  confirmPending(): void {
    const e = this.pending;
    if (!e) return;
    if (!e.valid) {
      this.cb.onError(reasonText(e.reason));
      return;
    }
    if (e.mode === 'new') {
      const res = this.store.dispatch({ type: 'place', roomId: this.roomId, defId: e.defId, col: e.col, row: e.row, flipped: e.flipped });
      if (!res.ok) return this.cb.onError(reasonText(res.error));
    } else if (e.uid) {
      const res = this.store.dispatch({ type: 'move', roomId: this.roomId, uid: e.uid, col: e.col, row: e.row });
      if (!res.ok) return this.cb.onError(reasonText(res.error));
      if (e.flipped !== e.originalFlipped) this.store.dispatch({ type: 'flip', roomId: this.roomId, uid: e.uid });
    }
    this.clearPending();
  }

  storePending(): void {
    const e = this.pending;
    if (!e) return;
    if (e.mode === 'move' && e.uid) {
      const res = this.store.dispatch({ type: 'store', roomId: this.roomId, uid: e.uid });
      if (!res.ok) return this.cb.onError(reasonText(res.error));
    }
    this.clearPending();
  }

  cancelPending(): void {
    if (!this.pending) return;
    this.clearPending();
  }

  // ---------- internals ----------

  private world(): World {
    return { room: this.room, content: this.store.content, layout: this.layout, placements: this.placements, blocked: this.blocked };
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.cameras.main.setSize(size.width, size.height);
    this.layout = computeLayout(this.room, size.width, size.height);
    for (const r of this.residents) r.setLayout(this.layout);
    this.redrawAll();
  }

  private onStateChanged(events: GameEvent[]): void {
    this.blocked = blockedGrid(this.room, this.placements, this.store.content);
    this.redrawFurniture();
    const now = this.time.now;
    for (const r of this.residents) r.onLayoutChanged(this.world(), now);
    if (events.some((e) => e.type === 'placed')) for (const r of this.residents) r.react('♥', now);
  }

  private setPending(edit: PendingEdit): void {
    const def = this.store.content.furniture[edit.defId]!;
    const check = validatePlacement(this.room, this.placements, this.store.content, { defId: edit.defId, col: edit.col, row: edit.row }, edit.uid);
    this.pending = { ...edit, valid: check.ok, reason: check.ok ? undefined : check.reason };
    if (edit.mode === 'move' && edit.uid) this.drawn.get(edit.uid)?.container.setVisible(false);
    this.ghost?.container.destroy();
    this.ghost = drawFurniture(this, def, this.pending, this.layout);
    this.ghost.container.setDepth(5000).setAlpha(0.85);
    this.drawGhostCells(def);
    this.cb.onPending(this.pending);
  }

  private clearPending(): void {
    if (this.pending?.uid) this.drawn.get(this.pending.uid)?.container.setVisible(true);
    this.pending = null;
    this.drag = null;
    this.ghost?.container.destroy();
    this.ghost = null;
    this.ghostCells.clear();
    this.cb.onPending(null);
  }

  private drawGhostCells(def: FurnitureDef): void {
    const g = this.ghostCells;
    const e = this.pending;
    g.clear();
    if (!e) return;
    const l = this.layout;
    const color = e.valid ? 0x4fd18b : 0xff5d73;
    g.fillStyle(color, 0.32);
    g.lineStyle(2, color, 0.95);
    if (def.layer === 'wall') {
      const x = l.ox + e.col * l.cw;
      g.fillRect(x, l.wallTop + 4, def.w * l.cw, l.wallH - 8);
      g.strokeRect(x, l.wallTop + 4, def.w * l.cw, l.wallH - 8);
    } else {
      const x = l.ox + e.col * l.cw;
      const y = l.floorTop + e.row * l.ch;
      g.fillRect(x, y, def.w * l.cw, def.h * l.ch);
      g.strokeRect(x, y, def.w * l.cw, def.h * l.ch);
    }
  }

  private redrawAll(): void {
    this.drawRoom();
    this.drawGrid();
    this.redrawFurniture();
    if (this.pending) this.setPending(this.pending);
  }

  private redrawFurniture(): void {
    for (const d of this.drawn.values()) d.container.destroy();
    this.drawn.clear();
    for (const p of this.placements) {
      const def = this.store.content.furniture[p.defId];
      if (!def) continue;
      const d = drawFurniture(this, def, p, this.layout);
      d.container.setDepth(d.depth);
      if (this.pending?.uid === p.uid) d.container.setVisible(false);
      this.drawn.set(p.uid, d);
    }
  }

  private drawRoom(): void {
    const g = this.roomGfx;
    const l = this.layout;
    const room = this.room;
    g.clear();
    const frame = Math.max(6, l.cw * 0.18);
    g.fillStyle(0x6d4b33, 1).fillRoundedRect(l.ox - frame, l.wallTop - frame, l.width + frame * 2, l.wallH + l.floorH + frame * 2, 10);
    g.fillStyle(0xf4e3c8, 1).fillRect(l.ox, l.wallTop, l.width, l.wallH);
    g.fillStyle(0xecd6b6, 1);
    for (let c = 0; c < room.cols * 2; c += 2) g.fillRect(l.ox + (c + 0.5) * (l.cw / 2), l.wallTop, l.cw / 4, l.wallH * 0.68);
    g.fillStyle(0xd9b48f, 1).fillRect(l.ox, l.wallTop + l.wallH * 0.68, l.width, l.wallH * 0.32);
    g.fillStyle(0xc49a72, 1).fillRect(l.ox, l.wallTop + l.wallH * 0.68, l.width, 3);
    g.fillStyle(0x8f6440, 1).fillRect(l.ox, l.floorTop - 4, l.width, 4);
    for (let r = 0; r < room.rows; r++) {
      g.fillStyle(r % 2 === 0 ? 0xc9976a : 0xc08d60, 1).fillRect(l.ox, l.floorTop + r * l.ch, l.width, l.ch);
      g.fillStyle(0xb07e52, 1).fillRect(l.ox, l.floorTop + (r + 1) * l.ch - 1, l.width, 1);
      const offset = r % 2 === 0 ? 0 : 1.5;
      g.fillStyle(0xb07e52, 0.7);
      for (let c = offset; c < room.cols; c += 3) g.fillRect(l.ox + c * l.cw, l.floorTop + r * l.ch, 1, l.ch);
    }
    const d = room.door;
    const dx = l.ox + d.col * l.cw;
    g.fillStyle(0x8f6440, 1).fillRoundedRect(dx + l.cw * 0.08, l.wallTop + l.wallH * 0.22, l.cw * 0.84, l.wallH * 0.78, { tl: l.cw * 0.42, tr: l.cw * 0.42, bl: 0, br: 0 });
    g.fillStyle(0xb98a5e, 1).fillRoundedRect(dx + l.cw * 0.16, l.wallTop + l.wallH * 0.3, l.cw * 0.68, l.wallH * 0.7, { tl: l.cw * 0.34, tr: l.cw * 0.34, bl: 0, br: 0 });
    g.fillStyle(0xffd27a, 1).fillCircle(dx + l.cw * 0.7, l.wallTop + l.wallH * 0.68, Math.max(2, l.cw * 0.05));
    g.fillStyle(0x8fc7b1, 0.9).fillRoundedRect(dx + l.cw * 0.1, l.floorTop + l.ch * 0.15, l.cw * 0.8, l.ch * 0.6, 4);
  }

  private drawGrid(): void {
    const g = this.gridGfx;
    g.clear();
    if (!this.buildMode) return;
    const l = this.layout;
    g.lineStyle(1, 0xffffff, 0.28);
    for (let c = 0; c <= this.room.cols; c++) g.lineBetween(l.ox + c * l.cw, l.floorTop, l.ox + c * l.cw, l.floorTop + l.floorH);
    for (let r = 0; r <= this.room.rows; r++) g.lineBetween(l.ox, l.floorTop + r * l.ch, l.ox + l.width, l.floorTop + r * l.ch);
    g.lineStyle(1, 0xffffff, 0.18);
    for (let c = 0; c <= this.room.cols; c++) g.lineBetween(l.ox + c * l.cw, l.wallTop, l.ox + c * l.cw, l.floorTop);
    const d = this.room.door;
    g.fillStyle(0x8fc7b1, 0.35).fillRect(l.ox + d.col * l.cw, l.floorTop + d.row * l.ch, l.cw, l.ch);
  }

  private hitTest(x: number, y: number): Selection {
    for (const r of this.residents) {
      const b = r.bounds();
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return { kind: 'resident', id: r.def.id, status: r.status };
    }
    const order = [...this.drawn.entries()].sort((a, b) => b[1].depth - a[1].depth);
    for (const [uid, d] of order) {
      if (!d.container.visible) continue;
      const b = d.bounds;
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) {
        const p = this.placements.find((q) => q.uid === uid);
        if (p) return { kind: 'furniture', uid, defId: p.defId };
      }
    }
    return { kind: 'none' };
  }

  private select(sel: Selection): void {
    this.selection = sel;
    this.cb.onSelection(sel);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const { x, y } = pointer;
    if (!this.buildMode) {
      this.select(this.hitTest(x, y));
      return;
    }
    if (this.pending) {
      const b = this.ghost?.bounds;
      const onGhost = b && x >= b.x0 - 8 && x <= b.x1 + 8 && y >= b.y0 - 8 && y <= b.y1 + 8;
      if (onGhost) {
        this.startDrag(x, y);
      } else {
        this.moveGhostTo(x, y, true);
        this.startDrag(x, y);
      }
      return;
    }
    const hit = this.hitTest(x, y);
    if (hit.kind === 'furniture') {
      this.beginMove(hit.uid);
      this.startDrag(x, y);
    }
  }

  private startDrag(x: number, y: number): void {
    const e = this.pending;
    if (!e) return;
    const l = this.layout;
    const fc = (x - l.ox) / l.cw;
    const fr = (y - l.floorTop) / l.ch;
    this.drag = { offC: fc - e.col, offR: fr - e.row };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.drag || !this.pending || !pointer.isDown) return;
    const l = this.layout;
    const def = this.store.content.furniture[this.pending.defId]!;
    const col = Math.round((pointer.x - l.ox) / l.cw - this.drag.offC);
    const row = def.layer === 'wall' ? 0 : Math.round((pointer.y - l.floorTop) / l.ch - this.drag.offR);
    this.setGhostCell(def, col, row);
  }

  private onPointerUp(): void {
    this.drag = null;
  }

  private moveGhostTo(x: number, y: number, centre: boolean): void {
    const e = this.pending;
    if (!e) return;
    const def = this.store.content.furniture[e.defId]!;
    if (def.layer === 'wall') {
      const slot = wallSlotAt(this.layout, this.room, x, y) ?? Math.floor((x - this.layout.ox) / this.layout.cw);
      this.setGhostCell(def, slot - (centre ? Math.floor((def.w - 1) / 2) : 0), 0);
      return;
    }
    const cell = floorCellAt(this.layout, this.room, x, y);
    if (!cell) return;
    this.setGhostCell(def, cell.col - (centre ? Math.floor((def.w - 1) / 2) : 0), cell.row - (centre ? Math.floor((def.h - 1) / 2) : 0));
  }

  private setGhostCell(def: FurnitureDef, col: number, row: number): void {
    const e = this.pending;
    if (!e) return;
    const c = Math.max(0, Math.min(this.room.cols - def.w, col));
    const r = def.layer === 'wall' ? 0 : Math.max(0, Math.min(this.room.rows - def.h, row));
    if (c === e.col && r === e.row) return;
    this.setPending({ ...e, col: c, row: r });
  }

  private findValidSpot(def: FurnitureDef): Cell | null {
    const centreC = (this.room.cols - def.w) / 2;
    const candidates: Cell[] = [];
    const rows = def.layer === 'wall' ? [0] : Array.from({ length: this.room.rows - def.h + 1 }, (_, i) => i);
    for (const row of rows) for (let col = 0; col <= this.room.cols - def.w; col++) candidates.push({ col, row });
    candidates.sort((a, b) => Math.abs(a.col - centreC) + Math.abs(a.row - 3) - (Math.abs(b.col - centreC) + Math.abs(b.row - 3)));
    return candidates.find((c) => validatePlacement(this.room, this.placements, this.store.content, { defId: def.id, ...c }).ok) ?? null;
  }

  private firstFreeNear(target: Cell): Cell {
    let best: Cell = { ...this.room.door };
    let bestD = Infinity;
    for (let r = 0; r < this.room.rows; r++) {
      for (let c = 0; c < this.room.cols; c++) {
        if (this.blocked[r]?.[c]) continue;
        const d = Math.abs(c - target.col) + Math.abs(r - target.row);
        if (d < bestD) {
          bestD = d;
          best = { col: c, row: r };
        }
      }
    }
    return best;
  }
}

export function reasonText(reason: string | undefined): string {
  switch (reason) {
    case 'overlap':
      return "Something's already there";
    case 'blocks_door':
      return 'Keep the doorway clear';
    case 'unreachable':
      return 'That would block a path';
    case 'out_of_bounds':
      return "That doesn't fit there";
    case 'not_in_inventory':
      return 'None left in storage';
    case 'cannot_flip':
      return "This one can't be flipped";
    default:
      return "That can't go there";
  }
}
