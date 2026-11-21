import { SMOG_SEASON_WEEKS } from '../catalog/exposure-constants.js';
import type { Impact, MemberImpact } from '../actions/compare-scenarios.js';

/** Below this, a change in CO2 is noise and is not mentioned. */
const CO2_MENTION_KG = 0.5;

/** Below this, an exposure change is noise and is not mentioned. */
const EXPOSURE_MENTION_PERCENT = 1;

/** Formats a number for a sentence: whole above 10, one decimal below. */
export function formatAmount(value: number): string {
  const magnitude = Math.abs(value);
  return magnitude >= 10
    ? Math.round(magnitude).toLocaleString('en-IN')
    : String(Math.round(magnitude * 10) / 10);
}

/** The member this change protects most, by percentage cut. */
export function mostProtected(impact: Impact): MemberImpact | undefined {
  return impact.members.reduce<MemberImpact | undefined>(
    (best, member) =>
      best === undefined || member.reductionPercent > best.reductionPercent ? member : best,
    undefined,
  );
}

/** The sentence about the family's lungs, if the change protects anyone. */
function exposureSentence(impact: Impact): string | null {
  const member = mostProtected(impact);
  if (member === undefined || member.reductionPercent < EXPOSURE_MENTION_PERCENT) {
    return null;
  }
  const others =
    impact.members.length > 1 && impact.weightedReductionPercent >= EXPOSURE_MENTION_PERCENT
      ? ` Across the family, weighted towards the most vulnerable, exposure falls ${formatAmount(impact.weightedReductionPercent)}%.`
      : '';
  return (
    `Cuts ${member.name}'s daily PM2.5 dose by ${formatAmount(member.reductionPercent)}% ` +
    `(${formatAmount(member.beforeDoseUg)} → ${formatAmount(member.afterDoseUg)} µg).${others}`
  );
}

/** The sentence about the shared air, if the change cuts emissions. */
function smogSentence(impact: Impact): string | null {
  if (impact.pm25GramsWeeklySaved <= 0) {
    return null;
  }
  return (
    `Keeps ${formatAmount(impact.pm25GramsWeeklySaved)} g of PM2.5 a week out of your neighbourhood's air ` +
    `— ${formatAmount(impact.pm25GramsSeasonSaved)} g over a ${String(SMOG_SEASON_WEEKS)}-week smog season.`
  );
}

/** The sentence about climate, including when a change adds CO2 elsewhere. */
function co2Sentence(impact: Impact): string | null {
  if (impact.co2KgWeeklySaved >= CO2_MENTION_KG) {
    return `Saves ${formatAmount(impact.co2KgWeeklySaved)} kg of CO₂ a week.`;
  }
  if (impact.co2KgWeeklySaved <= -CO2_MENTION_KG) {
    return `Trade-off: it adds about ${formatAmount(impact.co2KgWeeklySaved)} kg of CO₂ a week through the power grid, even as it clears your air.`;
  }
  return null;
}

/** A warning when the change makes someone's day worse, so a trade-off is never hidden. */
function harmSentence(impact: Impact): string | null {
  const harmed = impact.members.filter(
    (member) => member.reductionPercent <= -EXPOSURE_MENTION_PERCENT,
  );
  if (harmed.length === 0) {
    return null;
  }
  const names = harmed.map(
    (member) => `${member.name}'s dose rises ${formatAmount(member.reductionPercent)}%`,
  );
  return `Watch out: ${names.join(' and ')}, because it shifts their time into hours when the air they breathe is smokier.`;
}

/**
 * Explains a computed impact in plain sentences. Every number comes from the
 * models; this function only chooses which facts are worth saying.
 */
export function describeImpact(impact: Impact): string[] {
  return [
    exposureSentence(impact),
    harmSentence(impact),
    smogSentence(impact),
    co2Sentence(impact),
  ].filter((sentence): sentence is string => sentence !== null);
}
