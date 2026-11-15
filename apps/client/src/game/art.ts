import * as Phaser from 'phaser';
import type { FurnitureDef, Placement, ResidentDef } from '@nooklings/core';
import type { RoomLayout } from './layout';

/**
 * PLACEHOLDER ART. Everything here is drawn with simple shapes so the room, depth
 * sorting and build mode can be judged before production art exists (Milestone B).
 * Each function draws in local coordinates; the caller positions the container.
 */

type G = Phaser.GameObjects.Graphics;

export interface DrawnItem {
  container: Phaser.GameObjects.Container;
  /** Screen-space bounds used for tap hit-testing. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  depth: number;
}

const WOOD = 0xb98a5e;
const WOOD_DARK = 0x8f6440;
const WOOD_LIGHT = 0xd6aa7c;

function box(g: G, x0: number, x1: number, backY: number, frontY: number, h: number, top: number, front: number, r = 3): void {
  const w = x1 - x0;
  g.fillStyle(front, 1);
  g.fillRoundedRect(x0, frontY - h, w, Math.max(2, h), r);
  g.fillStyle(top, 1);
  g.fillRoundedRect(x0, backY - h, w, Math.max(2, frontY - backY), r);
}

/** Where the seat or mattress sits, as a fraction of the furniture image height from its base. */
const SEAT_FRACTION: Record<string, number> = { cloud_bed: 0.42, cozy_sofa: 0.4 };
const FLOOR_SINK = 0.12; // image base sits slightly into the cell row so legs read as standing on the floor

/**
 * On-screen size of a furniture image: fitted to its footprint width, but capped so
 * wall items stay on the wall and tall floor items stay in proportion to residents.
 */
export function furnitureImageSize(def: FurnitureDef, l: RoomLayout, texW: number, texH: number): { w: number; h: number } {
  if (def.layer === 'rug') return { w: def.w * l.cw, h: def.h * l.ch * 1.05 };
  const widthFrac = def.w === 1 ? 0.9 : 0.94;
  let scale = (def.w * l.cw * widthFrac) / texW;
  const maxH = def.layer === 'wall' ? l.wallH * 0.82 : l.cw * 2.3;
  if (texH * scale > maxH) scale = maxH / texH;
  return { w: texW * scale, h: texH * scale };
}

/** Height of the seat/top surface above the floor, for residents who sit or sleep on it. */
export function seatHeight(scene: Phaser.Scene, def: FurnitureDef, l: RoomLayout): number {
  const key = `furn_${def.id}`;
  if (scene.textures.exists(key)) {
    const src = scene.textures.get(key).getSourceImage() as { width: number; height: number };
    const { h } = furnitureImageSize(def, l, src.width, src.height);
    return h * (SEAT_FRACTION[def.id] ?? 0.4) - l.ch * FLOOR_SINK;
  }
  if (def.id === 'cloud_bed') return l.cw * 0.42;
  if (def.id === 'cozy_sofa') return l.cw * 0.38;
  return l.cw * 0.4;
}

/** Where a resident's feet go when resting on a piece of furniture. */
export function seatPoint(scene: Phaser.Scene, def: FurnitureDef, p: Placement, l: RoomLayout): { x: number; y: number } {
  const x = l.ox + (p.col + def.w / 2) * l.cw;
  const y = l.floorTop + (p.row + def.h * 0.7) * l.ch - seatHeight(scene, def, l);
  return { x, y };
}

export function furnitureDepth(def: FurnitureDef, p: Pick<Placement, 'row'>, l: RoomLayout): number {
  if (def.layer === 'wall') return 5;
  if (def.layer === 'rug') return 10 + p.row;
  return 100 + l.floorTop + (p.row + def.h) * l.ch;
}

export function drawFurniture(
  scene: Phaser.Scene,
  def: FurnitureDef,
  p: Pick<Placement, 'col' | 'row' | 'flipped'>,
  l: RoomLayout,
): DrawnItem {
  const imageKey = `furn_${def.id}`;
  if (scene.textures.exists(imageKey)) return drawFurnitureImage(scene, def, p, l, imageKey);
  const g = scene.add.graphics();
  const c = scene.add.container(0, 0, [g]);
  const { cw, ch } = l;
  const wpx = def.w * cw;
  const dpx = def.h * ch;
  const pad = cw * 0.08;
  const x0 = -wpx / 2 + pad;
  const x1 = wpx / 2 - pad;
  const back = -dpx + ch * 0.18;
  const front = -ch * 0.08;
  let top = 0;

  if (def.layer === 'wall') {
    const cx = l.ox + (p.col + def.w / 2) * cw;
    const cy = l.wallTop + l.wallH * 0.48;
    c.setPosition(cx, cy);
    const s = cw;
    switch (def.id) {
      case 'round_window': {
        g.fillStyle(WOOD_DARK, 1).fillCircle(0, 0, s * 0.62);
        g.fillStyle(0x2f3f78, 1).fillCircle(0, 0, s * 0.52);
        g.fillStyle(0x4a5aa0, 1).fillCircle(0, s * 0.18, s * 0.4);
        g.fillStyle(0xfff2b8, 1).fillCircle(s * 0.18, -s * 0.18, s * 0.12);
        g.fillStyle(0x2f3f78, 1).fillCircle(s * 0.23, -s * 0.22, s * 0.1);
        g.fillStyle(0xffffff, 0.9).fillCircle(-s * 0.2, -s * 0.1, 2).fillCircle(-s * 0.05, -s * 0.3, 1.5).fillCircle(-s * 0.3, s * 0.12, 1.5);
        g.lineStyle(3, WOOD_DARK, 1).lineBetween(-s * 0.52, 0, s * 0.52, 0).lineBetween(0, -s * 0.52, 0, s * 0.52);
        top = -s * 0.62;
        break;
      }
      case 'moon_lantern': {
        g.lineStyle(2, 0x6b5a4a, 1).lineBetween(0, -l.wallH * 0.45, 0, -s * 0.25);
        g.fillStyle(0xfff0a8, 0.25).fillCircle(0, 0, s * 0.42);
        g.fillStyle(0xffe38a, 1).fillCircle(0, 0, s * 0.24);
        g.fillStyle(0xf6ead7, 1).fillCircle(s * 0.1, -s * 0.06, s * 0.2);
        top = -l.wallH * 0.45;
        break;
      }
      case 'soft_curtains': {
        g.fillStyle(WOOD_DARK, 1).fillRoundedRect(-wpx / 2 + pad, -s * 0.62, wpx - pad * 2, 5, 2);
        g.fillStyle(0xf2b5c4, 1);
        g.fillTriangle(-wpx / 2 + pad, -s * 0.58, -s * 0.05, -s * 0.58, -wpx / 2 + pad + 4, s * 0.62);
        g.fillTriangle(wpx / 2 - pad, -s * 0.58, s * 0.05, -s * 0.58, wpx / 2 - pad - 4, s * 0.62);
        g.fillStyle(0xe59bb0, 1).fillRect(-wpx / 2 + pad + 2, s * 0.1, 8, 4).fillRect(wpx / 2 - pad - 10, s * 0.1, 8, 4);
        top = -s * 0.62;
        break;
      }
      case 'picture_frame': {
        g.fillStyle(WOOD, 1).fillRoundedRect(-s * 0.32, -s * 0.38, s * 0.64, s * 0.62, 3);
        g.fillStyle(0xfdf3e3, 1).fillRect(-s * 0.24, -s * 0.3, s * 0.48, s * 0.46);
        g.fillStyle(0xf2b5c4, 1).fillCircle(-s * 0.06, -s * 0.1, s * 0.07).fillCircle(s * 0.06, -s * 0.1, s * 0.07);
        g.fillTriangle(-s * 0.13, -s * 0.07, s * 0.13, -s * 0.07, 0, s * 0.08);
        top = -s * 0.38;
        break;
      }
      default: {
        // Labelled stand-in until production art arrives, tinted by its main atmosphere tag.
        const tint = tagTint(def);
        g.fillStyle(tint, 1).fillRoundedRect(-wpx / 2 + pad, -s * 0.4, wpx - pad * 2, s * 0.72, 6);
        g.fillStyle(0xffffff, 0.35).fillRoundedRect(-wpx / 2 + pad + 3, -s * 0.36, wpx - pad * 2 - 6, s * 0.2, 4);
        c.add(label(scene, def.name, wpx - pad * 2, s));
        top = -s * 0.4;
      }
    }
    if (p.flipped) g.setScale(-1, 1);
    return {
      container: c,
      bounds: { x0: cx - wpx / 2, y0: cy + top, x1: cx + wpx / 2, y1: cy + Math.abs(top) },
      depth: 5,
    };
  }

  const cx = l.ox + (p.col + def.w / 2) * cw;
  const fy = l.floorTop + (p.row + def.h) * ch;
  c.setPosition(cx, fy);

  if (def.layer === 'rug') {
    g.fillStyle(0xb7a6e0, 1).fillEllipse(0, -dpx / 2, wpx - pad, dpx - pad * 0.6);
    g.fillStyle(0xcfc2ef, 1).fillEllipse(0, -dpx / 2, (wpx - pad) * 0.78, (dpx - pad * 0.6) * 0.7);
    g.fillStyle(0xfff2b8, 1);
    for (const [sx, sy] of [[-0.25, -0.35], [0.2, -0.6], [0.05, -0.25], [-0.1, -0.7], [0.3, -0.38]] as const) {
      g.fillCircle(sx * wpx, sy * dpx, Math.max(2, cw * 0.05));
    }
    return { container: c, bounds: { x0: cx - wpx / 2, y0: fy - dpx, x1: cx + wpx / 2, y1: fy }, depth: furnitureDepth(def, p, l) };
  }

  let h = cw * 0.5;
  switch (def.id) {
    case 'cloud_bed': {
      h = seatHeight(scene, def, l);
      box(g, x0, x1, back, front, h * 0.55, WOOD_LIGHT, WOOD);
      g.fillStyle(WOOD_DARK, 1).fillRoundedRect(x0 - 2, back - h * 1.6, cw * 0.16, h * 1.6 + (front - back), 3);
      box(g, x0 + 2, x1 - 2, back, front - 2, h, 0xd9cdf2, 0xb7a6e0, 5);
      g.fillStyle(0xffffff, 1).fillCircle(x0 + cw * 0.38, back - h + 2, cw * 0.17).fillCircle(x0 + cw * 0.58, back - h, cw * 0.14);
      g.fillStyle(0xa99ad6, 1).fillRoundedRect(x0 + wpx * 0.45, back - h, x1 - (x0 + wpx * 0.45) - 2, front - back + h * 0.4, 4);
      top = back - h * 1.6;
      break;
    }
    case 'cozy_sofa': {
      h = seatHeight(scene, def, l);
      box(g, x0, x1, back, front, h, 0xf3c7a6, 0xe2a882, 5);
      g.fillStyle(0xd99872, 1).fillRoundedRect(x0, back - h - cw * 0.42, x1 - x0, cw * 0.46, 6);
      g.fillStyle(0xe2a882, 1).fillRoundedRect(x0 - 3, back - h - cw * 0.12, cw * 0.2, front - back + h + cw * 0.12, 5);
      g.fillStyle(0xe2a882, 1).fillRoundedRect(x1 - cw * 0.2 + 3, back - h - cw * 0.12, cw * 0.2, front - back + h + cw * 0.12, 5);
      g.fillStyle(0xfff2b8, 1).fillCircle(x0 + cw * 0.42, back - h - cw * 0.05, cw * 0.12);
      top = back - h - cw * 0.42;
      break;
    }
    case 'bookshelf': {
      h = cw * 1.55;
      box(g, x0, x1, back + ch * 0.25, front, h, WOOD_LIGHT, WOOD);
      const colors = [0xa99ad6, 0xf2b5c4, 0x8fc7b1, 0xffd27a, 0x9bb4e8, 0xe59bb0];
      for (let s = 0; s < 3; s++) {
        const sy = front - h + 6 + s * ((h - 10) / 3);
        g.fillStyle(WOOD_DARK, 1).fillRect(x0 + 4, sy + (h - 10) / 3 - 4, x1 - x0 - 8, 3);
        let bx = x0 + 6;
        let i = s * 2;
        while (bx < x1 - 10) {
          const bw = cw * (0.08 + ((i * 37) % 5) * 0.015);
          const bh = (h - 10) / 3 - 8 - ((i * 13) % 3) * 2;
          g.fillStyle(colors[i % colors.length]!, 1).fillRect(bx, sy + (h - 10) / 3 - 4 - bh, bw, bh);
          bx += bw + 2;
          i++;
        }
      }
      top = back + ch * 0.25 - h;
      break;
    }
    case 'workbench': {
      h = cw * 0.6;
      g.fillStyle(WOOD_DARK, 1).fillRect(x0 + 4, front - h, 5, h).fillRect(x1 - 9, front - h, 5, h);
      box(g, x0, x1, back, front - h * 0.75, h * 0.25, WOOD_LIGHT, WOOD);
      g.fillStyle(0x9aa3ad, 1).fillRoundedRect(x0 + cw * 0.2, back - h - 6, cw * 0.35, 6, 2);
      g.fillStyle(0xc9a227, 1).fillCircle(x1 - cw * 0.35, back - h - 4, cw * 0.1);
      g.fillStyle(0x6d4b33, 1).fillRect(x1 - cw * 0.65, back - h - 12, 4, 12);
      top = back - h - 14;
      break;
    }
    case 'floor_lamp': {
      h = cw * 1.45;
      g.fillStyle(0xfff0a8, 0.22).fillCircle(0, front - h + cw * 0.1, cw * 0.65);
      g.fillStyle(WOOD_DARK, 1).fillEllipse(0, front - 3, cw * 0.4, cw * 0.14);
      g.fillStyle(0x6b5a4a, 1).fillRect(-2, front - h + cw * 0.2, 4, h - cw * 0.2);
      g.fillStyle(0xffd27a, 1).fillTriangle(-cw * 0.3, front - h + cw * 0.32, cw * 0.3, front - h + cw * 0.32, 0, front - h - cw * 0.08);
      g.fillStyle(0xfff2b8, 1).fillRect(-cw * 0.3, front - h + cw * 0.28, cw * 0.6, cw * 0.06);
      top = front - h - cw * 0.3;
      break;
    }
    case 'side_table': {
      h = cw * 0.45;
      g.fillStyle(WOOD_DARK, 1).fillRect(-3, front - h, 6, h);
      g.fillStyle(WOOD_LIGHT, 1).fillEllipse(0, front - h, wpx * 0.7, ch * 0.5);
      g.fillStyle(0xffffff, 1).fillRoundedRect(-cw * 0.08, front - h - cw * 0.16, cw * 0.16, cw * 0.14, 3);
      top = front - h - cw * 0.2;
      break;
    }
    case 'potted_fern': {
      h = cw * 0.35;
      g.fillStyle(0x6fae84, 1).fillCircle(-cw * 0.14, front - h - cw * 0.18, cw * 0.18).fillCircle(cw * 0.14, front - h - cw * 0.2, cw * 0.18);
      g.fillStyle(0x8fc7b1, 1).fillCircle(0, front - h - cw * 0.34, cw * 0.2);
      g.fillStyle(0xd88a6a, 1).fillRoundedRect(-cw * 0.2, front - h, cw * 0.4, h, 4);
      top = front - h - cw * 0.55;
      break;
    }
    case 'toy_chest': {
      h = cw * 0.48;
      box(g, x0 + 2, x1 - 2, back + ch * 0.1, front, h, 0xf2b5c4, 0xe59bb0, 4);
      g.fillStyle(0xfff2b8, 1).fillCircle(-cw * 0.12, front - h * 0.5, cw * 0.08);
      g.fillStyle(WOOD_DARK, 1).fillRect(x0 + 2, front - h * 0.78, x1 - x0 - 4, 3);
      top = back + ch * 0.1 - h;
      break;
    }
    default: {
      const tint = tagTint(def);
      box(g, x0, x1, back, front, h, lighten(tint), tint);
      const t = label(scene, def.name, x1 - x0, cw);
      t.setY(front - h * 0.5);
      c.add(t);
      top = back - h;
    }
  }
  if (p.flipped) g.setScale(-1, 1);
  return {
    container: c,
    bounds: { x0: cx - wpx / 2, y0: fy + top, x1: cx + wpx / 2, y1: fy },
    depth: furnitureDepth(def, p, l),
  };
}

/** Production furniture art, scaled with furnitureImageSize and anchored like the placeholders. */
function drawFurnitureImage(
  scene: Phaser.Scene,
  def: FurnitureDef,
  p: Pick<Placement, 'col' | 'row' | 'flipped'>,
  l: RoomLayout,
  key: string,
): DrawnItem {
  const img = scene.add.image(0, 0, key);
  const c = scene.add.container(0, 0, [img]);
  const { w, h } = furnitureImageSize(def, l, img.width, img.height);
  img.setDisplaySize(w, h).setFlipX(p.flipped);
  const cx = l.ox + (p.col + def.w / 2) * l.cw;
  if (def.layer === 'wall') {
    const cy = l.wallTop + l.wallH * 0.46;
    c.setPosition(cx, cy);
    return { container: c, bounds: { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 }, depth: 5 };
  }
  if (def.layer === 'rug') {
    const cy = l.floorTop + (p.row + def.h / 2) * l.ch;
    c.setPosition(cx, cy);
    return { container: c, bounds: { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 }, depth: furnitureDepth(def, p, l) };
  }
  const fy = l.floorTop + (p.row + def.h) * l.ch - l.ch * FLOOR_SINK;
  img.setOrigin(0.5, 1);
  c.setPosition(cx, fy);
  return { container: c, bounds: { x0: cx - w / 2, y0: fy - h, x1: cx + w / 2, y1: fy }, depth: furnitureDepth(def, p, l) };
}

/** Placeholder Snug: cream plush body, long floppy ears, lavender star nightcap, closed eyes. */
function drawSnug(g: G, s: number, pose: 'stand' | 'sleep' | 'sit'): void {
  const cream = 0xf6ead7;
  const creamDark = 0xe6d3b8;
  const cap = 0xa99ad6;
  const lie = pose === 'sleep';
  const sq = lie ? 0.82 : 1;
  g.fillStyle(0x000000, 0.18).fillEllipse(0, 0, s * 0.62, s * 0.14);
  g.fillStyle(creamDark, 1)
    .fillEllipse(-s * 0.29, -s * 0.46 * sq, s * 0.17, s * 0.52 * sq)
    .fillEllipse(s * 0.29, -s * 0.46 * sq, s * 0.17, s * 0.52 * sq);
  g.fillStyle(cream, 1).fillEllipse(0, -s * 0.24 * sq, s * 0.56, s * 0.46 * sq);
  g.fillStyle(cream, 1).fillCircle(0, -s * 0.6 * sq, s * 0.28);
  g.fillStyle(cap, 1).fillTriangle(-s * 0.27, -s * 0.7 * sq, s * 0.27, -s * 0.7 * sq, s * 0.24, -s * 1.08 * sq);
  g.fillStyle(0xfff2b8, 1).fillCircle(-s * 0.06, -s * 0.84 * sq, s * 0.035).fillCircle(s * 0.12, -s * 0.95 * sq, s * 0.03);
  g.fillStyle(0xfdf6ea, 1).fillRoundedRect(-s * 0.29, -s * 0.74 * sq, s * 0.58, s * 0.08, s * 0.04);
  g.fillStyle(0xffffff, 1).fillCircle(s * 0.26, -s * 1.08 * sq, s * 0.075);
  g.lineStyle(Math.max(1.5, s * 0.03), 0x5a4552, 1);
  const ey = -s * 0.56 * sq;
  for (const ex of [-s * 0.1, s * 0.1]) {
    g.beginPath();
    g.arc(ex, ey, s * 0.05, Math.PI * 0.15, Math.PI * 0.85, false);
    g.strokePath();
  }
  g.fillStyle(0xf2b5c4, 0.8).fillEllipse(-s * 0.17, -s * 0.5 * sq, s * 0.08, s * 0.045).fillEllipse(s * 0.17, -s * 0.5 * sq, s * 0.08, s * 0.045);
  if (!lie) {
    g.fillStyle(0xffffff, 1).fillCircle(-s * 0.06, -s * 0.26, s * 0.1).fillCircle(s * 0.07, -s * 0.24, s * 0.09).fillCircle(0, -s * 0.31, s * 0.09);
  }
}

export type DrawPose = 'stand' | 'sleep' | 'sit';

const hex = (c: string) => Number.parseInt(c.replace('#', ''), 16);

/** Placeholder Tinker: round warm-brown maker, cap with ear flaps, big brass goggles, tool belt. */
function drawTinker(g: G, s: number, pose: DrawPose): void {
  const lie = pose === 'sleep';
  const sq = lie ? 0.8 : 1;
  const brown = 0xa87a55;
  g.fillStyle(0x000000, 0.18).fillEllipse(0, 0, s * 0.6, s * 0.14);
  g.fillStyle(0x6f7f4a, 1).fillEllipse(0, -s * 0.24 * sq, s * 0.56, s * 0.46 * sq);
  g.fillStyle(0x6d4b33, 1).fillRect(-s * 0.27, -s * 0.18 * sq, s * 0.54, s * 0.07);
  g.fillStyle(0xc9a227, 1).fillRect(-s * 0.04, -s * 0.18 * sq, s * 0.08, s * 0.07);
  g.fillStyle(0x7a5236, 1).fillEllipse(-s * 0.27, -s * 0.55 * sq, s * 0.14, s * 0.24 * sq).fillEllipse(s * 0.27, -s * 0.55 * sq, s * 0.14, s * 0.24 * sq);
  g.fillStyle(brown, 1).fillCircle(0, -s * 0.6 * sq, s * 0.27);
  g.fillStyle(0x7a5236, 1).fillEllipse(0, -s * 0.78 * sq, s * 0.56, s * 0.24);
  g.fillStyle(0xc9a227, 1).fillCircle(-s * 0.1, -s * 0.8 * sq, s * 0.09).fillCircle(s * 0.1, -s * 0.8 * sq, s * 0.09);
  g.fillStyle(0xdff0ff, 1).fillCircle(-s * 0.1, -s * 0.8 * sq, s * 0.055).fillCircle(s * 0.1, -s * 0.8 * sq, s * 0.055);
  g.fillStyle(0xf3e3cf, 1).fillEllipse(0, -s * 0.52 * sq, s * 0.34, s * 0.24 * sq);
  if (lie) {
    g.lineStyle(Math.max(1.5, s * 0.03), 0x3d2b3a, 1);
    for (const ex of [-s * 0.08, s * 0.08]) { g.beginPath(); g.arc(ex, -s * 0.55 * sq, s * 0.04, 0.15 * Math.PI, 0.85 * Math.PI); g.strokePath(); }
  } else {
    g.fillStyle(0x3d2b3a, 1).fillCircle(-s * 0.08, -s * 0.55, s * 0.045).fillCircle(s * 0.08, -s * 0.55, s * 0.045);
    g.fillStyle(0xffffff, 1).fillCircle(-s * 0.065, -s * 0.565, s * 0.015).fillCircle(s * 0.095, -s * 0.565, s * 0.015);
  }
  g.fillStyle(0xf2a0b0, 0.7).fillEllipse(-s * 0.16, -s * 0.48 * sq, s * 0.07, s * 0.04).fillEllipse(s * 0.16, -s * 0.48 * sq, s * 0.07, s * 0.04);
  if (!lie) g.fillStyle(0x9aa3ad, 1).fillRoundedRect(s * 0.2, -s * 0.36, s * 0.06, s * 0.2, 2);
}

/** Placeholder Mischi: rosy-pink impish fox-like creature, huge pointed ears, bat wings, striped scarf. */
function drawMischi(g: G, s: number, pose: DrawPose): void {
  const lie = pose === 'sleep';
  const sq = lie ? 0.8 : 1;
  const pink = 0xf29bb0;
  g.fillStyle(0x000000, 0.18).fillEllipse(0, 0, s * 0.56, s * 0.14);
  g.fillStyle(pink, 1).fillEllipse(-s * 0.3, -s * 0.18 * sq, s * 0.28, s * 0.14);
  g.fillStyle(0x8a4f8f, 1)
    .fillTriangle(-s * 0.18, -s * 0.32 * sq, -s * 0.44, -s * 0.46 * sq, -s * 0.34, -s * 0.22 * sq)
    .fillTriangle(s * 0.18, -s * 0.32 * sq, s * 0.44, -s * 0.46 * sq, s * 0.34, -s * 0.22 * sq);
  g.fillStyle(pink, 1).fillEllipse(0, -s * 0.22 * sq, s * 0.44, s * 0.4 * sq);
  g.fillStyle(pink, 1)
    .fillTriangle(-s * 0.26, -s * 0.66 * sq, -s * 0.36, -s * 1.1 * sq, -s * 0.06, -s * 0.78 * sq)
    .fillTriangle(s * 0.26, -s * 0.66 * sq, s * 0.36, -s * 1.1 * sq, s * 0.06, -s * 0.78 * sq);
  g.fillStyle(0xfad3dc, 1)
    .fillTriangle(-s * 0.24, -s * 0.7 * sq, -s * 0.31, -s * 0.98 * sq, -s * 0.12, -s * 0.78 * sq)
    .fillTriangle(s * 0.24, -s * 0.7 * sq, s * 0.31, -s * 0.98 * sq, s * 0.12, -s * 0.78 * sq);
  g.fillStyle(pink, 1).fillCircle(0, -s * 0.58 * sq, s * 0.25);
  g.fillStyle(0xffffff, 1).fillRect(-s * 0.2, -s * 0.38 * sq, s * 0.4, s * 0.08);
  g.fillStyle(0xd94f5c, 1);
  for (let i = 0; i < 4; i++) g.fillRect(-s * 0.2 + i * s * 0.1, -s * 0.38 * sq, s * 0.05, s * 0.08);
  g.fillStyle(0xf6f0e6, 1).fillCircle(s * 0.12, -s * 0.8 * sq, s * 0.06);
  if (lie) {
    g.lineStyle(Math.max(1.5, s * 0.03), 0x3d2b3a, 1);
    for (const ex of [-s * 0.09, s * 0.09]) { g.beginPath(); g.arc(ex, -s * 0.58 * sq, s * 0.045, 0.15 * Math.PI, 0.85 * Math.PI); g.strokePath(); }
  } else {
    g.fillStyle(0x3d2b3a, 1).fillCircle(-s * 0.09, -s * 0.6, s * 0.04);
    g.lineStyle(Math.max(1.5, s * 0.03), 0x3d2b3a, 1);
    g.beginPath(); g.arc(s * 0.09, -s * 0.6, s * 0.04, 1.1 * Math.PI, 1.9 * Math.PI); g.strokePath();
    g.beginPath(); g.arc(0, -s * 0.5, s * 0.06, 0.1 * Math.PI, 0.9 * Math.PI); g.strokePath();
  }
  g.fillStyle(0xd94f5c, 0.5).fillEllipse(-s * 0.16, -s * 0.5 * sq, s * 0.07, s * 0.04).fillEllipse(s * 0.16, -s * 0.5 * sq, s * 0.07, s * 0.04);
}

function drawGeneric(g: G, s: number, pose: DrawPose, def: ResidentDef): void {
  const sq = pose === 'sleep' ? 0.8 : 1;
  g.fillStyle(0x000000, 0.18).fillEllipse(0, 0, s * 0.56, s * 0.14);
  g.fillStyle(hex(def.palette.body), 1).fillEllipse(0, -s * 0.24 * sq, s * 0.5, s * 0.44 * sq).fillCircle(0, -s * 0.58 * sq, s * 0.25);
  g.fillStyle(hex(def.palette.accent), 1).fillCircle(0, -s * 0.84 * sq, s * 0.08);
  g.fillStyle(0x3d2b3a, 1).fillCircle(-s * 0.08, -s * 0.58 * sq, s * 0.04).fillCircle(s * 0.08, -s * 0.58 * sq, s * 0.04);
}

/** Decorated form overlay: a little star-dotted cape and a gold charm, drawn behind/over the base. */
function drawDecoration(g: G, s: number, pose: DrawPose): void {
  const sq = pose === 'sleep' ? 0.8 : 1;
  g.fillStyle(0xfff2b8, 1);
  for (const [x, y] of [[-0.22, -0.2], [0.24, -0.26], [0, -0.1]] as const) {
    const cx = x * s;
    const cy = y * s * sq;
    const r = s * 0.06;
    g.fillTriangle(cx, cy - r, cx - r * 0.8, cy + r * 0.6, cx + r * 0.8, cy + r * 0.6);
    g.fillTriangle(cx, cy + r, cx - r * 0.8, cy - r * 0.6, cx + r * 0.8, cy - r * 0.6);
  }
  g.fillStyle(0xe8c46a, 1).fillCircle(0, -s * 0.36 * sq, s * 0.05);
}

/** Draws any resident's placeholder art into a Graphics object, feet at (0, 0). */
export function drawResident(g: G, def: ResidentDef, s: number, pose: DrawPose, decorated: boolean): void {
  g.clear();
  if (def.id === 'snug') drawSnug(g, s, pose);
  else if (def.id === 'tinker') drawTinker(g, s, pose);
  else if (def.id === 'mischi') drawMischi(g, s, pose);
  else drawGeneric(g, s, pose, def);
  if (decorated) drawDecoration(g, s, pose);
}

const TAG_TINTS: Record<string, number> = {
  Natural: 0x8dbf6a, Rainy: 0x7fa9d6, Calm: 0xa99bd6, Dreamy: 0x9b7fd0, Warm: 0xe0a46a, Playful: 0xe98fb0, Crafty: 0xc79a6a,
};

function tagTint(def: FurnitureDef): number {
  const main = Object.entries(def.tags).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (main && TAG_TINTS[main]) || 0xc79a6a;
}

function lighten(color: number): number {
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  const up = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.35));
  return (up(r) << 16) | (up(g) << 8) | up(b);
}

function label(scene: Phaser.Scene, text: string, width: number, cell: number): Phaser.GameObjects.Text {
  return scene.add
    .text(0, 0, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${Math.max(9, Math.round(cell * 0.2))}px`,
      fontStyle: 'bold',
      color: '#3b2a40',
      align: 'center',
      wordWrap: { width: Math.max(20, width - 4) },
    })
    .setOrigin(0.5, 0.5);
}
