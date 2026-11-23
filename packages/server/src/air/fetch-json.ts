/** Reads JSON from an upstream URL. Injected so tests never touch the network. */
export type FetchJson = (url: string) => Promise<unknown>;

/** An upstream data source failed or answered with something unusable. */
export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamError';
  }
}

/** Upstream calls must not hold a request open: Open-Meteo normally answers in under a second. */
const UPSTREAM_TIMEOUT_MS = 8000;

/** The real network call: GET with a timeout, JSON only, non-2xx is an error. */
export const fetchJsonOverNetwork: FetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new UpstreamError(`Upstream answered ${String(response.status)}`);
  }
  return response.json();
};
