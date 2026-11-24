/** Finding a place: searching by name, or the device’s rounded location. */
import type { Place } from '@vayu/core';
import { useState } from 'react';
import type { Api } from '../../api/api.js';
import { messageOf } from '../../state/use-startup.js';

/** Coordinates rounded to ~1 km: enough for the air, and the exact spot is never sent. */
const round = (value: number): number => Math.round(value * 100) / 100;

/** The browser's location as a place, if the family allows it. */
export function currentPlace(geolocation: Geolocation | undefined): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (geolocation === undefined) {
      reject(new Error('unsupported'));
      return;
    }
    geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          name: 'My location',
          region: '',
          country: '',
          latitude: round(coords.latitude),
          longitude: round(coords.longitude),
        });
      },
      reject,
      { maximumAge: 30 * 60_000, timeout: 15_000 },
    );
  });
}

/** Searching by name and locating, with whatever went wrong. */
export function usePlaceSearch(api: Api, onPick: (place: Place) => void) {
  const [results, setResults] = useState<readonly Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  return {
    results,
    error,
    search: (query: string): void => {
      setError(null);
      api.searchPlaces(query).then(setResults, (cause: unknown) => {
        setError(messageOf(cause));
      });
    },
    locate: (): void => {
      setError(null);
      currentPlace(navigator.geolocation).then(onPick, () => {
        setError('We could not get your location. Search for your area instead.');
      });
    },
  };
}
