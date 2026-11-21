import { describe, expect, it } from 'vitest';
import { selectDay } from '../air/select-day.js';
import { summarizeDay } from '../air/summarize-day.js';
import { fieldsOf } from '../conditions/evaluate-condition.js';
import { deriveContext } from '../context/derive-context.js';
import { scenarioFromProfile } from '../scenario/from-profile.js';
import { makeProfile, makeSnapshot } from '../test-utils/fixtures.js';
import { ACTIONS, ACTIONS_BY_ID } from './actions/index.js';
import {
  AQI_CATEGORIES,
  CATEGORY_GUIDANCE,
  PM10_BREAKPOINTS,
  PM25_BREAKPOINTS,
} from './aqi-bands.js';
import { COMMUNITY_ACTIONS } from './community-actions.js';
import { COMMUTE_MODE_PROFILES } from './commute-modes.js';
import { BREATHING_RATES, INFILTRATION, WINDOW_HOURS } from './exposure-constants.js';
import { HEALTH_ALERT_RULES } from './health-alerts.js';
import { COOKING_PROFILES, HEATING_PROFILES, INDOOR_SOURCE_PROFILES } from './household-sources.js';
import { COST_LABELS, COST_DIVISOR, EFFORT_DIVISOR } from './ranking.js';
import {
  ACTION_CATEGORIES,
  AGE_GROUPS,
  COMMUTE_MODES,
  COOKING_FUELS,
  HEALTH_CONDITIONS,
  HEATING_TYPES,
  HOME_TIGHTNESS,
  INDOOR_SOURCES,
  isCarMode,
  VENTILATION_HABITS,
} from './vocabulary.js';
import { AGE_LABELS, AGE_WEIGHT, CONDITION_LABELS, CONDITION_WEIGHT } from './vulnerability.js';

/** Invariants over the declarative catalogue: data mistakes fail here, not in front of a family. */

const profile = makeProfile();
const day = selectDay(makeSnapshot(), '2026-11-21');
const context = deriveContext(profile, scenarioFromProfile(profile), summarizeDay(day), day.pm25);
const knownFields = new Set(Object.keys(context));

describe('actions', () => {
  it('have unique ids, real categories, steps and reasons', () => {
    expect(ACTIONS_BY_ID.size).toBe(ACTIONS.length);
    for (const action of ACTIONS) {
      expect(ACTION_CATEGORIES).toContain(action.category);
      expect(action.steps.length, action.id).toBeGreaterThan(0);
      expect(action.why.length, action.id).toBeGreaterThan(20);
      expect(action.effects.length, action.id).toBeGreaterThan(0);
    }
  });

  it('only read context fields the engine defines', () => {
    for (const action of ACTIONS) {
      for (const field of fieldsOf(action.when)) {
        expect(knownFields.has(field), `${action.id} reads ${field}`).toBe(true);
      }
    }
    for (const rule of HEALTH_ALERT_RULES) {
      for (const field of fieldsOf(rule.when)) {
        expect(knownFields.has(field), `${rule.id} reads ${field}`).toBe(true);
      }
    }
  });

  it('cover every category, and every group has real alternatives', () => {
    for (const category of ACTION_CATEGORIES) {
      expect(ACTIONS.some((action) => action.category === category)).toBe(true);
    }
    const groups = ACTIONS.flatMap((action) => (action.group === null ? [] : [action.group]));
    for (const group of new Set(groups)) {
      expect(groups.filter((candidate) => candidate === group).length, group).toBeGreaterThan(1);
    }
  });

  it('use factors between 0 and 1 for every reduction', () => {
    for (const effect of ACTIONS.flatMap((action) => action.effects)) {
      if ('factor' in effect) expect(effect.factor).toBeGreaterThan(0);
      if ('factor' in effect) expect(effect.factor).toBeLessThanOrEqual(1);
      if ('reduction' in effect) expect(effect.reduction).toBeLessThan(1);
    }
  });
});

describe('AQI bands', () => {
  it('are contiguous, increasing and cover every category', () => {
    for (const bands of [PM25_BREAKPOINTS, PM10_BREAKPOINTS]) {
      expect(bands.map((band) => band.category)).toEqual([...AQI_CATEGORIES]);
      bands.forEach((band, index) => {
        expect(band.concentrationHigh).toBeGreaterThan(band.concentrationLow);
        expect(band.concentrationLow).toBe(bands[index - 1]?.concentrationHigh ?? 0);
        expect(band.indexLow).toBe(bands[index - 1]?.indexHigh ?? 0);
      });
    }
    expect(Object.keys(CATEGORY_GUIDANCE)).toEqual([...AQI_CATEGORIES]);
  });
});

describe('model data', () => {
  it('has a profile for every vocabulary value', () => {
    expect(Object.keys(COMMUTE_MODE_PROFILES).sort()).toEqual([...COMMUTE_MODES].sort());
    expect(Object.keys(COOKING_PROFILES).sort()).toEqual([...COOKING_FUELS].sort());
    expect(Object.keys(HEATING_PROFILES).sort()).toEqual([...HEATING_TYPES].sort());
    expect(Object.keys(INDOOR_SOURCE_PROFILES).sort()).toEqual([...INDOOR_SOURCES].sort());
    expect(Object.keys(INFILTRATION).sort()).toEqual([...HOME_TIGHTNESS].sort());
    expect(Object.keys(WINDOW_HOURS).sort()).toEqual([...VENTILATION_HABITS].sort());
    expect(Object.keys(BREATHING_RATES).sort()).toEqual([...AGE_GROUPS].sort());
    expect(Object.keys(AGE_WEIGHT).sort()).toEqual([...AGE_GROUPS].sort());
    expect(Object.keys(AGE_LABELS).sort()).toEqual([...AGE_GROUPS].sort());
    expect(Object.keys(CONDITION_WEIGHT).sort()).toEqual([...HEALTH_CONDITIONS].sort());
    expect(Object.keys(CONDITION_LABELS).sort()).toEqual([...HEALTH_CONDITIONS].sort());
    expect(Object.keys(COST_LABELS)).toEqual(Object.keys(COST_DIVISOR));
    expect(Object.keys(EFFORT_DIVISOR)).toEqual(['easy', 'moderate', 'hard']);
  });

  it('keeps physical values in sensible ranges', () => {
    for (const mode of Object.values(COMMUTE_MODE_PROFILES)) {
      expect(mode.exposureFactor).toBeGreaterThan(0);
      expect(mode.speedKmPerHour).toBeGreaterThan(0);
    }
    for (const rates of Object.values(BREATHING_RATES)) {
      expect(rates.sleep).toBeLessThanOrEqual(rates.rest);
      expect(rates.rest).toBeLessThanOrEqual(rates.light);
      expect(rates.light).toBeLessThanOrEqual(rates.vigorous);
    }
    for (const source of [
      ...Object.values(COOKING_PROFILES),
      ...Object.values(HEATING_PROFILES),
      ...Object.values(INDOOR_SOURCE_PROFILES),
    ]) {
      expect(source.hours.every((hour) => hour >= 0 && hour <= 23)).toBe(true);
    }
    expect(Object.values(INFILTRATION).every((ratio) => ratio > 0 && ratio < 1)).toBe(true);
  });

  it('knows which modes are cars', () => {
    expect(isCarMode('car-electric')).toBe(true);
    expect(isCarMode('metro')).toBe(false);
  });

  it('has community actions with participation shares', () => {
    for (const action of COMMUNITY_ACTIONS) {
      expect(action.typicalParticipation).toBeGreaterThan(0);
      expect(action.typicalParticipation).toBeLessThanOrEqual(1);
      expect(action.steps.length).toBeGreaterThan(0);
    }
  });
});
