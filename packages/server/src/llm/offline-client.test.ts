import { profileDraftSchema } from '@vayu/core';
import { describe, expect, it } from 'vitest';
import { buildExtractionRequest } from '../prompts/build-extraction-prompt.js';
import { createOfflineClient, readDescription } from './offline-client.js';

describe('readDescription', () => {
  it('reads the common words of a household description', () => {
    const draft = readDescription(
      'We live in Lajpat Nagar, Delhi. Grandfather has asthma and takes a morning walk. My son and I cook on LPG, burn agarbatti, use an angithi and a mosquito coil. We have no air purifier. The guards burn leaves.',
    );
    expect(profileDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.placeQuery).toBe('Lajpat Nagar');
    expect(draft.members.map((member) => member.name)).toEqual(['Grandfather', 'Child']);
    expect(draft.members[0]).toMatchObject({ conditions: ['asthma'], outdoorExercise: 'light' });
    expect(draft.home).toMatchObject({
      cookingFuel: 'lpg',
      heating: 'coal-or-wood',
      hasPurifier: false,
      indoorSources: ['incense', 'mosquito-coil'],
    });
    expect(draft.lifestyle.burnsWaste).toBe(true);
  });

  it('leaves unknowns null', () => {
    const draft = readDescription('two of us, nothing else to say');
    expect(draft.placeQuery).toBeNull();
    expect(draft.members).toEqual([]);
    expect(draft.home).toMatchObject({
      cookingFuel: null,
      heating: null,
      hasPurifier: null,
      indoorSources: [],
    });
    expect(draft.lifestyle.burnsWaste).toBeNull();
    expect(readDescription('We have a purifier').home.hasPurifier).toBe(true);
  });
});

describe('createOfflineClient', () => {
  it('answers every purpose with valid JSON', async () => {
    const client = createOfflineClient();
    const base = { systemInstruction: '', schema: {}, temperature: 0 };
    await expect(client.generate({ ...base, purpose: 'guard', prompt: '' })).resolves.toContain(
      '"safe"',
    );
    await expect(
      client.generate(buildExtractionRequest('My mother lives in Kolkata.')),
    ).resolves.toContain('"Mother"');
    await expect(client.generate({ ...base, purpose: 'coach', prompt: '' })).resolves.toBe('{}');
    await expect(client.generate({ ...base, purpose: 'ask', prompt: '' })).resolves.toContain(
      'offline',
    );
  });
});
