/**
 * Vayu Mitra's clean-air engine. Pure functions over plain data: no network,
 * no storage, no clock of its own. The browser and the server both run it,
 * so the plan a family sees and the facts the AI coach is grounded in are
 * computed by the same code.
 */
export * from './catalog/vocabulary.js';
export {
  AQI_CATEGORIES,
  CATEGORY_GUIDANCE,
  WHO_PM25_24H_GUIDELINE,
  PM25_PER_CIGARETTE,
} from './catalog/aqi-bands.js';
export type { AqiCategory } from './catalog/aqi-bands.js';
export { COMMUTE_MODE_PROFILES } from './catalog/commute-modes.js';
export {
  COOKING_PROFILES,
  HEATING_PROFILES,
  INDOOR_SOURCE_PROFILES,
} from './catalog/household-sources.js';
export { AGE_LABELS, CONDITION_LABELS } from './catalog/vulnerability.js';
export { COST_LABELS } from './catalog/ranking.js';
export { ACTIONS, ACTIONS_BY_ID } from './catalog/actions/index.js';
export { SMOG_SEASON_WEEKS } from './catalog/exposure-constants.js';
export type { HealthAlertRule, AlertSeverity } from './catalog/health-alerts.js';

export * from './schemas/profile.js';
export * from './schemas/air.js';
export * from './schemas/draft.js';

export {
  completeProfile,
  defaultMember,
  DEFAULT_HOME,
  DEFAULT_LIFESTYLE,
  EMPTY_DRAFT,
} from './profile/complete-profile.js';
export type { CompletedProfile } from './profile/complete-profile.js';
export { computeAqi } from './aqi/compute-aqi.js';
export type { AqiReading } from './aqi/compute-aqi.js';
export { localClock } from './air/select-day.js';
export type { DaySummary, HourReading } from './air/summarize-day.js';
export { toggleChoice } from './actions/choose-actions.js';
export type { AssessedAction } from './actions/assess-actions.js';
export type { Impact, MemberImpact, ScenarioOutcome } from './actions/compare-scenarios.js';
export type { MemberExposure, DoseBreakdown } from './exposure/model-exposure.js';
export type { WeeklyEmissions, EmissionSource } from './emissions/estimate-emissions.js';
export { EMISSION_SOURCES } from './emissions/estimate-emissions.js';
export type { RoutineItem, RoutineKind, RoutineTone } from './routine/routine-item.js';
export type { CommunityImpact, CommunityActionImpact } from './community/community-impact.js';
export { formatAmount } from './explain/describe-impact.js';
export { buildPlan } from './plan/build-plan.js';
export type { CleanAirPlan, Outlook, PlanInput } from './plan/build-plan.js';
export type { ActionDefinition, Effect } from './types/action.js';
