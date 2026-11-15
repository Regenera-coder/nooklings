import type { Cell, Content, FurnitureDef, Placement, RoomDef } from './types';

export type PlacementError = 'unknown_item' | 'out_of_bounds' | 'overlap' | 'blocks_door' | 'unreachable';

export type Validation = { ok: true } | { ok: false; reason: PlacementError };

export interface Candidate {
  defId: string;
  col: number;
  row: number;
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function cellsOf(def: FurnitureDef, col: number, row: number): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < def.h; r++) {
    for (let c = 0; c < def.w; c++) cells.push({ col: col + c, row: row + r });
  }
  return cells;
}

export function inBounds(room: RoomDef, def: FurnitureDef, col: number, row: number): boolean {
  if (!Number.isInteger(col) || !Number.isInteger(row)) return false;
  if (col < 0 || col + def.w > room.cols) return false;
  if (def.layer === 'wall') return row === 0 && room.walls !== false;
  if (def.layer === 'ceiling' && room.walls === false) return false; // outdoors: nothing to hang from
  return row >= 0 && row + def.h <= room.rows;
}

function rectsOverlap(a: Candidate, da: FurnitureDef, b: Candidate, db: FurnitureDef): boolean {
  return a.col < b.col + db.w && b.col < a.col + da.w && a.row < b.row + db.h && b.row < a.row + da.h;
}

/** blocked[row][col] is true where floor-layer furniture stands. */
export function blockedGrid(room: RoomDef, placements: readonly Placement[], content: Content): boolean[][] {
  const grid: boolean[][] = Array.from({ length: room.rows }, () => Array<boolean>(room.cols).fill(false));
  for (const p of placements) {
    const def = content.furniture[p.defId];
    if (!def || def.layer !== 'floor') continue;
    for (const cell of cellsOf(def, p.col, p.row)) {
      const rowArr = grid[cell.row];
      if (rowArr && cell.col >= 0 && cell.col < room.cols) rowArr[cell.col] = true;
    }
  }
  return grid;
}

export function isFree(blocked: readonly boolean[][], cell: Cell): boolean {
  const rowArr = blocked[cell.row];
  if (!rowArr) return false;
  if (cell.col < 0 || cell.col >= rowArr.length) return false;
  return rowArr[cell.col] === false;
}

/** reachable[row][col] is true for every free cell that can be walked to from `from`. */
export function reachableFrom(blocked: readonly boolean[][], from: Cell): boolean[][] {
  const seen: boolean[][] = blocked.map((r) => r.map(() => false));
  if (!isFree(blocked, from)) return seen;
  const queue: Cell[] = [from];
  seen[from.row]![from.col] = true;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dc, dr] of NEIGHBOURS) {
      const next = { col: cur.col + dc, row: cur.row + dr };
      if (isFree(blocked, next) && !seen[next.row]![next.col]) {
        seen[next.row]![next.col] = true;
        queue.push(next);
      }
    }
  }
  return seen;
}

/** Shortest 4-direction path from `from` to `to`, excluding `from`. Null if there is none. */
export function findPath(blocked: readonly boolean[][], from: Cell, to: Cell): Cell[] | null {
  if (!isFree(blocked, from) || !isFree(blocked, to)) return null;
  if (from.col === to.col && from.row === to.row) return [];
  const prev = new Map<string, Cell | null>();
  const key = (c: Cell) => `${c.col},${c.row}`;
  prev.set(key(from), null);
  const queue: Cell[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.col === to.col && cur.row === to.row) {
      const path: Cell[] = [];
      let step: Cell | null = cur;
      while (step && !(step.col === from.col && step.row === from.row)) {
        path.unshift(step);
        step = prev.get(key(step)) ?? null;
      }
      return path;
    }
    for (const [dc, dr] of NEIGHBOURS) {
      const next = { col: cur.col + dc, row: cur.row + dr };
      if (isFree(blocked, next) && !prev.has(key(next))) {
        prev.set(key(next), cur);
        queue.push(next);
      }
    }
  }
  return null;
}

/** Free cells orthogonally next to a placed floor item. */
export function adjacentFreeCells(
  blocked: readonly boolean[][],
  def: FurnitureDef,
  col: number,
  row: number,
): Cell[] {
  const out: Cell[] = [];
  const own = new Set(cellsOf(def, col, row).map((c) => `${c.col},${c.row}`));
  const seen = new Set<string>();
  for (const cell of cellsOf(def, col, row)) {
    for (const [dc, dr] of NEIGHBOURS) {
      const next = { col: cell.col + dc, row: cell.row + dr };
      const k = `${next.col},${next.row}`;
      if (own.has(k) || seen.has(k)) continue;
      seen.add(k);
      if (isFree(blocked, next)) out.push(next);
    }
  }
  return out;
}

/**
 * Can `candidate` stand at this spot, given everything else in the room?
 * Rules: inside the room; no overlap with the same layer; the doorway cell stays free;
 * no walkable cell is sealed off; every floor item keeps at least one free neighbour.
 */
export function validatePlacement(
  room: RoomDef,
  placements: readonly Placement[],
  content: Content,
  candidate: Candidate,
  excludeUid?: string,
): Validation {
  const def = content.furniture[candidate.defId];
  if (!def) return { ok: false, reason: 'unknown_item' };
  if (!inBounds(room, def, candidate.col, candidate.row)) return { ok: false, reason: 'out_of_bounds' };

  const others = placements.filter((p) => p.uid !== excludeUid);
  for (const other of others) {
    const otherDef = content.furniture[other.defId];
    if (!otherDef || otherDef.layer !== def.layer) continue;
    // A covering item (curtains) may hang over one ordinary wall item, never over another covering.
    if (def.layer === 'wall' && !!def.overlay !== !!otherDef.overlay) continue;
    if (rectsOverlap(candidate, def, other, otherDef)) return { ok: false, reason: 'overlap' };
  }

  if (def.layer === 'wall') {
    const coversDoor = room.door.row === 0 && candidate.col <= room.door.col && room.door.col < candidate.col + def.w;
    return coversDoor ? { ok: false, reason: 'blocks_door' } : { ok: true };
  }
  if (def.layer === 'rug' || def.layer === 'ceiling') return { ok: true };

  const next: Placement[] = [...others, { uid: '__candidate__', flipped: false, ...candidate }];
  const blocked = blockedGrid(room, next, content);
  if (!isFree(blocked, room.door)) return { ok: false, reason: 'blocks_door' };

  const reachable = reachableFrom(blocked, room.door);
  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      if (!blocked[r]![c] && !reachable[r]![c]) return { ok: false, reason: 'unreachable' };
    }
  }
  for (const p of next) {
    const pDef = content.furniture[p.defId];
    if (!pDef || pDef.layer !== 'floor') continue;
    if (adjacentFreeCells(blocked, pDef, p.col, p.row).length === 0) return { ok: false, reason: 'unreachable' };
  }
  return { ok: true };
}
