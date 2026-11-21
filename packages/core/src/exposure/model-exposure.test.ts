import { describe, expect, it } from 'vitest';
import { scenarioFromProfile } from '../scenario/from-profile.js';
import { makeMember, makeProfile } from '../test-utils/fixtures.js';
import { modelExposure, type MemberExposure } from './model-exposure.js';

const flat = Array.from({ length: 24 }, () => 100);

/** The breakdown adds up to the dose, and cigarettes follow from the mean. */
function expectConsistent(exposure: MemberExposure): void {
  const { home, commute, away, exercise } = exposure.breakdown;
  expect(exposure.doseUg).toBeCloseTo(home + commute + away + exercise, 5);
  expect(exposure.cigarettesPerDay).toBeCloseTo(exposure.meanUgM3 / 22, 5);
}

describe('modelExposure', () => {
  it('splits each member’s dose by where it was breathed', () => {
    const [adult, senior, child] = modelExposure(scenarioFromProfile(makeProfile()), flat);
    expect(adult?.breakdown.commute).toBeGreaterThan(0);
    expect(adult?.breakdown.away).toBeGreaterThan(0);
    expect(senior?.breakdown.commute).toBe(0);
    expect(senior?.breakdown.exercise).toBeGreaterThan(0);
    expect(child?.breakdown.exercise).toBeGreaterThan(0);
    for (const exposure of [adult, senior, child].filter((entry) => entry !== undefined)) {
      expectConsistent(exposure);
    }
  });

  it('applies masks to everyone except babies', () => {
    const profile = makeProfile({
      members: [
        makeMember({ ageGroup: 'infant', daytime: 'outdoors' }),
        makeMember({ daytime: 'outdoors' }),
      ],
    });
    const scenario = scenarioFromProfile(profile);
    const without = modelExposure(scenario, flat);
    const masked = modelExposure({ ...scenario, maskFactor: 0.4 }, flat);
    expect(masked[0]?.doseUg).toBeCloseTo(without[0]?.doseUg ?? 0, 5);
    expect(masked[1]?.doseUg).toBeLessThan(without[1]?.doseUg ?? 0);
  });

  it('uses the cabin factor for the member’s own mode', () => {
    const scenario = scenarioFromProfile(makeProfile({ members: [makeMember()] }));
    const plain = modelExposure(scenario, flat)[0]?.breakdown.commute ?? 0;
    const sealed = modelExposure({ ...scenario, commuteFactors: { 'car-petrol': 0.5 } }, flat)[0]
      ?.breakdown.commute;
    expect(sealed).toBeCloseTo(plain / 2, 5);
  });

  it('treats a missing hour as clean air', () => {
    const scenario = scenarioFromProfile(
      makeProfile({ members: [makeMember({ daytime: 'outdoors' })] }),
    );
    expect(modelExposure(scenario, [])[0]?.doseUg).toBe(0);
  });
});
