/** Tests of parts of the day, readIntent with hints and describe. */
import { describe, expect, it } from 'vitest';
import { makeReport, PAPA } from '../test-utils/fixtures.js';
import { describeAir, describeSource, describeTime } from './describe.js';
import { readIntent } from './read-request.js';
import { memory } from './chat.fixtures.js';

describe('parts of the day', () => {
  it('carries the day across a follow-up about the same activity, as in the reported chat', () => {
    const previous = 'And can I go out for a run tomorrow morning';
    expect(readIntent(previous, memory)).toMatchObject({
      activity: 'run',
      day: 'tomorrow',
      period: 'morning',
      time: null,
    });
    const followUp = readIntent('but is it advisable to run in morning or not', memory, {
      previous,
    });
    expect(followUp).toMatchObject({
      activity: 'run',
      day: 'tomorrow',
      period: 'morning',
      time: null,
    });
    // A different activity is a new question: nothing is carried over.
    const walk = readIntent('Can I walk?', memory, { previous });
    expect(walk).toMatchObject({ activity: 'walk', day: null, period: null });
  });
});

describe('parts of the day', () => {
  it('lets a clock time beat a part of the day, and a part of the day replace an earlier time', () => {
    expect(readIntent('Can I run at 7 am in the morning?', memory)).toMatchObject({
      time: '07:00',
      period: null,
    });
    const previous = 'Can I run at 9 pm?';
    expect(readIntent('what about in the morning?', memory, { previous })).toMatchObject({
      activity: 'run',
      time: null,
      period: 'morning',
    });
    expect(
      readIntent('and at 6 am?', memory, { previous: 'Can I run in the evening?' }),
    ).toMatchObject({
      time: '06:00',
      period: null,
    });
  });
});

describe('readIntent with hints', () => {
  it('lets the AI reading override keywords', () => {
    const intent = readIntent('क्या माँ टहल सकती हैं?', memory, {
      hints: { activity: 'walk', person: 'Papa', time: '08:00', day: 'tomorrow', period: null },
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
});
