import { describe, expect, it } from 'vitest';
import { selectDay } from '../air/select-day.js';
import { summarizeDay } from '../air/summarize-day.js';
import { scenarioFromProfile } from '../scenario/from-profile.js';
import { makeMember, makeProfile, makeSnapshot } from '../test-utils/fixtures.js';
import { deriveContext } from './derive-context.js';

const day = selectDay(makeSnapshot('2026-11-21', 150), '2026-11-21');
const summary = summarizeDay(day);

describe('deriveContext', () => {
  it('describes the household and the day for catalogue conditions', () => {
    const profile = makeProfile();
    const context = deriveContext(profile, scenarioFromProfile(profile), summary, day.pm25);
    expect(context).toMatchObject({
      aqiCategory: 'very-poor',
      hasSenior: true,
      hasChild: true,
      hasInfant: false,
      hasRespiratory: true,
      leavesHome: true,
      commuteModes: ['car-petrol', 'bus'],
      shortVehicleTrip: false,
      exercisesOutdoors: true,
      exerciseOffCleanHour: true,
      householdSize: 3,
    });
  });

  it('spots short motorised trips and exercise already in the clean hour', () => {
    const profile = makeProfile({
      members: [
        makeMember({
          commuteMode: 'two-wheeler',
          commuteKm: 2,
          daytime: 'home',
          outdoorExercise: 'light',
          exerciseHour: 14,
        }),
      ],
    });
    const scenario = scenarioFromProfile(profile);
    expect(deriveContext(profile, scenario, summary, day.pm25)).toMatchObject({
      shortVehicleTrip: false,
      exerciseOffCleanHour: false,
      leavesHome: false,
    });
    const commuter = makeProfile({
      members: [makeMember({ commuteMode: 'auto-rickshaw', commuteKm: 2 })],
    });
    expect(
      deriveContext(commuter, scenarioFromProfile(commuter), summary, day.pm25).shortVehicleTrip,
    ).toBe(true);
    expect(deriveContext(profile, scenario, summary, []).exerciseOffCleanHour).toBe(false);
  });
});
