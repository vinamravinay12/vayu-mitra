import { describe, expect, it } from 'vitest';
import { formatHour, hourKey, isWithinWindow, localClock, minutesOfDay } from './local-clock.js';

describe('local clock helpers', () => {
  it('reads local time at an offset', () => {
    expect(localClock(new Date('2026-11-22T18:45:00Z'), 19_800)).toEqual({
      date: '2026-11-23',
      hour: 0,
      minute: 15,
    });
    expect(hourKey({ date: '2026-11-22', hour: 7 })).toBe('2026-11-22T07:00');
  });

  it('handles windows that wrap midnight and empty windows', () => {
    expect(minutesOfDay('06:30')).toBe(390);
    expect(isWithinWindow(23 * 60, '22:00', '07:00')).toBe(true);
    expect(isWithinWindow(6 * 60, '22:00', '07:00')).toBe(true);
    expect(isWithinWindow(12 * 60, '22:00', '07:00')).toBe(false);
    expect(isWithinWindow(10 * 60, '09:00', '11:00')).toBe(true);
    expect(isWithinWindow(11 * 60, '09:00', '11:00')).toBe(false);
    expect(isWithinWindow(9 * 60, '09:00', '09:00')).toBe(false);
  });

  it('formats hours the way people say them', () => {
    expect([0, 7, 12, 15, 24, -1].map(formatHour)).toEqual([
      '12 am',
      '7 am',
      '12 pm',
      '3 pm',
      '12 am',
      '11 pm',
    ]);
  });
});
