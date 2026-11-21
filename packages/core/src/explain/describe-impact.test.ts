import { describe, expect, it } from 'vitest';
import type { Impact } from '../actions/compare-scenarios.js';
import { describeImpact, formatAmount, mostProtected } from './describe-impact.js';

const member = (name: string, reductionPercent: number) => ({
  name,
  beforeDoseUg: 2000,
  afterDoseUg: 2000 * (1 - reductionPercent / 100),
  reductionPercent,
  beforeCigarettes: 9,
  afterCigarettes: 5,
});

const impact = (overrides: Partial<Impact> = {}): Impact => ({
  members: [member('Asha', 40), member('Dadaji', 55)],
  weightedReductionPercent: 48,
  pm25GramsWeeklySaved: 0,
  pm25GramsSeasonSaved: 0,
  co2KgWeeklySaved: 0,
  ...overrides,
});

describe('describeImpact', () => {
  it('names the most protected member and the family-wide cut', () => {
    const [sentence] = describeImpact(impact());
    expect(sentence).toBe(
      "Cuts Dadaji's daily PM2.5 dose by 55% (2,000 → 900 µg). Across the family, weighted towards the most vulnerable, exposure falls 48%.",
    );
  });

  it('talks about smog, CO2 savings and CO2 trade-offs', () => {
    const smog = describeImpact(
      impact({
        members: [],
        pm25GramsWeeklySaved: 175,
        pm25GramsSeasonSaved: 2800,
        co2KgWeeklySaved: 3,
      }),
    );
    expect(smog).toEqual([
      "Keeps 175 g of PM2.5 a week out of your neighbourhood's air — 2,800 g over a 16-week smog season.",
      'Saves 3 kg of CO₂ a week.',
    ]);
    const tradeOff = describeImpact(impact({ members: [], co2KgWeeklySaved: -17.5 }));
    expect(tradeOff[0]).toContain('adds about 18 kg of CO₂');
  });

  it('never hides who is made worse off', () => {
    const sentences = describeImpact(
      impact({ members: [member('Asha', 12), member('Ravi', -4)], weightedReductionPercent: 0.4 }),
    );
    expect(sentences[0]).toBe("Cuts Asha's daily PM2.5 dose by 12% (2,000 → 1,760 µg).");
    expect(sentences[1]).toContain("Ravi's dose rises 4%");
  });

  it('says nothing about negligible changes', () => {
    expect(
      describeImpact(impact({ members: [member('Asha', 0.2)], weightedReductionPercent: 0.2 })),
    ).toEqual([]);
  });
});

describe('helpers', () => {
  it('formats amounts for sentences', () => {
    expect(formatAmount(1234.5)).toBe('1,235');
    expect(formatAmount(-2.34)).toBe('2.3');
    expect(mostProtected(impact({ members: [] }))).toBeUndefined();
  });
});
