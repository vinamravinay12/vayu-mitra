import { describe, expect, it } from 'vitest';
import { scenarioFromProfile } from '../scenario/from-profile.js';
import { makeMember, makeProfile } from '../test-utils/fixtures.js';
import { EMISSION_SOURCES, estimateEmissions } from './estimate-emissions.js';

describe('estimateEmissions', () => {
  it('adds commuting, cooking and indoor sources per week', () => {
    const scenario = scenarioFromProfile(makeProfile());
    const emissions = estimateEmissions(scenario);
    // Car: 2 × 12 km × 5 days × 150 g; bus: 2 × 4 × 5 × 25 g.
    expect(emissions.co2BySource.commute).toBeCloseTo(18 + 1, 5);
    expect(emissions.pm25BySource.cooking).toBeCloseTo(2.1, 5);
    expect(emissions.pm25BySource.indoor).toBeCloseTo(1.4, 5);
    const sum = EMISSION_SOURCES.reduce(
      (total, source) => total + emissions.pm25BySource[source],
      0,
    );
    expect(emissions.pm25Grams).toBeCloseTo(sum, 5);
  });

  it('divides private vehicles between occupants and counts waste and generators', () => {
    const scenario = scenarioFromProfile(
      makeProfile({
        members: [makeMember()],
        lifestyle: { ...makeProfile().lifestyle, burnsWaste: true, generatorHoursPerWeek: 10 },
      }),
    );
    const alone = estimateEmissions(scenario);
    const shared = estimateEmissions({ ...scenario, vehicleOccupants: 3 });
    expect(shared.co2BySource.commute).toBeCloseTo(alone.co2BySource.commute / 3, 5);
    expect(alone.pm25BySource.waste).toBe(16);
    expect(alone.co2BySource.generator).toBe(8);
  });
});
