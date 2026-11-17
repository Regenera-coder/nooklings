import { describe, expect, it } from 'vitest';
import { content as c, contentWithSeries2 as c2 } from '@nooklings/content';
import {
  applyCommand,
  deserialize,
  friendSkills,
  happyFriends,
  happyStatus,
  newGame,
  readySummary,
  researchSpeed,
  serialize,
  tripSlots,
  SAVE_VERSION,
  type Command,
  type Content,
  type GameState,
  type OwnedResident,
} from '@nooklings/core';

const T = 1_800_000_000_000;
const H = 3_600_000;
const DAY = 24 * H;
type In = Command extends infer C ? (C extends unknown ? Omit<C, 'id'> : never) : never;
let n = 0;

function run(s: GameState, cmd: In, content: Content = c) {
  return applyCommand(s, { ...cmd, id: `f${++n}` } as Command, content);
}
function ok(s: GameState, cmd: In, content: Content = c) {
  const r = run(s, cmd, content);
  if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`);
  return r;
}
function err(s: GameState, cmd: In, content: Content = c) {
  const r = run(s, cmd, content);
  return r.ok ? 'ok' : r.error;
}
const friend = (room: string): OwnedResident => ({ bondXp: 0, form: 'original', lastPlayAt: 0, playsToday: 0, room, costume: null, treatDay: 0 });

/** A home at this level with these friends in the Living Room, rich enough to do anything. */
function home(level: number, ids: string[] = ['snug']): GameState {
  const g = newGame(c);
  const residents = Object.fromEntries(ids.map((id) => [id, friend('living_room')]));
  return {
    ...g,
    hearts: c.levels.find((l) => l.level === level)!.hearts,
    residents,
    residentOrder: ids,
    wallet: { ...g.wallet, buttons: 99_999, wood: 999, fabric: 999, keepsakes: 999, wishStamps: 9 },
  };
}

/** Snug loves Calm and Warm: the starter room has Calm 2, Warm 0. Add a sofa and a tea table to reach 3 each. */
function cosy(s: GameState): GameState {
  const placements = [
    ...s.rooms.living_room!.placements,
    { uid: 'x1', defId: 'cozy_sofa', col: 0, row: 4, flipped: false },
    { uid: 'x2', defId: 'tea_table', col: 3, row: 4, flipped: false },
  ];
  return { ...s, rooms: { ...s.rooms, living_room: { placements } } };
}

describe('Happy friends', () => {
  it('a friend is Happy when every favourite tag in their room reaches 3', () => {
    const s = home(3);
    const before = happyStatus(s, c, 'snug')!;
    expect(before.happy).toBe(false);
    expect(before.tags.map((t) => [t.tag, t.have, t.need])).toEqual([['Calm', 2, 3], ['Warm', 0, 3]]);
    expect(happyStatus(cosy(s), c, 'snug')!.happy).toBe(true);
    expect(happyFriends(cosy(s), c)).toEqual(['snug']);
  });

  it('Happy friends give a gift once a day, counted per Happy friend at home', () => {
    let s = cosy(home(3, ['snug', 'patcha']));
    // Patcha loves Warm (3 here) as well, so both are Happy.
    expect(happyFriends(s, c)).toEqual(['snug', 'patcha']);
    expect(readySummary(s, c, T).find((r) => r.kind === 'happy')?.count).toBe(2);
    const buttons = s.wallet.buttons;
    const r = ok(s, { type: 'collect_happy_gifts', at: T });
    s = r.state;
    expect(s.wallet.buttons - buttons).toBe(2 * c.friends!.happyGift.buttons!);
    expect(r.events).toContainEqual({ type: 'happy_gifts', residents: ['snug', 'patcha'], reward: { buttons: 30 } });
    expect(err(s, { type: 'collect_happy_gifts', at: T + H })).toBe('daily_limit');
    expect(readySummary(s, c, T + H).find((r) => r.kind === 'happy')).toBeUndefined();
    expect(ok(s, { type: 'collect_happy_gifts', at: T + DAY }).state.wallet.buttons).toBe(s.wallet.buttons + 30);
  });

  it('nobody Happy means nothing to collect', () => {
    expect(err(home(3), { type: 'collect_happy_gifts', at: T })).toBe('not_ready');
  });

  it('a friend away on a trip is not at home, so gives no gift and no skill', () => {
    let s = cosy(home(7));
    s = ok(s, { type: 'start_expedition', routeId: 'meadow', residentId: 'snug', at: T }).state;
    expect(happyStatus(s, c, 'snug')!.happy).toBe(true);
    expect(happyFriends(s, c)).toEqual([]);
    expect(friendSkills(s, c).study).toBe(0);
  });
});

describe('friend skills', () => {
  it('each Happy friend speeds up their skill by 5%, up to 20%', () => {
    const s = cosy(home(3));
    expect(c.residents.snug!.skill).toBe('study');
    expect(friendSkills(s, c).study).toBeCloseTo(0.05);
    expect(researchSpeed(s, c).study).toBeCloseTo(0.95);
    const fake: Content = { ...c, residents: { ...c.residents, patcha: { ...c.residents.patcha!, skill: 'study' }, tinker: { ...c.residents.tinker!, skill: 'study', favouriteTags: ['Warm'] }, pippo: { ...c.residents.pippo!, skill: 'study', favouriteTags: ['Warm'] }, mopey: { ...c.residents.mopey!, skill: 'study', favouriteTags: ['Warm'] } } };
    const five = cosy(home(3, ['snug', 'patcha', 'tinker', 'pippo', 'mopey']));
    expect(happyFriends(five, fake)).toHaveLength(5);
    expect(friendSkills(five, fake).study).toBeCloseTo(0.2);
  });

  it('shortens a Research study started while the friend is Happy', () => {
    const s = cosy(home(3));
    const study = c.research!.order[0]!;
    const ms = c.research!.studies[study]!.levels[0]!.ms;
    const r = ok(s, { type: 'start_research', studyId: study, at: T });
    expect(r.state.research.active!.endAt).toBe(T + Math.round(ms * 0.95));
  });

  it('never touches plant growth, so a plant cannot shrink when a friend stops being Happy', () => {
    const s = cosy(home(3));
    expect(researchSpeed(s, c).grow).toBe(researchSpeed(home(3), c).grow);
    expect(researchSpeed(s, c).flower).toBe(researchSpeed(home(3), c).flower);
  });

  it('every friend has a skill', () => {
    for (const r of Object.values(c2.residents)) expect(r.skill, r.id).toBeTruthy();
  });
});

describe('more friends, more trips at once', () => {
  it('opens a second trip at 6 friends and a third at 14', () => {
    const ids = Object.keys(c2.residents);
    expect(tripSlots(home(7, ids.slice(0, 5)), c)).toBe(1);
    expect(tripSlots(home(7, ids.slice(0, 6)), c)).toBe(2);
    expect(tripSlots(home(7, ids.slice(0, 14)), c)).toBe(3);
  });

  it('sends two friends at once, refuses a third, and brings everyone home together', () => {
    const ids = Object.keys(c.residents).slice(0, 6);
    let s = home(7, ids);
    s = ok(s, { type: 'start_expedition', routeId: 'meadow', residentId: ids[0]!, at: T }).state;
    expect(err(s, { type: 'start_expedition', routeId: 'meadow', residentId: ids[0]!, at: T })).toBe('away');
    s = ok(s, { type: 'start_expedition', routeId: 'meadow', residentId: ids[1]!, at: T + 1 }).state;
    expect(err(s, { type: 'start_expedition', routeId: 'meadow', residentId: ids[2]!, at: T + 2 })).toBe('busy');
    expect(err(s, { type: 'play', residentId: ids[1]!, at: T + DAY })).toBe('away');
    expect(readySummary(s, c, T + 2 * H).find((r) => r.kind === 'trip')?.count).toBe(2);
    const r = ok(s, { type: 'collect_expedition', at: T + 2 * H });
    expect(r.state.expeditions).toEqual([]);
    expect(r.state.expeditionsDone.meadow).toBe(2);
    expect(r.events.filter((e) => e.type === 'expedition_done')).toHaveLength(2);
  });

  it('collects only the trips that are back', () => {
    const ids = Object.keys(c.residents).slice(0, 6);
    let s = home(7, ids);
    s = ok(s, { type: 'start_expedition', routeId: 'meadow', residentId: ids[0]!, at: T }).state;
    s = ok(s, { type: 'start_expedition', routeId: 'old_mill', residentId: ids[1]!, at: T }).state;
    s = ok(s, { type: 'collect_expedition', at: T + 2 * H }).state;
    expect(s.expeditions.map((t) => t.residentId)).toEqual([ids[1]]);
  });

  it("a route's friend waits for space instead of crowding a full home", () => {
    // One friend per room: Snug in the Living Room, Tinker in the Yard, the Sunroom not yet opened.
    const tight: Content = { ...c, rules: { ...c.rules, maxResidentsPerRoom: 1 } };
    let s = home(7, ['snug', 'tinker']);
    s = { ...s, purchases: [], residents: { ...s.residents, tinker: friend('yard') } };
    s = ok(s, { type: 'start_expedition', routeId: 'old_mill', residentId: 'snug', at: T }, tight).state;
    const r = ok(s, { type: 'collect_expedition', at: T + DAY }, tight);
    expect('pippo' in r.state.residents).toBe(false);
    expect(r.events).toContainEqual({ type: 'resident_waiting', residentId: 'pippo' });
    // With space (the Sunroom opened), the next trip back from the Old Mill brings Pippo home.
    let t: GameState = { ...r.state, purchases: ['sunroom:open'] };
    t = ok(t, { type: 'start_expedition', routeId: 'old_mill', residentId: 'snug', at: T + DAY }, tight).state;
    t = ok(t, { type: 'collect_expedition', at: T + 3 * DAY }, tight).state;
    expect(t.residents.pippo?.room).toBe('sunroom');
  });
});

describe('series milestones', () => {
  it('pays each milestone once, when enough of the series is home', () => {
    let s = home(3, ['snug', 'tinker']);
    expect(err(s, { type: 'claim_series_milestone', seriesId: 'first_residents', count: 3 })).toBe('not_ready');
    s = home(3, ['snug', 'tinker', 'mischi']);
    expect(readySummary(s, c, T).find((r) => r.kind === 'series')?.count).toBe(1);
    const stamps = s.wallet.wishStamps;
    s = ok(s, { type: 'claim_series_milestone', seriesId: 'first_residents', count: 3 }).state;
    expect(s.wallet.wishStamps).toBe(stamps + 1);
    expect(s.seriesMilestones).toEqual(['first_residents:3']);
    expect(err(s, { type: 'claim_series_milestone', seriesId: 'first_residents', count: 3 })).toBe('already_done');
    expect(err(s, { type: 'claim_series_milestone', seriesId: 'first_residents', count: 4 })).toBe('unknown_series');
    expect(readySummary(s, c, T).find((r) => r.kind === 'series')).toBeUndefined();
  });

  it('Teatime Friends have their own milestones', () => {
    expect(c2.series.find((x) => x.id === 'teatime_friends')!.milestones!.map((m) => m.count)).toEqual([3, 6]);
    expect(c2.series.find((x) => x.id === 'first_residents')!.milestones!.map((m) => m.count)).toEqual([3, 6]);
  });
});

describe('save v14', () => {
  it('turns an old save\'s one trip into the list, and keeps gifts and milestones', () => {
    const old = JSON.parse(serialize(home(7, ['snug', 'tinker'])));
    delete old.expeditions;
    delete old.seriesMilestones;
    delete old.happyGiftDay;
    old.version = 13;
    old.expedition = { routeId: 'meadow', residentId: 'snug', startAt: T, endAt: T + H };
    const s = deserialize(JSON.stringify(old), c);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.expeditions).toEqual([{ routeId: 'meadow', residentId: 'snug', startAt: T, endAt: T + H }]);
    expect(s.happyGiftDay).toBe(-1);
    expect(s.seriesMilestones).toEqual([]);
    const none = deserialize(JSON.stringify({ ...old, expedition: null }), c);
    expect(none.expeditions).toEqual([]);
  });

  it('round-trips and drops nonsense', () => {
    const s: GameState = {
      ...home(7, ['snug', 'tinker']),
      expeditions: [
        { routeId: 'meadow', residentId: 'snug', startAt: T, endAt: T + H },
        { routeId: 'meadow', residentId: 'snug', startAt: T, endAt: T + H },
        { routeId: 'nowhere', residentId: 'tinker', startAt: T, endAt: T + H },
      ],
      seriesMilestones: ['first_residents:3', 'first_residents:99', 'nope:3', 'first_residents:3'],
      happyGiftDay: 12345,
    };
    const back = deserialize(serialize(s), c);
    expect(back.expeditions).toEqual([{ routeId: 'meadow', residentId: 'snug', startAt: T, endAt: T + H }]);
    expect(back.seriesMilestones).toEqual(['first_residents:3']);
    expect(back.happyGiftDay).toBe(12345);
  });
});
