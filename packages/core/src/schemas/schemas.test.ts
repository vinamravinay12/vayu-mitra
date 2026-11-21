import { describe, expect, it } from 'vitest';
import { makeProfile, makeSnapshot } from '../test-utils/fixtures.js';
import { airSnapshotSchema } from './air.js';
import { profileDraftSchema } from './draft.js';
import { profileSchema } from './profile.js';
import { EMPTY_DRAFT } from '../profile/complete-profile.js';

describe('schemas', () => {
  it('accept the fixtures', () => {
    expect(profileSchema.safeParse(makeProfile()).success).toBe(true);
    expect(airSnapshotSchema.safeParse(makeSnapshot()).success).toBe(true);
    expect(profileDraftSchema.safeParse(EMPTY_DRAFT).success).toBe(true);
  });

  it('reject repeated list values and impossible numbers', () => {
    const profile = makeProfile();
    const repeated = {
      ...profile,
      home: { ...profile.home, indoorSources: ['incense', 'incense'] },
    };
    expect(profileSchema.safeParse(repeated).success).toBe(false);
    const snapshot = makeSnapshot();
    const impossible = {
      ...snapshot,
      hours: snapshot.hours.map((hour) => ({ ...hour, pm25: 5000 })),
    };
    expect(airSnapshotSchema.safeParse(impossible).success).toBe(false);
  });
});
