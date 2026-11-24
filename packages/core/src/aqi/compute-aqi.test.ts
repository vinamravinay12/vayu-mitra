/** Tests of subIndex, computeAqi, computeNaqi, particulateAqi, epaIndexToConcentration and concentrationFor. */
import { describe, expect, it } from 'vitest';
import { PM10_BREAKPOINTS, PM25_BREAKPOINTS } from '../catalog/aqi-bands.js';
import {
  AQI_MAX,
  categoryOf,
  categoryRank,
  computeAqi,
  computeNaqi,
  concentrationFor,
  particulateAqi,
  subIndex,
} from './compute-aqi.js';
import { EPA_PM10_BANDS, EPA_PM25_BANDS, epaIndexToConcentration } from './us-aqi.js';

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

describe('computeNaqi', () => {
  it('takes the worst sub-index across every reported pollutant', () => {
    const reading = computeNaqi({ pm25: 40, pm10: 80, no2: 300, co: 1 });
    expect(reading).toEqual({ value: 317, category: 'very-poor', dominant: 'no2' });
  });

  it('follows CPCB: three pollutants, at least one particulate', () => {
    expect(computeNaqi({ pm25: 100, no2: 30 })).toBeNull();
    expect(computeNaqi({ no2: 30, so2: 10, o3: 20 })).toBeNull();
    expect(computeNaqi({ pm10: 120, so2: 10, nh3: 20 })?.dominant).toBe('pm10');
  });
});

describe('particulateAqi', () => {
  it('uses whichever particulates are known', () => {
    expect(particulateAqi(75, 100)).toEqual(computeAqi(75, 100));
    expect(particulateAqi(75, undefined)).toEqual({
      value: 150,
      category: 'moderate',
      dominant: 'pm25',
    });
    expect(particulateAqi(undefined, 100)).toEqual({
      value: 100,
      category: 'satisfactory',
      dominant: 'pm10',
    });
    expect(particulateAqi(undefined, undefined)).toBeNull();
  });
});

describe('epaIndexToConcentration', () => {
  it('inverts the EPA PM2.5 and PM10 tables', () => {
    expect(epaIndexToConcentration(50, EPA_PM25_BANDS)).toBe(12);
    expect(epaIndexToConcentration(151, EPA_PM25_BANDS)).toBe(55.5);
    expect(epaIndexToConcentration(175, EPA_PM25_BANDS)).toBe(102);
    expect(epaIndexToConcentration(100, EPA_PM10_BANDS)).toBe(154);
  });

  it('floors negatives and extrapolates beyond 500 along the top band', () => {
    expect(epaIndexToConcentration(-3, EPA_PM25_BANDS)).toBe(0);
    expect(epaIndexToConcentration(600, EPA_PM25_BANDS)).toBe(651.8);
  });

  it('shows why WAQI numbers must not be read as NAQI', () => {
    // An EPA 180 is ~110 µg/m³: "poor" in NAQI terms, not "moderate".
    const pm25 = epaIndexToConcentration(180, EPA_PM25_BANDS);
    expect(particulateAqi(pm25, undefined)?.category).toBe('poor');
  });
});

describe('concentrationFor', () => {
  it('inverts the NAQI sub-index', () => {
    expect(concentrationFor(150, PM25_BREAKPOINTS)).toBe(75);
    expect(concentrationFor(400, PM25_BREAKPOINTS)).toBe(250);
    expect(concentrationFor(100, PM10_BREAKPOINTS)).toBe(100);
    for (const value of [0, 37, 180, 333, 499]) {
      expect(subIndex(concentrationFor(value, PM25_BREAKPOINTS), PM25_BREAKPOINTS)).toBe(value);
    }
  });

  it('clamps to the scale', () => {
    expect(concentrationFor(-10, PM25_BREAKPOINTS)).toBe(0);
    expect(concentrationFor(900, PM25_BREAKPOINTS)).toBe(380);
  });
});
