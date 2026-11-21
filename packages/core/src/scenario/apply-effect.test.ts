import { describe, expect, it } from 'vitest';
import { makeMember, makeProfile, winterCurve } from '../test-utils/fixtures.js';
import { applyEffect, applyEffects, cleanestFreeHour } from './apply-effect.js';
import {
  OWNED_EXHAUST_FACTOR,
  OWNED_PURIFIER_REDUCTION,
  scenarioFromProfile,
} from './from-profile.js';

const pm25 = winterCurve(150);
const base = scenarioFromProfile(makeProfile());

describe('scenarioFromProfile', () => {
  it('carries over what the family already owns', () => {
    const owned = scenarioFromProfile(
      makeProfile({ home: { ...makeProfile().home, hasPurifier: true, hasKitchenExhaust: true } }),
    );
    expect(owned.purifierReduction).toBe(OWNED_PURIFIER_REDUCTION);
    expect(owned.cookingSmokeFactor).toBe(OWNED_EXHAUST_FACTOR);
    expect(base.purifierReduction).toBe(0);
    expect(base.windowHours).toEqual([7, 8, 9]);
  });
});

describe('cleanestFreeHour', () => {
  it('picks the cleanest hour the member is free, or keeps theirs', () => {
    const [adult, senior] = base.members;
    expect(adult && cleanestFreeHour(adult, 8, pm25)).toBe(18);
    expect(senior && cleanestFreeHour(senior, 8, pm25)).toBe(14);
    expect(senior && cleanestFreeHour(senior, 8, [])).toBe(6);
  });
});

describe('applyEffect', () => {
  it('moves exercise for exercisers only', () => {
    const moved = applyEffect(base, { kind: 'move-exercise-to-clean-hour' }, pm25);
    expect(moved.members.map((member) => member.exerciseHour)).toEqual([7, 14, 15]);
    const indoors = applyEffect(base, { kind: 'exercise-indoors' }, pm25);
    expect(indoors.members.map((member) => member.exerciseIndoors)).toEqual([false, true, true]);
  });

  it('changes masks, cabins, sharing and ventilation', () => {
    expect(applyEffect(base, { kind: 'mask-outdoors', factor: 0.4 }, pm25).maskFactor).toBe(0.4);
    expect(
      applyEffect(base, { kind: 'scale-commute', modes: ['car-petrol'], factor: 0.5 }, pm25)
        .commuteFactors,
    ).toEqual({ 'car-petrol': 0.5 });
    expect(applyEffect(base, { kind: 'share-vehicle', occupants: 3 }, pm25).vehicleOccupants).toBe(
      3,
    );
    expect(applyEffect(base, { kind: 'ventilate-in-clean-window' }, pm25).windowHours).toEqual([
      13, 14,
    ]);
  });

  it('switches only eligible commuters', () => {
    const switched = applyEffect(
      base,
      { kind: 'switch-commute', from: ['car-petrol'], to: 'metro', maxKm: 40 },
      pm25,
    );
    expect(switched.members.map((member) => member.commuteMode)).toEqual([
      'metro',
      'car-petrol',
      'bus',
    ]);
    const tooFar = applyEffect(
      base,
      { kind: 'switch-commute', from: ['car-petrol'], to: 'walk', maxKm: 3 },
      pm25,
    );
    expect(tooFar.members[0]?.commuteMode).toBe('car-petrol');
  });

  it('changes the home', () => {
    expect(
      applyEffect(base, { kind: 'add-purifier', reduction: 0.6 }, pm25).purifierReduction,
    ).toBe(0.6);
    expect(applyEffect(base, { kind: 'scale-infiltration', factor: 0.5 }, pm25).infiltration).toBe(
      0.4,
    );
    expect(
      applyEffect(base, { kind: 'scale-cooking-smoke', factor: 0.4 }, pm25).cookingSmokeFactor,
    ).toBe(0.4);
    expect(
      applyEffect(base, { kind: 'remove-source', source: 'incense' }, pm25).indoorSources,
    ).toEqual([]);
    expect(applyEffect(base, { kind: 'switch-cooking', to: 'induction' }, pm25).cookingFuel).toBe(
      'induction',
    );
    expect(applyEffect(base, { kind: 'switch-heating', to: 'electric' }, pm25).heating).toBe(
      'electric',
    );
    expect(
      applyEffect({ ...base, burnsWaste: true }, { kind: 'stop-waste-burning' }, pm25).burnsWaste,
    ).toBe(false);
    expect(
      applyEffect(
        { ...base, generatorHoursPerWeek: 10 },
        { kind: 'scale-generator', factor: 0.2 },
        pm25,
      ).generatorHoursPerWeek,
    ).toBe(2);
  });

  it('applies a list of effects in order', () => {
    const changed = applyEffects(
      base,
      [
        { kind: 'mask-outdoors', factor: 0.4 },
        { kind: 'share-vehicle', occupants: 2 },
      ],
      pm25,
    );
    expect([changed.maskFactor, changed.vehicleOccupants]).toEqual([0.4, 2]);
    expect(applyEffects(base, [], pm25)).toBe(base);
  });

  it('leaves non-exercisers alone', () => {
    const scenario = scenarioFromProfile(makeProfile({ members: [makeMember()] }));
    expect(
      applyEffect(scenario, { kind: 'exercise-indoors' }, pm25).members[0]?.exerciseIndoors,
    ).toBe(false);
  });
});
