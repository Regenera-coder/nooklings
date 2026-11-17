import type { FriendRules, FriendSkill, SeriesMilestone } from '@nooklings/core';

/**
 * Why more friends matter (17 Nov). A friend is Happy when each favourite tag in their room reaches 3;
 * Happy friends at home give a daily gift and speed up their skill; more friends allow more trips at once.
 */
export const friendRules: FriendRules = {
  happyMin: 3,
  happyGift: { buttons: 15 },
  skillPerFriend: 0.05,
  skillMax: 0.2,
  tripSlotsAt: [1, 6, 14],
};

/** Each friend's skill, chosen to suit them. */
export const FRIEND_SKILL: Record<string, FriendSkill> = {
  snug: 'study', tinker: 'gathering', mischi: 'trips', glim: 'study', bloomi: 'gathering',
  mopey: 'gathering', pippo: 'trips', hush: 'study', patcha: 'trips', luma: 'trips',
  crumb: 'baking', whisk: 'baking', mallow: 'study', pekoe: 'baking', jammy: 'gathering',
  dumple: 'baking', sprinkle: 'trips', toffee: 'trips', souffle: 'baking', cherri: 'study',
};

/** Rewards on the way to finishing First Residents: a Wish Stamp toward the next friend. */
export const SERIES_1_MILESTONES: SeriesMilestone[] = [
  { count: 3, reward: { buttons: 150, wishStamps: 1 } },
  { count: 6, reward: { buttons: 250, wishStamps: 1 } },
];
