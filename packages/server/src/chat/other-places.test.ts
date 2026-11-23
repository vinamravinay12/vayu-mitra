import { describe, expect, it, vi } from 'vitest';
import type { AirService } from '../air/air-service.js';
import { fakeLlm, NOTHING_UNDERSTOOD, SAFE_VERDICT } from '../test-utils/fake-llm.js';
import { DELHI, testDeps } from '../test-utils/deps.js';
import { airElsewhere, MAX_OTHER_PLACES } from './other-places.js';
import { runChat } from './run-chat.js';

const place = (name: string, country: string, latitude: number) => ({
  name,
  region: '',
  country,
  latitude,
  longitude: 77,
});

describe('airElsewhere', () => {
  it('finds each place, preferring India, and fetches its air', async () => {
    const { air } = testDeps();
    const lookUp = vi
      .spyOn(air, 'places')
      .mockImplementation((name) =>
        Promise.resolve(
          name === 'Ghaziabad'
            ? [place('Ghaziabad', 'Pakistan', 30), place('Ghaziabad', 'India', 28.67)]
            : [place('Lucknow', 'India', 26.85)],
        ),
      );
    const found = await airElsewhere(air, ['Ghaziabad', ' Lucknow ']);
    expect(found.map((entry) => entry.name)).toEqual(['Ghaziabad', 'Lucknow']);
    expect(found[0]?.report.current.aqi).toBeGreaterThan(0);
    expect(lookUp).toHaveBeenCalledWith('Lucknow');
  });

  it('skips places it cannot find or fetch, duplicates and blanks, and caps the count', async () => {
    const fixtureAir = testDeps().air;
    const air: AirService = {
      places: (name) =>
        name === 'Nowhere'
          ? Promise.resolve([])
          : name === 'Broken'
            ? Promise.reject(new Error('geocoder down'))
            : Promise.resolve([place(name.replace(' City', ''), 'Nepal', 27.7)]),
      report: (latitude, longitude) => fixtureAir.report(latitude, longitude),
    };
    expect(await airElsewhere(air, ['Nowhere', 'Broken', 'x', 'Kathmandu'])).toHaveLength(1);
    expect(await airElsewhere(air, ['Pune', 'Pune City', 'Agra', 'Surat'])).toHaveLength(2);
    const many = ['A1', 'B2', 'C3', 'D4', 'E5'];
    expect(await airElsewhere(air, many)).toHaveLength(MAX_OTHER_PLACES);
  });
});

describe('a question about other places', () => {
  it('compares them, even when the model cannot word it', async () => {
    const understood = JSON.stringify({
      ...JSON.parse(NOTHING_UNDERSTOOD),
      places: ['Lucknow', 'Delhi'],
    });
    const llm = fakeLlm({ guard: SAFE_VERDICT, understand: understood, reply: new Error('busy') });
    const response = await runChat({ ...testDeps(), llm }, 'u1', {
      message: 'Is AQI in Lucknow better than Delhi today?',
      place: DELHI,
      history: [],
    });
    expect(response.source).toBe('engine');
    expect(response.reply).toMatch(/^Lucknow: .*New Delhi: .* has the cleaner air right now\.$/);
    expect(response.advice).toBeNull();
  });

  it('tells the model about the other places and that the question is on topic', async () => {
    const understood = JSON.stringify({
      ...JSON.parse(NOTHING_UNDERSTOOD),
      places: ['Lucknow'],
      onTopic: false,
    });
    const llm = fakeLlm({
      guard: SAFE_VERDICT,
      understand: understood,
      reply: JSON.stringify({ reply: 'Lucknow is cleaner.' }),
    });
    await runChat({ ...testDeps(), llm }, 'u1', {
      message: 'How is Lucknow?',
      place: DELHI,
      history: [],
    });
    const prompt = llm.requests.find((request) => request.purpose === 'reply')?.prompt ?? '';
    expect(prompt).toContain('"otherPlaces":["Lucknow: ');
    expect(prompt).toContain('"onTopic":true');
  });
});
