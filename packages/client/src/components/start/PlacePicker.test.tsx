import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { createApi } from '../../api/api.js';
import { installFakeServer } from '../../test-utils/fake-server.js';
import { PlacePicker } from './PlacePicker.js';
import { currentPlace } from './use-place-search.js';

const api = createApi();

/** A geolocation that answers with a position or an error. */
const geolocation = (answer: 'ok' | 'error'): Geolocation =>
  ({
    getCurrentPosition: (success: PositionCallback, failure: PositionErrorCallback) => {
      if (answer === 'ok')
        success({ coords: { latitude: 28.61234, longitude: 77.20987 } } as GeolocationPosition);
      else failure({ code: 1 } as GeolocationPositionError);
    },
  }) as Geolocation;

/** Gives jsdom's navigator a geolocation for one test. */
function useGeolocation(value: Geolocation): void {
  Object.defineProperty(navigator, 'geolocation', { value, configurable: true });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, 'geolocation');
  });
}

describe('currentPlace', () => {
  it('rounds the position to about a kilometre', async () => {
    expect(await currentPlace(geolocation('ok'))).toEqual({
      name: 'My location',
      region: '',
      country: '',
      latitude: 28.61,
      longitude: 77.21,
    });
    await expect(currentPlace(geolocation('error'))).rejects.toEqual({ code: 1 });
    await expect(currentPlace(undefined)).rejects.toThrow('unsupported');
  });
});

describe('PlacePicker', () => {
  it('uses the device location when allowed', async () => {
    useGeolocation(geolocation('ok'));
    const onPick = vi.fn();
    render(<PlacePicker api={api} onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'My location' }));
  });

  it('says so when location is refused, a search fails or finds nothing', async () => {
    useGeolocation(geolocation('error'));
    const server = installFakeServer();
    render(<PlacePicker api={api} onPick={vi.fn()} embedded />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not get your location');
    server.failures.set('GET /api/places', 502);
    await userEvent.type(screen.getByLabelText('Area or city'), 'Delhi');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed with 502.');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{"places":[]}', { status: 200 })));
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No places found');
  });
});
