/** Tests of describe, other places, suggestQuestions and chat schemas. */
import { describe, expect, it } from 'vitest';
import { adviseActivity } from '../advice/advise-activity.js';
import { EMPTY_MEMORY } from '../memory/memory-schema.js';
import { DADI, makeReport, NOW, PAPA } from '../test-utils/fixtures.js';
import { chatRequestSchema, chatResponseSchema } from './chat-schema.js';
import { comparePlaces, describeAdvice } from './describe.js';
import { STARTER_QUESTIONS, suggestQuestions } from './suggest-questions.js';
import { memory } from './chat.fixtures.js';

describe('describe', () => {
  it('describes each verdict with who it is careful for and the tips', () => {
    const at = (aqis: number[], people = [PAPA]) =>
      describeAdvice(
        adviseActivity({
          activity: 'walk',
          report: makeReport(aqis),
          now: NOW,
          people,
          home: [],
          time: null,
          day: null,
          period: null,
          minutes: null,
        }),
        makeReport(aqis),
      );
    expect(at([150])).toMatch(/^At 10 am it is Moderate \(AQI 150\), which is fine for the walk\./);
    expect(at([250, 180])).toMatch(
      /It looks better at 11 am: Moderate \(AQI 180\), so move the walk to then\./,
    );
    expect(at([250])).toMatch(/OK if you keep it short/);
    expect(at([380])).toMatch(/Skip the walk; try a brisk walk indoors/);
    expect(at([150], [DADI])).toMatch(/Dadi is more sensitive to smog/);
    expect(at([150], [DADI, { ...DADI, id: 'x', label: 'Nana' }])).toMatch(
      /Dadi and Nana are more sensitive/,
    );
    expect(at([40])).toBe('At 10 am it is Good (AQI 40), which is fine for the walk.');
  });
});

describe('other places', () => {
  const gurgaon = { name: 'Gurgaon', report: makeReport([210]) };
  const ghaziabad = { name: 'Ghaziabad', report: makeReport([342]) };

  it('describes one place, and compares several by their air now', () => {
    expect(comparePlaces([gurgaon])).toBe(
      'Gurgaon: Poor (AQI 210), measured at ITO, Delhi - CPCB, 2.1 km away (CPCB).',
    );
    expect(comparePlaces([ghaziabad, gurgaon])).toMatch(
      /^Ghaziabad: Very poor \(AQI 342\).*Gurgaon: Poor \(AQI 210\).* Gurgaon has the cleaner air right now\.$/,
    );
    const twin = { name: 'Noida', report: makeReport([210]) };
    expect(comparePlaces([gurgaon, twin])).toMatch(/about the same in both right now\.$/);
    expect(comparePlaces([])).toBe('.');
  });
});

describe('suggestQuestions', () => {
  it('offers routine questions first, then starters, up to four', () => {
    expect(suggestQuestions(memory)).toEqual([
      "Is Dadi's walk at 6:30 am OK today?",
      "Is Papa's walk at 7 pm OK today?",
      'When is the best time for our airing the home today?',
      STARTER_QUESTIONS[0],
    ]);
    expect(suggestQuestions(EMPTY_MEMORY)).toEqual(STARTER_QUESTIONS);
  });
});

describe('chat schemas', () => {
  const place = {
    name: 'Delhi',
    region: 'Delhi',
    country: 'India',
    latitude: 28.6,
    longitude: 77.2,
  };
  it('bound requests and responses', () => {
    expect(chatRequestSchema.safeParse({ message: ' hi ', place, history: [] }).success).toBe(true);
    expect(chatRequestSchema.safeParse({ message: '   ', place, history: [] }).success).toBe(false);
    expect(
      chatResponseSchema.safeParse({
        reply: 'ok',
        advice: null,
        memory: EMPTY_MEMORY,
        suggestions: [],
        source: 'ai',
      }).success,
    ).toBe(true);
  });
});
