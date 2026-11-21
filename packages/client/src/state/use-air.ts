import type { AirSnapshot, Place } from '@vayu/core';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchAir } from '../api/client.js';

/** The forecast for the family's place, and when it was loaded (the plan's clock). */
export type AirState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly snapshot: AirSnapshot; readonly loadedAt: Date }
  | { readonly status: 'error'; readonly message: string };

/** The message to show for a failed load. */
export const failureMessage = (cause: unknown): string =>
  cause instanceof ApiError
    ? cause.message
    : 'The air forecast could not be loaded. Please try again.';

/** Loads the forecast for a place; `reload` fetches it again. */
export function useAir(place: Place): { readonly air: AirState; readonly reload: () => void } {
  const [air, setAir] = useState<AirState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { latitude, longitude, name, region, country } = place;
  useEffect(() => {
    let current = true;
    setAir({ status: 'loading' });
    fetchAir({ latitude, longitude, name, region, country })
      .then((snapshot) => {
        if (current) setAir({ status: 'ready', snapshot, loadedAt: new Date() });
      })
      .catch((cause: unknown) => {
        if (current) setAir({ status: 'error', message: failureMessage(cause) });
      });
    return () => {
      current = false;
    };
  }, [latitude, longitude, name, region, country, attempt]);
  const reload = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);
  return { air, reload };
}
