/**
 * The World Air Quality Index project (WAQI) reports each pollutant as a US
 * EPA sub-index, not a concentration. NAQI bands are far more lenient than
 * EPA ones (an EPA 150 is about 55 µg/m³ of PM2.5, a NAQI "moderate"), so
 * showing a WAQI number to an Indian family as if it were NAQI would overstate
 * the smog. These tables invert the EPA scale back to µg/m³; the engine then
 * computes NAQI from the concentration like any other reading.
 *
 * WAQI documents the 2016 EPA PM2.5 table, not the 2024 revision, so that is
 * the one used here.
 */

/** One EPA band: index range and the concentration range it covers. */
interface EpaBand {
  readonly indexLow: number;
  readonly indexHigh: number;
  readonly concentrationLow: number;
  readonly concentrationHigh: number;
}

/** Rows of [index low, index high, concentration low, concentration high]. */
type EpaRow = readonly [number, number, number, number];

/** Turns compact table rows into bands. */
const toBands = (rows: readonly EpaRow[]): EpaBand[] =>
  rows.map(([indexLow, indexHigh, concentrationLow, concentrationHigh]) => ({
    indexLow,
    indexHigh,
    concentrationLow,
    concentrationHigh,
  }));

/** PM2.5, 24-hour, µg/m³ (EPA 2016). */
export const EPA_PM25_BANDS: readonly EpaBand[] = toBands([
  [0, 50, 0, 12],
  [51, 100, 12.1, 35.4],
  [101, 150, 35.5, 55.4],
  [151, 200, 55.5, 150.4],
  [201, 300, 150.5, 250.4],
  [301, 400, 250.5, 350.4],
  [401, 500, 350.5, 500.4],
]);

/** PM10, 24-hour, µg/m³. */
export const EPA_PM10_BANDS: readonly EpaBand[] = toBands([
  [0, 50, 0, 54],
  [51, 100, 55, 154],
  [101, 150, 155, 254],
  [151, 200, 255, 354],
  [201, 300, 355, 424],
  [301, 400, 425, 504],
  [401, 500, 505, 604],
]);

/**
 * The concentration an EPA sub-index stands for, rounded to 0.1 µg/m³.
 * Values above 500 are extrapolated along the top band, since WAQI does
 * publish them during the worst Delhi episodes.
 */
export function epaIndexToConcentration(index: number, bands: readonly EpaBand[]): number {
  const clamped = Math.max(0, index);
  // The last band that starts at or below the index; the top band for anything above 500.
  const band = bands.reduce((chosen, candidate) =>
    clamped >= candidate.indexLow ? candidate : chosen,
  );
  const span = band.indexHigh - band.indexLow;
  const position = (clamped - band.indexLow) / span;
  const concentration =
    band.concentrationLow + position * (band.concentrationHigh - band.concentrationLow);
  return Math.round(Math.max(0, concentration) * 10) / 10;
}
