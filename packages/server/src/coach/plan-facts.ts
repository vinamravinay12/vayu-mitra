import { CATEGORY_GUIDANCE, COST_LABELS, type CleanAirPlan } from '@vayu/core';

/** How many not-yet-chosen options the AI sees, so it can answer "what else can we do?". */
const OTHER_OPTIONS = 5;

/**
 * The facts the AI coach may talk about: a compact view of the engine's plan.
 *
 * The model never sees the raw profile and never computes anything; it reads
 * these numbers and words them. The grounding check later rejects any answer
 * containing a number that is not in this object.
 */
export function planFacts(plan: CleanAirPlan) {
  const chosen = new Set(plan.chosenIds);
  const impact = plan.chosen.impact;
  return {
    place: `${plan.place.name}${plan.place.region === '' ? '' : `, ${plan.place.region}`}`,
    date: plan.today.date,
    airToday: {
      aqi: plan.today.aqi.value,
      category: plan.today.aqi.category,
      meaning: CATEGORY_GUIDANCE[plan.today.aqi.category],
      meanPm25: plan.today.meanPm25,
      timesWhoGuideline: plan.today.whoMultiple,
      worstHour: plan.today.peak.hour,
      worstHourPm25: plan.today.peak.pm25,
      cleanestHours: plan.today.cleanWindow.hours,
      cleanestHoursPm25: plan.today.cleanWindow.meanPm25,
    },
    tomorrow:
      plan.tomorrow === null ? null : { aqi: plan.tomorrow.aqi.value, trend: plan.tomorrow.trend },
    family: impact.members.map((member) => ({
      name: member.name,
      dailyDoseBeforeUg: member.beforeDoseUg,
      dailyDoseAfterUg: member.afterDoseUg,
      cutPercent: member.reductionPercent,
      cigarettesPerDayBefore: member.beforeCigarettes,
      cigarettesPerDayAfter: member.afterCigarettes,
    })),
    chosenActions: plan.actions
      .filter((assessed) => chosen.has(assessed.action.id))
      .map((assessed) => ({
        id: assessed.action.id,
        title: assessed.action.title,
        cost: COST_LABELS[assessed.action.cost],
        impact: assessed.explanation,
      })),
    otherOptions: plan.actions
      .filter((assessed) => !chosen.has(assessed.action.id))
      .slice(0, OTHER_OPTIONS)
      .map((assessed) => ({
        id: assessed.action.id,
        title: assessed.action.title,
        impact: assessed.explanation,
      })),
    totals: {
      familyExposureCutPercent: impact.weightedReductionPercent,
      pm25GramsKeptOutWeekly: impact.pm25GramsWeeklySaved,
      pm25GramsKeptOutSeason: impact.pm25GramsSeasonSaved,
      co2KgSavedWeekly: impact.co2KgWeeklySaved,
      communityHouseholds: plan.community.households,
      communityPm25KgSeasonIfAllDoThis: plan.community.sameChoicesPm25KgSeason,
    },
    safetyAlerts: plan.alerts.map((alert) => alert.title),
  };
}

export type PlanFacts = ReturnType<typeof planFacts>;
