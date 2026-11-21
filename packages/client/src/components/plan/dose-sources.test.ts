import { describe, expect, it } from 'vitest';
import { doseSources } from './ImpactPanel.js';

describe('doseSources', () => {
  it('lists the places that matter, largest first, and nothing for an empty day', () => {
    expect(doseSources({ home: 60, commute: 2, away: 30, exercise: 8 })).toBe(
      '60% at home, 30% at school or work, 8% exercising',
    );
    expect(doseSources({ home: 0, commute: 0, away: 0, exercise: 0 })).toBe('');
  });
});
