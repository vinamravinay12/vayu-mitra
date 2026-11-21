import { useCallback, useRef, useState } from 'react';
import { failureMessage } from './use-air.js';

/** A request the family starts by pressing a button. */
export type RequestState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'done'; readonly value: T }
  | { readonly status: 'error'; readonly message: string };

/**
 * Runs one async request at a time and keeps only the latest answer, so a
 * slow earlier reply can never overwrite a newer one.
 */
export function useRequest<A extends unknown[], T>(
  run: (...args: A) => Promise<T>,
): {
  readonly state: RequestState<T>;
  readonly start: (...args: A) => void;
  readonly reset: () => void;
} {
  const [state, setState] = useState<RequestState<T>>({ status: 'idle' });
  const latest = useRef(0);
  const start = useCallback(
    (...args: A) => {
      latest.current += 1;
      const ticket = latest.current;
      setState({ status: 'loading' });
      run(...args)
        .then((value) => {
          if (ticket === latest.current) setState({ status: 'done', value });
        })
        .catch((cause: unknown) => {
          if (ticket === latest.current)
            setState({ status: 'error', message: failureMessage(cause) });
        });
    },
    [run],
  );
  const reset = useCallback(() => {
    latest.current += 1;
    setState({ status: 'idle' });
  }, []);
  return { state, start, reset };
}
