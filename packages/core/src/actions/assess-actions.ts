import { ACTIONS } from '../catalog/actions/index.js';
import { COST_DIVISOR, EFFORT_DIVISOR, RANKING } from '../catalog/ranking.js';
import { ACTION_CATEGORIES } from '../catalog/vocabulary.js';
import { evaluateCondition } from '../conditions/evaluate-condition.js';
import { describeImpact } from '../explain/describe-impact.js';
import type { Member } from '../schemas/profile.js';
import { applyEffects } from '../scenario/apply-effect.js';
import type { ActionDefinition } from '../types/action.js';
import type { HouseholdContext } from '../types/condition.js';
import type { Scenario } from '../types/scenario.js';
import {
  compareOutcomes,
  outcomeOf,
  type Impact,
  type ScenarioOutcome,
} from './compare-scenarios.js';

/** An applicable action with its computed impact and place in the ranking. */
export interface AssessedAction {
  readonly action: ActionDefinition;
  readonly impact: Impact;
  readonly score: number;
  /** Plain-language sentences, every number taken from `impact`. */
  readonly explanation: readonly string[];
  /** Part of the starting plan the engine suggests. */
  readonly recommended: boolean;
}

/** Inputs for assessing actions against one household and one day. */
export interface AssessmentInput {
  readonly members: readonly Member[];
  readonly baseline: Scenario;
  readonly baselineOutcome: ScenarioOutcome;
  readonly context: HouseholdContext;
  readonly pm25: readonly number[];
}

/** Ranking score: health first, then smog, then climate, discounted by effort and cost. */
export function scoreImpact(impact: Impact, action: ActionDefinition): number {
  const health = impact.weightedReductionPercent * RANKING.pointsPerExposurePercent;
  const smog = Math.min(
    RANKING.maxSmogPoints,
    Math.max(0, impact.pm25GramsWeeklySaved) * RANKING.pointsPerPm25GramWeekly,
  );
  const climate = impact.co2KgWeeklySaved * RANKING.pointsPerCo2KgWeekly;
  const divisor = EFFORT_DIVISOR[action.effort] * COST_DIVISOR[action.cost];
  return Math.round(((health + smog + climate) / divisor) * 10) / 10;
}

/**
 * True when the change is big enough to be worth a family's attention: it
 * cuts smog, or it protects the family overall or one member noticeably without
 * leaving the family as a whole breathing more. A smog-cutting change that
 * raises exposure (walking in smog) is still offered, with the trade-off spelled out.
 */
export function isMeaningful(impact: Impact): boolean {
  const cutsSmog = impact.pm25GramsWeeklySaved >= RANKING.minPm25GramsWeekly;
  const protects =
    impact.weightedReductionPercent >= RANKING.minExposurePercent ||
    impact.members.some((member) => member.reductionPercent >= RANKING.minMemberExposurePercent);
  const harms = impact.weightedReductionPercent <= RANKING.maxNetHarmPercent;
  return cutsSmog || (protects && !harms);
}

/** An assessed action before the starting plan is chosen. */
type RankedAction = Omit<AssessedAction, 'recommended'>;

/**
 * Picks the starting plan: the best action of each category first, so the
 * family sees a routine change, an indoor fix and a sustainable switch, then
 * the next-best overall. Never two alternatives from the same group.
 */
export function pickRecommended(ranked: readonly RankedAction[]): Set<string> {
  const picked = new Set<string>();
  const usedGroups = new Set<string>();
  const tryPick = (assessed: RankedAction): void => {
    const { id, group } = assessed.action;
    const free = group === null || !usedGroups.has(group);
    if (picked.size < RANKING.recommendedCount && free && !picked.has(id)) {
      picked.add(id);
      if (group !== null) usedGroups.add(group);
    }
  };
  for (const category of ACTION_CATEGORIES) {
    const best = ranked.find((assessed) => assessed.action.category === category);
    if (best !== undefined) tryPick(best);
  }
  ranked.forEach(tryPick);
  return picked;
}

/**
 * Every catalogue action that applies to this household today, each measured
 * on its own against the baseline, highest score first. Actions whose effect
 * would be negligible are dropped rather than shown.
 */
export function assessActions(input: AssessmentInput): AssessedAction[] {
  const ranked = ACTIONS.filter((action) => evaluateCondition(action.when, input.context))
    .map((action) => {
      const changed = applyEffects(input.baseline, action.effects, input.pm25);
      const impact = compareOutcomes(
        input.members,
        input.baselineOutcome,
        outcomeOf(changed, input.pm25),
      );
      return {
        action,
        impact,
        score: scoreImpact(impact, action),
        explanation: describeImpact(impact),
      };
    })
    .filter((assessed) => isMeaningful(assessed.impact))
    .sort((first, second) => second.score - first.score);
  const recommended = pickRecommended(ranked);
  return ranked.map((assessed) => ({
    ...assessed,
    recommended: recommended.has(assessed.action.id),
  }));
}
