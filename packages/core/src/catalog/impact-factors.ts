/**
 * The factors impact estimates are built from: how much air a person breathes,
 * and what a car or the metro emits per kilometre. Indicative values, sourced
 * in docs/ASSUMPTIONS.md; the app always calls what it derives an estimate.
 */
import type { Intensity } from './activities.js';

/**
 * Air breathed per hour by an adult, in cubic metres, by intensity: light,
 * moderate and high activity in the US EPA Exposure Factors Handbook (2011,
 * chapter 6). Harder breathing takes more smog in with every minute.
 */
export const BREATHING_M3_PER_HOUR: Readonly<Record<Intensity, number>> = {
  light: 0.72,
  moderate: 1.56,
  vigorous: 3,
};

/** What one kilometre of travel emits: CO₂ in grams, PM2.5 (exhaust, brakes, tyres, road dust) in milligrams. */
export interface EmissionFactor {
  readonly co2GramsPerKm: number;
  readonly pm25MilligramsPerKm: number;
}

/**
 * A petrol car per vehicle-kilometre and the metro per passenger-kilometre,
 * from ARAI and TERI inventories for Indian cities.
 */
export const EMISSION_FACTORS: Readonly<Record<'car' | 'metro', EmissionFactor>> = {
  car: { co2GramsPerKm: 150, pm25MilligramsPerKm: 25 },
  metro: { co2GramsPerKm: 20, pm25MilligramsPerKm: 1 },
};

/** Average speed in city traffic, to turn a trip's minutes into kilometres. */
export const CITY_KM_PER_HOUR = 22;

/** An idling petrol car: about 0.8 litres an hour at 2.31 kg of CO₂ a litre. */
export const IDLING_CO2_KG_PER_HOUR = 0.8 * 2.31;
