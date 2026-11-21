import { describe, expect, it } from 'vitest';
import { PM10_BREAKPOINTS, PM25_BREAKPOINTS } from '../catalog/aqi-bands.js';
import { AQI_MAX, categoryOf, categoryRank, computeAqi, subIndex } from './compute-aqi.js';

describe('subIndex', () => {
  it('interpolates inside NAQI bands', () => {
    expect(subIndex(0, PM25_BREAKPOINTS)).toBe(0);
    expect(subIndex(30, PM25_BREAKPOINTS)).toBe(50);
    expect(subIndex(60, PM25_BREAKPOINTS)).toBe(100);
    expect(subIndex(75, PM25_BREAKPOINTS)).toBe(150);
    expect(subIndex(250, PM25_BREAKPOINTS)).toBe(400);
    expect(subIndex(100, PM10_BREAKPOINTS)).toBe(100);
  });

  it('caps at the top of the scale and floors negatives', () => {
    expect(subIndex(900, PM25_BREAKPOINTS)).toBe(AQI_MAX);
    expect(subIndex(-5, PM25_BREAKPOINTS)).toBe(0);
  });
});

describe('computeAqi', () => {
  it('reports the worse pollutant and its category', () => {
    expect(computeAqi(150, 120)).toEqual({ value: 323, category: 'very-poor', dominant: 'pm25' });
    expect(computeAqi(10, 400)).toEqual({ value: 363, category: 'very-poor', dominant: 'pm10' });
  });

  it('places index values in categories', () => {
    expect(categoryOf(50)).toBe('good');
    expect(categoryOf(51)).toBe('satisfactory');
    expect(categoryOf(201)).toBe('poor');
    expect(categoryOf(500)).toBe('severe');
    expect(categoryOf(9999)).toBe('severe');
    expect(categoryRank('good')).toBe(0);
    expect(categoryRank('severe')).toBe(5);
  });
});
