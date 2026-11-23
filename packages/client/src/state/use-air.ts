import type { AirReport, Place } from '@vayu/core';
import { useEffect, useState } from 'react';
import type { Api } from '../api/api.js';
import { messageOf } from './use-startup.js';

/** Stations publish hourly; refreshing every ten minutes keeps "now" honest. */
export const AIR_REFRESH_MS = 10 * 60_000;

export type AirState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'ready'; readonly report: AirReport }
  | { readonly status: 'error'; readonly message: string };

/** The air report for the chosen place, refreshed while the page is open. */
export function useAir(api: Api, place: Place | null): AirState {
  const [state, setState] = useState<AirState>({ status: 'idle' });
  useEffect(() => {
    if (place === null) return;
    let current = true;
    const load = (): void => {
      api.air(place).then(
        (report) => {
          if (current) setState({ status: 'ready', report });
        },
        (cause: unknown) => {
          if (current) setState({ status: 'error', message: messageOf(cause) });
        },
      );
    };
    setState({ status: 'loading' });
    load();
    const timer = setInterval(load, AIR_REFRESH_MS);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [api, place]);
  return state;
}
