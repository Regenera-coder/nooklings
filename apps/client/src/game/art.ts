import * as Phaser from 'phaser';
import type { FurnitureDef, Placement } from '@nooklings/core';
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

/** Height of the seat/top surface above the floor, for residents who sit or sleep on it. */
export function seatHeight(def: FurnitureDef, l: RoomLayout): number {
  if (def.id === 'cloud_bed') return l.cw * 0.42;
  if (def.id === 'cozy_sofa') return l.cw * 0.38;
  return l.cw * 0.4;
}

/** Where a resident's feet go when resting on a piece of furniture. */
export function seatPoint(def: FurnitureDef, p: Placement, l: RoomLayout): { x: number; y: number } {
  const x = l.ox + (p.col + def.w / 2) * l.cw;
  const y = l.floorTop + (p.row + def.h * 0.7) * l.ch - seatHeight(def, l);
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
      default: {
        g.fillStyle(WOOD, 1).fillRoundedRect(-s * 0.32, -s * 0.38, s * 0.64, s * 0.62, 3);
        g.fillStyle(0xfdf3e3, 1).fillRect(-s * 0.24, -s * 0.3, s * 0.48, s * 0.46);
        g.fillStyle(0xf2b5c4, 1).fillCircle(-s * 0.06, -s * 0.1, s * 0.07).fillCircle(s * 0.06, -s * 0.1, s * 0.07);
        g.fillTriangle(-s * 0.13, -s * 0.07, s * 0.13, -s * 0.07, 0, s * 0.08);
        top = -s * 0.38;
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
      h = seatHeight(def, l);
      box(g, x0, x1, back, front, h * 0.55, WOOD_LIGHT, WOOD);
      g.fillStyle(WOOD_DARK, 1).fillRoundedRect(x0 - 2, back - h * 1.6, cw * 0.16, h * 1.6 + (front - back), 3);
      box(g, x0 + 2, x1 - 2, back, front - 2, h, 0xd9cdf2, 0xb7a6e0, 5);
      g.fillStyle(0xffffff, 1).fillCircle(x0 + cw * 0.38, back - h + 2, cw * 0.17).fillCircle(x0 + cw * 0.58, back - h, cw * 0.14);
      g.fillStyle(0xa99ad6, 1).fillRoundedRect(x0 + wpx * 0.45, back - h, x1 - (x0 + wpx * 0.45) - 2, front - back + h * 0.4, 4);
      top = back - h * 1.6;
      break;
    }
    case 'cozy_sofa': {
      h = seatHeight(def, l);
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
      box(g, x0, x1, back, front, h, WOOD_LIGHT, WOOD);
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

/** Placeholder Snug: cream plush body, long floppy ears, lavender star nightcap, closed eyes. */
export function drawSnug(g: G, s: number, pose: 'stand' | 'sleep' | 'sit'): void {
  g.clear();
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
