import { describe, expect, it } from 'vitest';
import { adviseActivity } from '../advice/advise-activity.js';
import { EMPTY_MEMORY, type Memory } from '../memory/memory-schema.js';
import { DADI, makeReport, NOW, PAPA } from '../test-utils/fixtures.js';
import { chatRequestSchema, chatResponseSchema } from './chat-schema.js';
import { describeAdvice, describeAir, describeSource, describeTime } from './describe.js';
import { detectActivity, detectDay, detectTime, readIntent } from './read-request.js';
import { STARTER_QUESTIONS, suggestQuestions } from './suggest-questions.js';

const memory: Memory = {
  people: [DADI, PAPA],
  routines: [
    {
      kind: 'routine',
      id: 'routine:walk:dadi',
      activity: 'walk',
      personId: DADI.id,
      time: '06:30',
      minutes: 30,
    },
    {
      kind: 'routine',
      id: 'routine:walk:papa',
      activity: 'walk',
      personId: PAPA.id,
      time: '19:00',
      minutes: 40,
    },
    {
      kind: 'routine',
      id: 'routine:open-windows:family',
      activity: 'open-windows',
      personId: null,
      time: null,
      minutes: 15,
    },
  ],
  home: [],
};

describe('detectActivity', () => {
  it('matches whole words and prefers the longest keyword', () => {
    expect(detectActivity('Can Dadi go for her morning walk?')).toBe('walk');
    expect(detectActivity('Should I do my workout outside?')).toBe('yoga');
    expect(detectActivity('Is it ok to bike to work today')).toBe('commute');
    expect(detectActivity('kya bachche park mein khel sakte hain')).toBe('outdoor-play');
    expect(detectActivity('Should I open the khidki?')).toBe('open-windows');
    expect(detectActivity('Our walks have stopped')).toBe('walk');
    expect(detectActivity('How bad is it today?')).toBeNull();
  });
});

describe('detectTime', () => {
  it('reads 12- and 24-hour times', () => {
    expect(detectTime('at 6 am')).toBe('06:00');
    expect(detectTime('around 6:30pm')).toBe('18:30');
    expect(detectTime('12 am')).toBe('00:00');
    expect(detectTime('12 pm')).toBe('12:00');
    expect(detectTime('at 17:45')).toBe('17:45');
    expect(detectTime('13 pm')).toBeNull();
    expect(detectTime('in a bit')).toBeNull();
  });
});

describe('readIntent', () => {
  it('uses the routine of the person named', () => {
    const intent = readIntent('Is Papa okay to walk?', memory);
    expect(intent?.routine?.id).toBe('routine:walk:papa');
    expect(intent?.people).toEqual([PAPA]);
    expect(intent?.time).toBe('19:00');
    expect(intent?.minutes).toBe(40);
  });

  it('falls back to the first routine and its owner, and a time in the message wins', () => {
    const intent = readIntent('Can we walk at 5 pm?', memory);
    expect(intent?.routine?.id).toBe('routine:walk:dadi');
    expect(intent?.people).toEqual([DADI]);
    expect(intent?.time).toBe('17:00');
  });

  it('includes everyone for a family routine or no routine', () => {
    expect(readIntent('open the windows?', memory)?.people).toEqual([DADI, PAPA]);
    const run = readIntent('Can Dadi run?', memory);
    expect(run?.routine).toBeNull();
    expect(run?.people).toEqual([DADI]);
    expect(run?.time).toBeNull();
    expect(readIntent('hello', memory)).toBeNull();
    expect(readIntent('a walk?', EMPTY_MEMORY)?.people).toEqual([]);
  });
});

describe('days and follow-ups', () => {
  it('reads the day a message is about', () => {
    expect(detectDay('Can I drive to Delhi tomorrow?')).toBe('tomorrow');
    expect(detectDay('kal subah walk?')).toBe('tomorrow');
    expect(detectDay('Is tonight OK?')).toBe('today');
    expect(detectDay('aaj park chalein?')).toBe('today');
    expect(detectDay('Can I walk?')).toBeNull();
  });

  it('reads a car trip, and keeps it for a follow-up that only changes when', () => {
    expect(detectActivity('I want to go to Delhi by my car')).toBe('car-trip');
    const previous = 'Can I drive to Delhi at 6 pm?';
    const intent = readIntent('But I am asking about tomorrow', memory, undefined, previous);
    expect(intent).toMatchObject({ activity: 'car-trip', day: 'tomorrow', time: '18:00' });
    expect(readIntent('and at 9 am?', memory, undefined, previous)?.time).toBe('09:00');
    // A new question is not a follow-up, and no previous question means no guess.
    expect(readIntent('How is the air tomorrow?', memory, undefined, null)).toBeNull();
    expect(readIntent('How is the air?', memory, undefined, previous)).toBeNull();
    expect(readIntent('Can I walk tomorrow?', memory, undefined, previous)?.activity).toBe('walk');
  });
});

describe('readIntent with hints', () => {
  it('lets the AI reading override keywords', () => {
    const intent = readIntent('क्या माँ टहल सकती हैं?', memory, {
      activity: 'walk',
      person: 'Papa',
      time: '08:00',
      day: 'tomorrow',
    });
    expect(intent?.day).toBe('tomorrow');
    expect(intent?.activity).toBe('walk');
    expect(intent?.people).toEqual([PAPA]);
    expect(intent?.time).toBe('08:00');
    expect(readIntent('क्या माँ टहल सकती हैं?', memory)).toBeNull();
  });
});

describe('describe', () => {
  const report = makeReport([340, 320, 300, 250, 190, 200, 260]);

  it('describes times, sources and the air', () => {
    expect(describeTime('2026-11-22T14:00', report)).toBe('at 2 pm');
    expect(describeTime('2026-11-23T06:00', report)).toBe('tomorrow at 6 am');
    expect(describeSource(report)).toBe('measured at ITO, Delhi - CPCB, 2.1 km away (CPCB)');
    expect(describeSource({ ...report, station: null })).toMatch(/^from the forecast model/);
    expect(describeAir(report)).toBe(
      'Right now the air is Very poor (AQI 340), measured at ITO, Delhi - CPCB, 2.1 km away (CPCB). The cleanest daylight hours ahead start at 2 pm: Moderate (AQI 190).',
    );
    expect(describeAir(makeReport([100, 200, 300]))).toMatch(/not expected to get cleaner/);
    expect(describeAir(makeReport([100]))).toMatch(/not expected to get cleaner/);
  });

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
