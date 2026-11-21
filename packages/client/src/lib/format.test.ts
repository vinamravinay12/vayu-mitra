import { describe, expect, it } from 'vitest';
import { hourLabel, hoursRange, percentChange, wholeNumber } from './format.js';

describe('format', () => {
  it('says hours the way people do', () => {
    expect([0, 6, 12, 13, 23, 24, -1].map(hourLabel)).toEqual([
      '12 am',
      '6 am',
      '12 pm',
      '1 pm',
      '11 pm',
      '12 am',
      '11 pm',
    ]);
    expect(hoursRange([13, 14])).toBe('1 pm – 3 pm');
    expect(hoursRange([])).toBe('');
  });

  it('formats numbers and changes', () => {
    expect(wholeNumber(123456.7)).toBe('1,23,457');
    expect(percentChange(42.4)).toBe('−42%');
    expect(percentChange(-3.6)).toBe('+4%');
    expect(percentChange(0.2)).toBe('0%');
  });
});
