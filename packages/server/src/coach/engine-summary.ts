import { formatAmount, type CleanAirPlan } from '@vayu/core';

/** The coach's answer as the browser receives it. */
export interface CoachSummary {
  readonly headline: string;
  readonly summary: string;
  readonly priorities: readonly { readonly actionId: string; readonly why: string }[];
  /** `ai` when Gemini wrote it and it passed every check; `engine` for the deterministic fallback. */
  readonly source: 'ai' | 'engine';
}

/** Human-readable AQI category. */
const categoryWords = (category: string): string => category.replace('-', ' ');

/**
 * A deterministic summary used whenever the AI is unavailable or its answer
 * fails a check. It says less than the coach, but every word is true.
 */
export function engineSummary(plan: CleanAirPlan): CoachSummary {
  const { today, chosen } = plan;
  const protectedMost = [...chosen.impact.members].sort(
    (first, second) => second.reductionPercent - first.reductionPercent,
  )[0];
  const memberSentence =
    protectedMost === undefined || protectedMost.reductionPercent <= 0
      ? 'Choose a few actions below to see how much they protect each of you.'
      : `With the actions you have chosen, ${protectedMost.name}'s daily PM2.5 dose falls ${formatAmount(protectedMost.reductionPercent)}%, from about ${formatAmount(protectedMost.beforeCigarettes)} to ${formatAmount(protectedMost.afterCigarettes)} cigarettes' worth a day.`;
  const smogSentence =
    chosen.impact.pm25GramsSeasonSaved > 0
      ? ` Your household would also keep ${formatAmount(chosen.impact.pm25GramsSeasonSaved)} g of PM2.5 out of the neighbourhood's air this season.`
      : '';
  return {
    headline: `${plan.place.name}: AQI ${String(today.aqi.value)} (${categoryWords(today.aqi.category)}) today`,
    summary:
      `Today's PM2.5 averages ${formatAmount(today.meanPm25)} µg/m³, ${formatAmount(today.whoMultiple)} times the WHO guideline. ` +
      `${memberSentence}${smogSentence}`,
    priorities: plan.actions
      .filter((assessed) => plan.chosenIds.includes(assessed.action.id))
      .slice(0, 3)
      .map((assessed) => ({
        actionId: assessed.action.id,
        why: assessed.explanation[0] ?? assessed.action.why,
      })),
    source: 'engine',
  };
}
