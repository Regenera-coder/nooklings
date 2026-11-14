import * as Phaser from 'phaser';
import { adjacentFreeCells, findPath, isFree, type Cell, type Content, type Placement, type ResidentDef, type RoomDef } from '@nooklings/core';
import { drawSnug, furnitureDepth, seatPoint } from './art';
import { footPoint, type RoomLayout } from './layout';

export interface World {
  room: RoomDef;
  content: Content;
  layout: RoomLayout;
  placements: readonly Placement[];
  blocked: boolean[][];
}

export type ResidentStatus = 'Idle' | 'Walking' | 'Sleeping' | 'Sitting';

type Mode =
  | { kind: 'idle'; until: number }
  | { kind: 'walk'; path: Cell[]; seg: number; restOn?: string }
  | { kind: 'hop'; from: { x: number; y: number }; uid: string; t: number; dir: 'on' | 'off'; to?: Cell }
  | { kind: 'rest'; uid: string; until: number; type: 'sleep' | 'sit' };

const HOP_SECONDS = 0.35;

function weightedPick<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    roll -= Math.max(0, w);
    if (roll <= 0) return key;
  }
  return entries[0]![0];
}

function randBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/**
 * One resident walking around a room. Movement states: idle, walk, sleep (plus sit).
 * Choices come from the resident's data definition, not per-character code.
 */
export class Resident {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly emote: Phaser.GameObjects.Text;
  private cell: Cell;
  /** Position in cell units while walking (fractional between cells). */
  private pos: { c: number; r: number };
  private mode: Mode;
  private pose: 'stand' | 'sleep' | 'sit' = 'stand';
  private facing = 1;
  private bobT = Math.random() * 10;
  private emoteUntil = 0;
  private zTimer = 0;
  private size = 40;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: ResidentDef,
    start: Cell,
    private readonly reducedMotion: boolean,
  ) {
    this.cell = { ...start };
    this.pos = { c: start.col, r: start.row };
    this.body = scene.add.graphics();
    this.emote = scene.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', stroke: '#4a2333', strokeThickness: 4 });
    this.emote.setOrigin(0.5, 1).setVisible(false);
    this.container = scene.add.container(0, 0, [this.body, this.emote]);
    this.mode = { kind: 'idle', until: 0 };
  }

  get status(): ResidentStatus {
    if (this.mode.kind === 'rest') return this.mode.type === 'sleep' ? 'Sleeping' : 'Sitting';
    if (this.mode.kind === 'walk' || this.mode.kind === 'hop') return 'Walking';
    return 'Idle';
  }

  get currentCell(): Cell {
    return { ...this.cell };
  }

  /** Screen bounds for tap hit-testing. */
  bounds(): { x0: number; y0: number; x1: number; y1: number } {
    const { x, y } = this.container;
    return { x0: x - this.size * 0.45, y0: y - this.size * 1.15, x1: x + this.size * 0.45, y1: y + 4 };
  }

  setLayout(layout: RoomLayout): void {
    this.size = layout.cw * 1.05;
    this.emote.setFontSize(Math.max(14, Math.round(layout.cw * 0.4)));
    this.emote.setY(-this.size * 1.15);
    this.redraw();
  }

  react(symbol: string, now: number): void {
    this.emote.setText(symbol).setVisible(true).setAlpha(1);
    this.emoteUntil = now + 1600;
    if (this.mode.kind === 'idle') this.mode = { kind: 'idle', until: now + 1200 };
  }

  /** Called after the room layout changes. Keeps the resident out of furniture. */
  onLayoutChanged(world: World, now: number): void {
    if (this.mode.kind === 'rest' || this.mode.kind === 'hop') {
      const uid = this.mode.uid;
      if (!world.placements.some((p) => p.uid === uid)) {
        this.snapToFree(world);
        this.mode = { kind: 'idle', until: now + 800 };
        this.react('?', now);
        return;
      }
      return;
    }
    if (!isFree(world.blocked, this.cell)) {
      this.snapToFree(world);
      this.mode = { kind: 'idle', until: now + 600 };
      return;
    }
    if (this.mode.kind === 'walk') {
      const target = this.mode.path[this.mode.path.length - 1];
      const restOn = this.mode.restOn;
      if (target && this.mode.path.some((c) => !isFree(world.blocked, c))) {
        this.pos = { c: this.cell.col, r: this.cell.row };
        const path = findPath(world.blocked, this.cell, target);
        this.mode = path ? { kind: 'walk', path, seg: 0, restOn } : { kind: 'idle', until: now + 500 };
      }
    }
  }

  update(dtMs: number, now: number, world: World): void {
    const dt = Math.min(dtMs, 100) / 1000;
    const l = world.layout;
    switch (this.mode.kind) {
      case 'idle':
        if (now >= this.mode.until) this.chooseNext(world, now);
        break;
      case 'walk': {
        const next = this.mode.path[this.mode.seg];
        if (!next) {
          this.arrive(world, now);
          break;
        }
        const dc = next.col - this.pos.c;
        const dr = next.row - this.pos.r;
        const dist = Math.hypot(dc, dr);
        const step = this.def.speed * dt;
        if (Math.abs(dc) > 0.01) this.facing = dc > 0 ? 1 : -1;
        if (dist <= step) {
          this.pos = { c: next.col, r: next.row };
          this.cell = { ...next };
          this.mode.seg += 1;
        } else {
          this.pos = { c: this.pos.c + (dc / dist) * step, r: this.pos.r + (dr / dist) * step };
        }
        break;
      }
      case 'hop': {
        this.mode.t += dt / HOP_SECONDS;
        if (this.mode.t >= 1) {
          if (this.mode.dir === 'on') {
            const p = world.placements.find((q) => q.uid === (this.mode as { uid: string }).uid);
            const def = p ? world.content.furniture[p.defId] : undefined;
            const type = def?.rest ?? 'sit';
            this.mode = { kind: 'rest', uid: this.mode.uid, type, until: now + (type === 'sleep' ? randBetween(7000, 11000) : randBetween(4000, 6500)) };
            this.setPose(type === 'sleep' ? 'sleep' : 'sit');
          } else {
            if (this.mode.to) {
              this.cell = { ...this.mode.to };
              this.pos = { c: this.cell.col, r: this.cell.row };
            }
            this.mode = { kind: 'idle', until: now + randBetween(800, 1600) };
          }
        }
        break;
      }
      case 'rest': {
        if (this.mode.type === 'sleep' && !this.reducedMotion) {
          this.zTimer += dtMs;
          if (this.zTimer > 1400) {
            this.zTimer = 0;
            this.floatZ();
          }
        }
        if (now >= this.mode.until) this.getOff(world, this.mode.uid);
        break;
      }
    }
    this.place(world, l, dt, now);
  }

  private place(world: World, l: RoomLayout, dt: number, now: number): void {
    let x: number;
    let y: number;
    let depth: number;
    const mode = this.mode;
    if (mode.kind === 'rest' || mode.kind === 'hop') {
      const p = world.placements.find((q) => q.uid === mode.uid);
      const def = p ? world.content.furniture[p.defId] : undefined;
      const seat = p && def ? seatPoint(def, p, l) : footPoint(l, this.cell.col, this.cell.row);
      const furnDepth = p && def ? furnitureDepth(def, p, l) : 0;
      if (mode.kind === 'hop') {
        const t = Math.min(1, mode.t);
        const fromPt = mode.dir === 'on' ? mode.from : seat;
        const toPt = mode.dir === 'on' ? seat : mode.to ? footPoint(l, mode.to.col, mode.to.row) : seat;
        const arc = this.reducedMotion ? 0 : Math.sin(t * Math.PI) * l.cw * 0.35;
        x = fromPt.x + (toPt.x - fromPt.x) * t;
        y = fromPt.y + (toPt.y - fromPt.y) * t - arc;
        depth = Math.max(furnDepth + 1, 100 + y);
      } else {
        x = seat.x;
        y = seat.y;
        depth = furnDepth + 1;
      }
    } else {
      const fp = footPoint(l, this.pos.c, this.pos.r);
      x = fp.x;
      y = fp.y;
      depth = 100 + y;
      if (mode.kind === 'walk' && !this.reducedMotion) {
        this.bobT += dt * 12;
        y -= Math.abs(Math.sin(this.bobT)) * l.cw * 0.06;
      }
    }
    this.container.setPosition(x, y).setDepth(depth);
    this.body.setScale(this.facing, 1);
    if (this.emote.visible && now > this.emoteUntil) this.emote.setVisible(false);
  }

  private setPose(pose: 'stand' | 'sleep' | 'sit'): void {
    if (this.pose === pose) return;
    this.pose = pose;
    this.redraw();
  }

  private redraw(): void {
    drawSnug(this.body, this.size, this.pose);
  }

  private floatZ(): void {
    const z = this.scene.add.text(this.container.x + this.size * 0.2, this.container.y - this.size * 0.9, 'z', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(12, Math.round(this.size * 0.3))}px`,
      color: '#e9e2ff',
      stroke: '#3b2a40',
      strokeThickness: 3,
    });
    z.setDepth(9000);
    this.scene.tweens.add({ targets: z, y: z.y - this.size * 0.6, x: z.x + this.size * 0.2, alpha: 0, duration: 1600, onComplete: () => z.destroy() });
  }

  private chooseNext(world: World, now: number): void {
    const choice = weightedPick(this.def.behaviour);
    if (choice === 'rest' && this.tryRest(world, now)) return;
    if (choice === 'wander' || choice === 'rest') {
      if (this.tryWander(world)) return;
    }
    this.mode = { kind: 'idle', until: now + randBetween(1800, 3800) };
  }

  private tryWander(world: World): boolean {
    const options: Cell[] = [];
    for (let r = 0; r < world.room.rows; r++) {
      for (let c = 0; c < world.room.cols; c++) {
        const d = Math.abs(c - this.cell.col) + Math.abs(r - this.cell.row);
        if (d >= 2 && d <= 7 && isFree(world.blocked, { col: c, row: r })) options.push({ col: c, row: r });
      }
    }
    while (options.length > 0) {
      const target = options.splice(Math.floor(Math.random() * options.length), 1)[0]!;
      const path = findPath(world.blocked, this.cell, target);
      if (path && path.length > 0) {
        this.mode = { kind: 'walk', path, seg: 0 };
        return true;
      }
    }
    return false;
  }

  private tryRest(world: World, now: number): boolean {
    const spots = world.placements
      .map((p) => ({ p, def: world.content.furniture[p.defId] }))
      .filter((x): x is { p: Placement; def: NonNullable<typeof x.def> } => !!x.def?.rest)
      .sort((a, b) => Number(b.def.rest === this.def.favouriteRest) - Number(a.def.rest === this.def.favouriteRest));
    for (const { p, def } of spots) {
      const near = adjacentFreeCells(world.blocked, def, p.col, p.row);
      let best: Cell[] | null = null;
      for (const cell of near) {
        const path = findPath(world.blocked, this.cell, cell);
        if (path && (!best || path.length < best.length)) best = path;
      }
      if (best) {
        this.mode = best.length === 0 ? { kind: 'walk', path: [], seg: 0, restOn: p.uid } : { kind: 'walk', path: best, seg: 0, restOn: p.uid };
        void now;
        return true;
      }
    }
    return false;
  }

  private arrive(world: World, now: number): void {
    if (this.mode.kind !== 'walk') return;
    const restOn = this.mode.restOn;
    if (restOn && world.placements.some((p) => p.uid === restOn)) {
      const from = footPoint(world.layout, this.cell.col, this.cell.row);
      this.mode = { kind: 'hop', from, uid: restOn, t: 0, dir: 'on' };
      return;
    }
    this.mode = { kind: 'idle', until: now + randBetween(1200, 3200) };
  }

  private getOff(world: World, uid: string): void {
    const p = world.placements.find((q) => q.uid === uid);
    const def = p ? world.content.furniture[p.defId] : undefined;
    this.setPose('stand');
    if (!p || !def) {
      this.snapToFree(world);
      this.mode = { kind: 'idle', until: 0 };
      return;
    }
    const near = adjacentFreeCells(world.blocked, def, p.col, p.row);
    const to = near.find((c) => c.row > p.row) ?? near[0] ?? this.nearestFree(world);
    this.mode = { kind: 'hop', from: { x: 0, y: 0 }, uid, t: 0, dir: 'off', to };
  }

  private nearestFree(world: World): Cell {
    let best: Cell = { ...world.room.door };
    let bestD = Infinity;
    for (let r = 0; r < world.room.rows; r++) {
      for (let c = 0; c < world.room.cols; c++) {
        if (!isFree(world.blocked, { col: c, row: r })) continue;
        const d = Math.abs(c - this.pos.c) + Math.abs(r - this.pos.r);
        if (d < bestD) {
          bestD = d;
          best = { col: c, row: r };
        }
      }
    }
    return best;
  }

  private snapToFree(world: World): void {
    this.setPose('stand');
    this.cell = this.nearestFree(world);
    this.pos = { c: this.cell.col, r: this.cell.row };
  }
}
