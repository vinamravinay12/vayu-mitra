import { describe, expect, it } from 'vitest';
import { profileSchema } from '../schemas/profile.js';
import { completeProfile, defaultMember, EMPTY_DRAFT } from './complete-profile.js';

describe('completeProfile', () => {
  it('builds a valid profile from nothing and lists every assumption', () => {
    const completed = completeProfile(EMPTY_DRAFT);
    expect(completed.members).toHaveLength(1);
    expect(completed.members[0]?.name).toBe('You');
    expect(completed.assumed).toContain('members.0.ageGroup');
    expect(completed.assumed).toContain('home.cookingFuel');
    expect(completed.assumed).toContain('lifestyle.departHour');
    const place = { name: 'Delhi', region: '', country: 'India', latitude: 28.6, longitude: 77.2 };
    expect(profileSchema.safeParse({ ...completed, place }).success).toBe(true);
  });

  it('keeps valid draft values and replaces out-of-range ones', () => {
    const completed = completeProfile({
      ...EMPTY_DRAFT,
      members: [
        {
          name: 'Ravi',
          ageGroup: 'child',
          conditions: ['asthma', 'asthma'],
          daytime: null,
          commuteMode: 'walk',
          commuteKm: 500,
          outdoorExercise: 'vigorous',
          exerciseHour: 30,
        },
      ],
      home: { ...EMPTY_DRAFT.home, cookingFuel: 'biomass', indoorSources: ['incense', 'incense'] },
      lifestyle: { ...EMPTY_DRAFT.lifestyle, communityHouseholds: 80 },
    });
    const [member] = completed.members;
    expect(member).toMatchObject({
      name: 'Ravi',
      ageGroup: 'child',
      daytime: 'school',
      commuteMode: 'walk',
      commuteKm: 4,
      exerciseHour: 7,
    });
    expect(member?.conditions).toEqual(['asthma']);
    expect(completed.home.cookingFuel).toBe('biomass');
    expect(completed.home.indoorSources).toEqual(['incense']);
    expect(completed.lifestyle.communityHouseholds).toBe(80);
    expect(completed.assumed).toEqual(
      expect.arrayContaining([
        'members.0.commuteKm',
        'members.0.exerciseHour',
        'members.0.daytime',
      ]),
    );
    expect(completed.assumed).not.toContain('members.0.name');
  });
});

describe('defaultMember', () => {
  it('picks a daytime by life stage', () => {
    expect(defaultMember('infant', 1)).toMatchObject({ daytime: 'home', name: 'Member 2' });
    expect(defaultMember('teen', 0).daytime).toBe('school');
    expect(defaultMember('adult', 0)).toMatchObject({ daytime: 'office', commuteKm: 10 });
  });
});
