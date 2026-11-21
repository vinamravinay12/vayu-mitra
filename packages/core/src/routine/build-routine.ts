import type { DaySummary } from '../air/summarize-day.js';
import { COMMUTE_MODE_PROFILES } from '../catalog/commute-modes.js';
import { NO_AIRING_PM25, PURIFIER_HOURS } from '../catalog/exposure-constants.js';
import { COOKING_PROFILES, HEATING_PROFILES } from '../catalog/household-sources.js';
import { leavesHome } from '../exposure/build-schedule.js';
import type { MemberScenario, Scenario } from '../types/scenario.js';
import { routineTone, type RoutineItem } from './routine-item.js';

/** Hourly PM2.5 at `hour`, rounded for display. */
const pm25At = (day: DaySummary, hour: number): number => day.hourly[hour]?.pm25 ?? 0;

/** When to open the windows, or the advice to keep them shut all day. */
function airingItem(day: DaySummary): RoutineItem {
  const [first = 13] = day.cleanWindow.hours;
  if (day.cleanWindow.meanPm25 >= NO_AIRING_PM25) {
    return {
      hour: first,
      kind: 'airing',
      tone: 'avoid',
      title: 'Keep windows shut all day',
      detail: `Even the cleanest hours are forecast above ${String(NO_AIRING_PM25)} µg/m³. Air a stuffy room for 5 minutes at most.`,
    };
  }
  return {
    hour: first,
    kind: 'airing',
    tone: 'good',
    title: 'Air the home for 10–15 minutes',
    detail: `PM2.5 is forecast at ${String(day.cleanWindow.meanPm25)} µg/m³ — the cleanest window of the day.`,
  };
}

/** The exercise slot for one member, judged by the air at that hour. */
function exerciseItem(member: MemberScenario, day: DaySummary): RoutineItem {
  const pm25 = pm25At(day, member.exerciseHour);
  if (member.exerciseIndoors) {
    return {
      hour: member.exerciseHour,
      kind: 'exercise',
      tone: 'good',
      title: `${member.name}: exercise indoors`,
      detail: `Outdoor PM2.5 at this hour: ${String(pm25)} µg/m³. Windows shut, purifier on if you have one.`,
    };
  }
  return {
    hour: member.exerciseHour,
    kind: 'exercise',
    tone: routineTone(pm25),
    title: `${member.name}: outdoor exercise`,
    detail: `PM2.5 at this hour: ${String(pm25)} µg/m³.`,
  };
}

/** The morning departure for one commuter, with the protection they have chosen. */
function commuteItem(member: MemberScenario, scenario: Scenario, day: DaySummary): RoutineItem {
  const pm25 = pm25At(day, scenario.departHour);
  const mode = COMMUTE_MODE_PROFILES[member.commuteMode].label.toLowerCase();
  const protection = [
    scenario.maskFactor < 1 && member.ageGroup !== 'infant' ? 'wear the N95' : null,
    scenario.commuteFactors[member.commuteMode] === undefined
      ? null
      : 'windows up, air on recirculate',
  ].filter((step): step is string => step !== null);
  const joined = protection.join('; ');
  const advice = joined === '' ? '' : ` ${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
  return {
    hour: scenario.departHour,
    kind: 'commute',
    tone: routineTone(pm25),
    title: `${member.name} leaves for ${member.daytime === 'school' ? 'school' : 'work'} by ${mode}`,
    detail: `PM2.5 outside: ${String(pm25)} µg/m³.${advice}`,
  };
}

/** Advice for the evening, when cooking and heating smoke build up indoors. */
function eveningItems(scenario: Scenario): RoutineItem[] {
  const items: RoutineItem[] = [];
  const [purifierStart = 18] = PURIFIER_HOURS;
  if (scenario.purifierReduction > 0) {
    items.push({
      hour: purifierStart,
      kind: 'purifier',
      tone: 'good',
      title: 'Purifier on in the bedroom until morning',
      detail: 'Door and windows shut so it cleans the same air all night.',
    });
  }
  const cooking = COOKING_PROFILES[scenario.cookingFuel];
  if (cooking.indoorAddUgM3 * scenario.cookingSmokeFactor >= 20) {
    items.push({
      hour: 19,
      kind: 'cooking',
      tone: 'caution',
      title: 'Dinner: exhaust fan on, lids on',
      detail: `${cooking.label} cooking adds about ${String(Math.round(cooking.indoorAddUgM3 * scenario.cookingSmokeFactor))} µg/m³ indoors while the stove is on.`,
    });
  }
  if (HEATING_PROFILES[scenario.heating].indoorAddUgM3 >= 50) {
    items.push({
      hour: 21,
      kind: 'heating',
      tone: 'avoid',
      title: 'Put the heater out before bed',
      detail: 'Never sleep with a coal, wood or kerosene heater burning in a closed room.',
    });
  }
  return items;
}

/** A warning for the smoggiest hour, when it is bad enough to plan around. */
function peakItem(day: DaySummary): RoutineItem[] {
  return day.peak.pm25 < 90
    ? []
    : [
        {
          hour: day.peak.hour,
          kind: 'peak',
          tone: 'avoid',
          title: 'Smog peaks — stay inside',
          detail: `PM2.5 is forecast to reach ${String(day.peak.pm25)} µg/m³ around this hour.`,
        },
      ];
}

/**
 * Today's routine, hour by hour, for the scenario the family has chosen.
 * Built only from the forecast and the scenario, so it changes the moment a
 * choice changes.
 */
export function buildRoutine(day: DaySummary, scenario: Scenario): RoutineItem[] {
  const exercise = scenario.members
    .filter((member) => member.outdoorExercise !== 'none')
    .map((member) => exerciseItem(member, day));
  const commutes = scenario.members
    .filter(leavesHome)
    .map((member) => commuteItem(member, scenario, day));
  return [
    airingItem(day),
    ...exercise,
    ...commutes,
    ...eveningItems(scenario),
    ...peakItem(day),
  ].sort((first, second) => first.hour - second.hour);
}
