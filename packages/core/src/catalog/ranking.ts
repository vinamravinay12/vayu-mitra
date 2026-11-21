import type { CostTier, EffortLevel } from './vocabulary.js';

/**
 * How actions are ordered. Health comes first: one percentage point of
 * vulnerability-weighted exposure cut is worth as much as a gram a week of
 * PM2.5 kept out of the neighbourhood air, and the smog term is capped so a
 * large emitter cannot crowd out every change that protects the family.
 */
export const RANKING = {
  pointsPerExposurePercent: 1,
  pointsPerPm25GramWeekly: 1,
  maxSmogPoints: 30,
  pointsPerCo2KgWeekly: 0.1,
  /** Below all three of these an action changes too little to recommend. */
  minExposurePercent: 1,
  minMemberExposurePercent: 2,
  minPm25GramsWeekly: 0.5,
  /** A family-wide exposure rise beyond this rules an action out. */
  maxNetHarmPercent: -0.5,
  /** How many actions are pre-selected as the starting plan. */
  recommendedCount: 3,
} as const;

/** Harder changes are discounted: a plan a family will not follow protects nobody. */
export const EFFORT_DIVISOR: Readonly<Record<EffortLevel, number>> = {
  easy: 1,
  moderate: 1.3,
  hard: 1.8,
};

/** Costlier changes are discounted gently; cost never decides on its own. */
export const COST_DIVISOR: Readonly<Record<CostTier, number>> = {
  free: 1,
  low: 1.05,
  medium: 1.2,
  high: 1.4,
};

/** Readable labels shared by the UI and the AI facts. */
export const COST_LABELS: Readonly<Record<CostTier, string>> = {
  free: 'Free',
  low: 'Under ₹3,000',
  medium: '₹3,000–15,000',
  high: 'Over ₹15,000',
};
