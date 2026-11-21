import { afterEach, describe, expect, it, vi } from 'vitest';
import { DELHI, stubFetch } from '../test-utils/fixtures.js';
import { ApiError, extractProfile, fetchAir, searchPlaces } from './client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('turns a network failure into a readable error', async () => {
    vi.stubGlobal('fetch', stubFetch({}));
    await expect(extractProfile('We are four in Delhi')).rejects.toThrow(
      'We could not reach Vayu Mitra',
    );
  });

  it('shows the server’s own message, or a safe generic one', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch({
        '/api/places': { status: 400, body: { error: 'Type 2 to 80 characters of a place name.' } },
      }),
    );
    await expect(searchPlaces('x')).rejects.toThrow('Type 2 to 80 characters');
    vi.stubGlobal(
      'fetch',
      stubFetch({ '/api/places': { status: 500, body: { detail: 'stack' } } }),
    );
    await expect(searchPlaces('Delhi')).rejects.toThrow('Something went wrong. Please try again.');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<html>', { status: 502 })));
    await expect(searchPlaces('Delhi')).rejects.toBeInstanceOf(ApiError);
  });

  it('re-validates the forecast before the engine sees it', async () => {
    vi.stubGlobal('fetch', stubFetch({ '/api/air': { body: { hours: [] } } }));
    await expect(fetchAir(DELHI)).rejects.toThrow('incomplete');
  });
});
