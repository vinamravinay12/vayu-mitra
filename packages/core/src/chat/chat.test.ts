import { describe, expect, it } from 'vitest';
import { EMPTY_MEMORY } from '../memory/memory-schema.js';
import { DADI, PAPA } from '../test-utils/fixtures.js';
import { detectActivity, detectDay, detectPeriod, detectTime } from './detect.js';
import { readIntent } from './read-request.js';
import { memory } from './chat.fixtures.js';

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
    const intent = readIntent('But I am asking about tomorrow', memory, { previous });
    expect(intent).toMatchObject({ activity: 'car-trip', day: 'tomorrow', time: '18:00' });
    expect(readIntent('and at 9 am?', memory, { previous })?.time).toBe('09:00');
    // A new question is not a follow-up, and no previous question means no guess.
    expect(readIntent('How is the air tomorrow?', memory, { previous: null })).toBeNull();
    expect(readIntent('How is the air?', memory, { previous })).toBeNull();
    expect(readIntent('Can I walk tomorrow?', memory, { previous })?.activity).toBe('walk');
  });
});

describe('parts of the day', () => {
  it('reads them in English and Hinglish', () => {
    expect(detectPeriod('Can I run tomorrow morning?')).toBe('morning');
    expect(detectPeriod('kal subah walk?')).toBe('morning');
    expect(detectPeriod('dopahar mein khelna')).toBe('afternoon');
    expect(detectPeriod('shaam ko walk')).toBe('evening');
    expect(detectPeriod('Is it OK tonight?')).toBe('night');
    expect(detectPeriod('Can I run?')).toBeNull();
  });
});
