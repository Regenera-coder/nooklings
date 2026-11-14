/** Shared data shapes. Definitions (content) are static; GameState is the saved, mutable part. */

export type Layer = 'floor' | 'rug' | 'wall';

export interface Cell {
  col: number;
  row: number;
}

export interface FurnitureDef {
  id: string;
  name: string;
  /** floor = blocks walking; rug = flat, walkable; wall = hangs on the back wall. */
  layer: Layer;
  /** Footprint in cells. Wall items use w slots along the back wall and h = 1. */
  w: number;
  h: number;
  /** Atmosphere tags, e.g. { Dreamy: 2, Calm: 1 }. PROPOSED values, unbalanced. */
  tags: Record<string, number>;
  canFlip: boolean;
  /** Optional resident interaction this furniture offers. */
  rest?: 'sleep' | 'sit';
}

export interface RoomDef {
  id: string;
  name: string;
  cols: number;
  rows: number;
  /** Floor cell in front of the doorway. Must always stay free and reachable. */
  door: Cell;
}

export interface Placement {
  uid: string;
  defId: string;
  col: number;
  row: number;
  flipped: boolean;
}

export interface RoomState {
  placements: Placement[];
}

export interface GameState {
  version: number;
  homeName: string;
  rooms: Record<string, RoomState>;
  /** Stored (unplaced) furniture counts by definition id. */
  inventory: Record<string, number>;
  nextUid: number;
  /** Recently applied command ids, so a replayed command cannot apply twice. */
  appliedCommandIds: string[];
}

export type ResidentActivity = 'idle' | 'wander' | 'rest';

export interface ResidentDef {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Secret';
  tagline: string;
  /** Relative weights for choosing the next activity. Data-first, PROPOSED values. */
  behaviour: Record<ResidentActivity, number>;
  /** Which furniture interaction this resident prefers when resting. */
  favouriteRest: 'sleep' | 'sit';
  /** Walking speed in cells per second. */
  speed: number;
}

export interface Content {
  rooms: Record<string, RoomDef>;
  furniture: Record<string, FurnitureDef>;
  residents: Record<string, ResidentDef>;
  starter: {
    homeName: string;
    inventory: Record<string, number>;
    placements: Record<string, Array<Omit<Placement, 'uid'>>>;
  };
}
