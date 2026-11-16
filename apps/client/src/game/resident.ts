import * as Phaser from 'phaser';
import { adjacentFreeCells, findPath, isFree, type Cell, type Content, type Placement, type ResidentDef, type RoomDef } from '@nooklings/core';
import { charKey, footX, type Pose } from '../assets';
import { drawResident, furnitureDepth, seatPoint } from './art';
import { footPoint, type RoomLayout } from './layout';

export interface World {
  room: RoomDef;
  content: Content;
  layout: RoomLayout;
  placements: readonly Placement[];
  blocked: boolean[][];
  /** Shared reservations so residents don't pick the same spot: key -> resident id. */
  claims: Map<string, string>;
  /** Where every resident currently stands. */
  residentCells: () => Array<{ id: string; cell: Cell }>;
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
  private readonly sprite: Phaser.GameObjects.Image;
  private decorated = false;
  private costume: string | null = null;
  private happyUntil = 0;
  private shownKey: string | null = null;
  /** -1 when the sleep pose must be mirrored so the head rests on the bed's pillow end. */
  private restFlip = 1;
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
  private claimKeys: string[] = [];

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
    this.sprite = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);
    this.container = scene.add.container(0, 0, [this.body, this.sprite, this.emote]);
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

  /** Where a companion should follow: the resident's feet, the way they face and their size. */
  followPoint(): { x: number; y: number; facing: number; size: number } {
    return { x: this.container.x, y: this.container.y, facing: this.facing, size: this.size };
  }

  setLayout(layout: RoomLayout): void {
    this.size = layout.cw * 1.05;
    this.emote.setFontSize(Math.max(14, Math.round(layout.cw * 0.4)));
    this.emote.setY(-this.size * 1.15);
    this.redraw();
  }

  setDecorated(on: boolean): void {
    if (this.decorated === on) return;
    this.decorated = on;
    this.redraw();
  }

  setCostume(costume: string | null): void {
    if (this.costume === costume) return;
    this.costume = costume;
    this.redraw();
  }

  /** Walk in through the doorway to a free spot (used when a new resident joins). */
  enterFrom(door: Cell, world: World, now: number): void {
    this.cell = { ...door };
    this.pos = { c: door.col, r: door.row };
    const target = { col: Math.min(world.room.cols - 2, Math.max(1, door.col - 3)), row: Math.min(world.room.rows - 1, door.row + 2) };
    let best: Cell[] | null = null;
    for (let r = 0; r < world.room.rows && !best; r++) {
      for (let c = 0; c < world.room.cols; c++) {
        const cell = { col: (target.col + c) % world.room.cols, row: (target.row + r) % world.room.rows };
        if (!isFree(world.blocked, cell)) continue;
        const path = findPath(world.blocked, this.cell, cell);
        if (path && path.length > 0) { best = path; break; }
      }
    }
    this.mode = best ? { kind: 'walk', path: best, seg: 0 } : { kind: 'idle', until: now + 500 };
    this.react('!', now);
  }

  react(symbol: string, now: number): void {
    this.emote.setText(symbol).setVisible(true).setAlpha(1);
    this.emoteUntil = now + 1600;
    this.happyUntil = now + 1200;
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
            const bed = world.placements.find((q) => q.uid === (this.mode as { uid: string }).uid);
            // Sleep art has the head on the right; the bed's pillow is on the left unless the bed is flipped.
            this.restFlip = bed?.flipped ? 1 : -1;
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
        if (this.mode.type === 'sleep' && !this.reducedMotion && this.container.visible) {
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
      const seat = p && def ? seatPoint(this.scene, def, p, l) : footPoint(l, this.cell.col, this.cell.row);
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
        // Step cadence follows walking speed: two steps per cycle, a small hop on each.
        this.bobT += dt * 5.5 * this.def.speed;
        y -= Math.abs(Math.sin(this.bobT)) * l.cw * 0.09;
      }
    }
    this.container.setPosition(x, y).setDepth(depth);
    this.body.setScale(this.facing, 1);
    this.updateSprite(mode.kind === 'walk', dt, now);
    if (this.emote.visible && now > this.emoteUntil) this.emote.setVisible(false);
  }

  private setPose(pose: 'stand' | 'sleep' | 'sit'): void {
    if (this.pose === pose) return;
    this.pose = pose;
    this.redraw();
  }

  private redraw(): void {
    drawResident(this.body, this.def, this.size, this.pose, this.decorated);
    this.shownKey = null;
    this.updateSprite(false, 0, 0);
  }

  /**
   * Uses production art when it exists, otherwise the placeholder drawing.
   * Poses are single images: walking alternates the walk pose (foot lifted) and the idle pose
   * (feet down) on each step, with a waddle and a hop, flipped when moving left. Front-facing poses (idle, happy, sit) are never flipped,
   * so accessories stay on their side. Sleeping faces the bed's pillow end.
   */
  private updateSprite(walking: boolean, _dt: number, now: number): void {
    const idleKey = charKey(this.def.id, 'idle', false);
    if (!idleKey || !this.scene.textures.exists(idleKey)) {
      this.sprite.setVisible(false);
      this.body.setVisible(true);
      this.body.setRotation(walking && !this.reducedMotion ? Math.sin(this.bobT) * 0.09 : 0);
      return;
    }
    let pose: Pose = 'idle';
    if (this.pose === 'sleep') pose = 'sleep';
    else if (this.pose === 'sit') pose = 'sit';
    else if (now < this.happyUntil) pose = 'happy';
    else if (walking) pose = 'walk';
    const key = charKey(this.def.id, pose, this.decorated, this.costume) ?? idleKey;
    if (key !== this.shownKey && this.scene.textures.exists(key)) {
      this.sprite.setTexture(key);
      this.shownKey = key;
    }
    // Every pose image shares one canvas: feet at 96% down, standing height = 80% of the canvas.
    const src = this.scene.textures.get(key).getSourceImage() as { height: number };
    const scale = (this.size * 1.12) / (Math.max(1, src.height) * 0.8);
    let flip = 1;
    if (pose === 'walk') flip = this.facing;
    if (pose === 'sleep') flip = this.restFlip;
    let sx = 1;
    let sy = 1;
    let tilt = 0;
    if (walking && pose === 'walk' && !this.reducedMotion) {
      // Two-frame step: lifted-leg walk pose while in the air, feet-down idle pose on each footfall,
      // with a side-to-side waddle and a little squash as each foot lands.
      const lift = Math.abs(Math.sin(this.bobT));
      // Alternate feet on each step when a second walk frame exists: walk, feet down, walk2, feet down.
      const stepN = Math.floor(this.bobT / Math.PI);
      const liftedKey = stepN % 2 === 0 ? key : charKey(this.def.id, 'walk2', this.decorated, this.costume) ?? key;
      const stepKey = lift > 0.35 ? liftedKey : charKey(this.def.id, 'idle', this.decorated, this.costume) ?? key;
      if (stepKey !== this.shownKey && this.scene.textures.exists(stepKey)) {
        this.sprite.setTexture(stepKey);
        this.shownKey = stepKey;
      }
      tilt = Math.sin(this.bobT) * 0.09;
      const land = 1 - lift;
      sy = 1 - land * 0.06;
      sx = 1 + land * 0.04;
    }
    this.sprite.setOrigin(footX(this.sprite.texture.key), 0.96).setScale(scale * flip * sx, scale * sy).setRotation(tilt).setVisible(true);
    this.body.setVisible(false);
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

  private claim(world: World, key: string): void {
    world.claims.set(key, this.def.id);
    this.claimKeys.push(key);
  }

  private releaseClaims(world: World): void {
    for (const k of this.claimKeys) if (world.claims.get(k) === this.def.id) world.claims.delete(k);
    this.claimKeys = [];
  }

  private takenByOther(world: World, key: string): boolean {
    const owner = world.claims.get(key);
    return owner !== undefined && owner !== this.def.id;
  }

  private chooseNext(world: World, now: number): void {
    this.releaseClaims(world);
    const choice = weightedPick(this.def.behaviour);
    if (choice === 'rest' && this.tryRest(world, now)) return;
    if (choice === 'wander' || choice === 'rest') {
      if (this.tryWander(world)) return;
    }
    this.mode = { kind: 'idle', until: now + randBetween(1800, 3800) };
  }

  private tryWander(world: World): boolean {
    const others = new Set(world.residentCells().filter((x) => x.id !== this.def.id).map((x) => `${x.cell.col},${x.cell.row}`));
    const options: Cell[] = [];
    for (let r = 0; r < world.room.rows; r++) {
      for (let c = 0; c < world.room.cols; c++) {
        const d = Math.abs(c - this.cell.col) + Math.abs(r - this.cell.row);
        const key = `${c},${r}`;
        if (others.has(key) || this.takenByOther(world, `cell:${key}`)) continue;
        if (d >= 2 && d <= 7 && isFree(world.blocked, { col: c, row: r })) options.push({ col: c, row: r });
      }
    }
    while (options.length > 0) {
      const target = options.splice(Math.floor(Math.random() * options.length), 1)[0]!;
      const path = findPath(world.blocked, this.cell, target);
      if (path && path.length > 0) {
        this.claim(world, `cell:${target.col},${target.row}`);
        this.mode = { kind: 'walk', path, seg: 0 };
        return true;
      }
    }
    return false;
  }

  private tryRest(world: World, now: number): boolean {
    const spots = world.placements
      .map((p) => ({ p, def: world.content.furniture[p.defId] }))
      .filter((x): x is { p: Placement; def: NonNullable<typeof x.def> } => !!x.def?.rest && !this.takenByOther(world, `rest:${x.p.uid}`))
      .sort((a, b) => Number(b.def.rest === this.def.favouriteRest) - Number(a.def.rest === this.def.favouriteRest));
    for (const { p, def } of spots) {
      const near = adjacentFreeCells(world.blocked, def, p.col, p.row);
      let best: Cell[] | null = null;
      for (const cell of near) {
        const path = findPath(world.blocked, this.cell, cell);
        if (path && (!best || path.length < best.length)) best = path;
      }
      if (best) {
        this.claim(world, `rest:${p.uid}`);
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
    this.releaseClaims(world);
    this.setPose('stand');
    this.cell = this.nearestFree(world);
    this.pos = { c: this.cell.col, r: this.cell.row };
  }
}
