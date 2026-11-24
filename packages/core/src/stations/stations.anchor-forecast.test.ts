/** Tests of anchorForecast. */
import { describe, expect, it } from 'vitest';
import { definite, makeForecast, makeStation, NOW } from '../test-utils/fixtures.js';
import { anchorForecast, ANCHOR_FADE_HOURS, OUTLOOK_HOURS } from './anchor-forecast.js';
import { nearestStation } from './nearest-station.js';
import { HOME, pick } from './stations.fixtures.js';

describe('anchorForecast', () => {
  const forecast = makeForecast(100);

  it('scales the outlook to the station now and fades to the model', () => {
    const station = nearestStation(HOME, [makeStation()], NOW);
    expect(station).not.toBeNull();
    const report = definite(anchorForecast(forecast, station, NOW));
    expect(report.current).toEqual({ ...pick(station), basis: 'station' });
    const rawAt = (time: string) => forecast.hours.find((hour) => hour.time === time);
    const [now] = report.hours;
    expect(now).toMatchObject({ time: '2026-11-22T10:00', pm25: 180 });
    expect(rawAt('2026-11-22T10:00')?.pm25).not.toBe(180);
    const faded = definite(report.hours[ANCHOR_FADE_HOURS]);
    expect(faded.pm25).toBe(rawAt(faded.time)?.pm25);
    expect(report.hours).toHaveLength(OUTLOOK_HOURS);
    expect(report.station?.name).toBe('ITO, Delhi - CPCB');
  });

  it('uses the model alone when no station is near', () => {
    const report = anchorForecast(forecast, null, NOW);
    expect(report?.current.basis).toBe('forecast');
    expect(report?.station).toBeNull();
    expect(report?.current.aqi).toBe(report?.hours[0]?.aqi);
  });

  it('refuses a forecast that does not cover now', () => {
    expect(anchorForecast(forecast, null, new Date('2026-12-01T00:00:00Z'))).toBeNull();
  });
});
