import type { Cell, RoomDef } from '@nooklings/core';

/** Screen geometry for one room in the three-quarter dollhouse view. */
export interface RoomLayout {
  /** Cell width and depth in screen px. */
  cw: number;
  ch: number;
  /** Left edge of the room, top of the back wall, top of the floor. */
  ox: number;
  wallTop: number;
  wallH: number;
  floorTop: number;
  width: number;
  floorH: number;
}

const WALL_RATIO = 1.45;
const DEPTH_RATIO = 0.62;
const MARGIN = 10;

export function computeLayout(room: RoomDef, viewW: number, viewH: number): RoomLayout {
  const byWidth = (viewW - MARGIN * 2) / room.cols;
  const byHeight = (viewH - MARGIN * 2) / (WALL_RATIO + room.rows * DEPTH_RATIO);
  const cw = Math.max(14, Math.floor(Math.min(byWidth, byHeight)));
  const ch = Math.round(cw * DEPTH_RATIO);
  const wallH = Math.round(cw * WALL_RATIO);
  const width = cw * room.cols;
  const floorH = ch * room.rows;
  const ox = Math.round((viewW - width) / 2);
  const wallTop = Math.round((viewH - (wallH + floorH)) / 2);
  return { cw, ch, ox, wallTop, wallH, floorTop: wallTop + wallH, width, floorH };
}

/** Screen point at the centre of a floor cell. */
export function cellCentre(l: RoomLayout, cell: Cell): { x: number; y: number } {
  return { x: l.ox + (cell.col + 0.5) * l.cw, y: l.floorTop + (cell.row + 0.5) * l.ch };
}

/** Where a resident's feet sit when standing in a cell (slightly in front of centre). */
export function footPoint(l: RoomLayout, col: number, row: number): { x: number; y: number } {
  return { x: l.ox + (col + 0.5) * l.cw, y: l.floorTop + (row + 0.72) * l.ch };
}

/** Floor cell under a screen point, or null if outside the floor. */
export function floorCellAt(l: RoomLayout, room: RoomDef, x: number, y: number): Cell | null {
  const col = Math.floor((x - l.ox) / l.cw);
  const row = Math.floor((y - l.floorTop) / l.ch);
  if (col < 0 || col >= room.cols || row < 0 || row >= room.rows) return null;
  return { col, row };
}

/** Wall slot under a screen point, or null if not over the back wall. */
export function wallSlotAt(l: RoomLayout, room: RoomDef, x: number, y: number): number | null {
  if (y < l.wallTop || y >= l.floorTop) return null;
  const col = Math.floor((x - l.ox) / l.cw);
  return col >= 0 && col < room.cols ? col : null;
}
