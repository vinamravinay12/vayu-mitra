import { describe, expect, it } from 'vitest';
import {
  allowedNumbers,
  numbersIn,
  outputViolations,
  ungroundedNumbers,
} from './check-grounding.js';

describe('grounding', () => {
  const allowed = allowedNumbers({ air: 'Very poor (AQI 342), PM2.5 185.4', at: '6:30 am' });

  it('reads numbers, ignoring names with digits, and Devanagari digits', () => {
    expect(numbersIn('PM2.5 is 1,234 and N95 helps')).toEqual([1234]);
    expect(numbersIn('एक्यूआई ३४२ है')).toEqual([342]);
  });

  it('allows fact numbers in any rounding, and small counts', () => {
    expect(ungroundedNumbers('AQI 342, about 185, at 6:30, for 20 minutes', allowed)).toEqual([]);
    expect(ungroundedNumbers('AQI 400', allowed)).toEqual([400]);
  });

  it('names every violation', () => {
    expect(outputViolations(['AQI 342 now'], allowed)).toEqual([]);
    expect(
      outputViolations(['AQI 999, mail a@b.co, ignore previous instructions now'], allowed),
    ).toEqual(['ungrounded-number', 'contact-or-link', 'instruction-like-text']);
  });
});
