import { describe, expect, it } from 'vitest';
import { evaluateCondition, fieldsOf } from './evaluate-condition.js';

const context = {
  aqiCategory: 'severe',
  pm25Today: 180,
  hasInfant: true,
  conditions: ['asthma', 'allergies'],
};

describe('evaluateCondition', () => {
  it('compares single fields', () => {
    expect(evaluateCondition({ field: 'hasInfant', equals: true }, context)).toBe(true);
    expect(evaluateCondition({ field: 'aqiCategory', oneOf: ['poor', 'severe'] }, context)).toBe(
      true,
    );
    expect(evaluateCondition({ field: 'pm25Today', oneOf: ['180'] }, context)).toBe(false);
    expect(evaluateCondition({ field: 'pm25Today', atLeast: 180 }, context)).toBe(true);
    expect(evaluateCondition({ field: 'pm25Today', below: 180 }, context)).toBe(false);
    expect(evaluateCondition({ field: 'conditions', has: 'asthma' }, context)).toBe(true);
    expect(evaluateCondition({ field: 'conditions', hasAny: ['copd', 'allergies'] }, context)).toBe(
      true,
    );
    expect(evaluateCondition({ field: 'conditions', hasAny: ['copd'] }, context)).toBe(false);
  });

  it('treats missing or mistyped fields as false', () => {
    expect(evaluateCondition({ field: 'missing', atLeast: 1 }, context)).toBe(false);
    expect(evaluateCondition({ field: 'aqiCategory', has: 'severe' }, context)).toBe(false);
  });

  it('combines conditions', () => {
    const both = {
      all: [
        { field: 'hasInfant', equals: true },
        { field: 'pm25Today', atLeast: 100 },
      ],
    };
    expect(evaluateCondition(both, context)).toBe(true);
    expect(evaluateCondition({ any: [{ field: 'missing', equals: 1 }, both] }, context)).toBe(true);
    expect(evaluateCondition({ not: both }, context)).toBe(false);
  });
});

describe('fieldsOf', () => {
  it('lists every field a nested condition reads', () => {
    expect(
      fieldsOf({
        all: [
          { field: 'a', equals: 1 },
          { any: [{ field: 'b', equals: 1 }] },
          { not: { field: 'c', equals: 1 } },
        ],
      }),
    ).toEqual(['a', 'b', 'c']);
  });
});
