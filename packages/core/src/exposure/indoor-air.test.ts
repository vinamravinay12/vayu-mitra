import { describe, expect, it } from 'vitest';
import { scenarioFromProfile } from '../scenario/from-profile.js';
import { makeProfile } from '../test-utils/fixtures.js';
import type { Scenario } from '../types/scenario.js';
import { indoorConcentrations, indoorSourceLoad, purifierRemoval } from './indoor-air.js';

const base: Scenario = scenarioFromProfile(makeProfile());
const flat = Array.from({ length: 24 }, () => 100);

describe('indoorSourceLoad', () => {
  it('adds cooking, heating and other sources in their hours', () => {
    expect(indoorSourceLoad(base, 3)).toBe(0);
    expect(indoorSourceLoad(base, 7)).toBe(40 + 80);
    expect(indoorSourceLoad({ ...base, cookingSmokeFactor: 0.5 }, 13)).toBe(20);
    expect(indoorSourceLoad({ ...base, heating: 'coal-or-wood', indoorSources: [] }, 2)).toBe(120);
  });
});

describe('purifierRemoval', () => {
  it('works fully with windows shut, partly with them open, never outside its hours', () => {
    const purifying = { ...base, purifierReduction: 0.6 };
    expect(purifierRemoval(base, 22)).toBe(0);
    expect(purifierRemoval(purifying, 22)).toBe(0.6);
    expect(purifierRemoval(purifying, 7)).toBeCloseTo(0.18, 5);
    expect(purifierRemoval(purifying, 12)).toBe(0);
  });
});

describe('indoorConcentrations', () => {
  it('lets in outdoor air by infiltration, or nearly all of it with windows open', () => {
    const indoor = indoorConcentrations({ ...base, indoorSources: [] }, flat);
    expect(indoor[3]).toBeCloseTo(80, 5);
    expect(indoor[9]).toBeCloseTo(95, 5);
    expect(indoor[13]).toBeCloseTo(120, 5);
  });
});
