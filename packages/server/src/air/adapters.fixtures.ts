/** Adapter-test helpers: fetches that answer with canned JSON. */
import { type FetchJson } from './fetch-json.js';

/** A fetcher that records URLs and answers with `body`. */
export function answering(body: unknown): FetchJson & { urls: string[] } {
  const urls: string[] = [];
  const fetcher = (url: string) => {
    urls.push(url);
    return Promise.resolve(body);
  };
  return Object.assign(fetcher, { urls });
}

/** Any point: the WAQI tests answer the same whatever is asked. */
export const ONE_ONE = { latitude: 1, longitude: 1 };
