/** Anchoring the model forecast to the nearest station’s reading, fading over a day. */
import { computeAqi } from '../aqi/compute-aqi.js';
import type { AirReport, ForecastSource, ReportHour } from '../schemas/air-report.js';
import { hourKey, localClock } from '../time/local-clock.js';
import type { NearestStation } from './nearest-station.js';
import { MAX_CONCENTRATION } from './station.js';

/** One hour of a model forecast, before anchoring. */
export interface ForecastHour {
  readonly time: string;
  readonly pm25: number;
  readonly pm10: number;
}

/** A model forecast for a point, as the forecast adapter returns it. */
export interface Forecast {
  readonly timezone: string;
  readonly utcOffsetSeconds: number;
  readonly hours: readonly ForecastHour[];
  readonly source: ForecastSource;
}

/** The correction fades to nothing over this many hours: tomorrow is the model's call. */
export const ANCHOR_FADE_HOURS = 24;

/** Hours of outlook to keep from now. */
export const OUTLOOK_HOURS = 36;

/** A station can disagree with the model, but not by more than this factor either way. */
const MAX_CORRECTION = 3;

/** The value kept within [low, high]. */
const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** Rounded to one decimal place. */
const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * How far off the model is right now, as a ratio of station to model. PM2.5
 * when both have it, else PM10; 1 when there is nothing to compare.
 */
export function correctionRatio(station: NearestStation | null, modelNow: ForecastHour): number {
  if (station === null) {
    return 1;
  }
  const { pm25, pm10 } = station.station.pollutants;
  const ratio =
    pm25 !== undefined && modelNow.pm25 > 0
      ? pm25 / modelNow.pm25
      : pm10 !== undefined && modelNow.pm10 > 0
        ? pm10 / modelNow.pm10
        : 1;
  return clamp(ratio, 1 / MAX_CORRECTION, MAX_CORRECTION);
}

/**
 * Builds the report: the station's reading for now, and the model's hourly
 * forecast scaled to agree with it. Global models like CAMS get the shape of
 * a Delhi day right (the night build-up, the afternoon clearing) but often the
 * level wrong by half or double; the station knows the level. The correction
 * is full now and fades linearly to the raw model over a day.
 *
 * Null when the forecast has no hour for now: a stale forecast is not shown.
 */
export function anchorForecast(
  forecast: Forecast,
  station: NearestStation | null,
  now: Date,
): AirReport | null {
  const start = forecast.hours.findIndex(
    (hour) => hour.time === hourKey(localClock(now, forecast.utcOffsetSeconds)),
  );
  const modelNow = forecast.hours[start];
  if (modelNow === undefined) {
    return null;
  }
  const ratio = correctionRatio(station, modelNow);
  const first = anchorHour(modelNow, { ratio, ahead: 0 });
  const later = forecast.hours
    .slice(start + 1, start + OUTLOOK_HOURS)
    .map((hour, index) => anchorHour(hour, { ratio, ahead: index + 1 }));
  return {
    timezone: forecast.timezone,
    utcOffsetSeconds: forecast.utcOffsetSeconds,
    fetchedAt: now.toISOString(),
    current: currentReading(station, first),
    station: stationSummary(station),
    hours: [first, ...later],
    forecastSource: forecast.source,
  };
}

/** One model hour scaled by the correction, which fades to nothing `ANCHOR_FADE_HOURS` ahead. */
function anchorHour(hour: ForecastHour, at: { ratio: number; ahead: number }): ReportHour {
  const factor = 1 + (at.ratio - 1) * Math.max(0, 1 - at.ahead / ANCHOR_FADE_HOURS);
  const pm25 = clamp(round1(hour.pm25 * factor), 0, MAX_CONCENTRATION);
  const pm10 = clamp(round1(hour.pm10 * factor), 0, MAX_CONCENTRATION);
  const reading = computeAqi(pm25, pm10);
  return { time: hour.time, pm25, pm10, aqi: reading.value, category: reading.category };
}

/** The air now: the station's own index when there is one, else the anchored model's. */
function currentReading(station: NearestStation | null, first: ReportHour): AirReport['current'] {
  const reading = station === null ? computeAqi(first.pm25, first.pm10) : station.aqi;
  return {
    aqi: reading.value,
    category: reading.category,
    dominant: reading.dominant,
    basis: station === null ? 'forecast' : 'station',
  };
}

/** Which station the reading came from, as the report names it. */
function stationSummary(station: NearestStation | null): AirReport['station'] {
  return station === null
    ? null
    : {
        name: station.station.name,
        source: station.station.source,
        distanceKm: station.distanceKm,
        observedAt: station.station.observedAt,
      };
}
