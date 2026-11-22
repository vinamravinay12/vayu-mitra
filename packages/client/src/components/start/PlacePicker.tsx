import type { Place } from '@vayu/core';
import { useState } from 'react';
import type { Api } from '../../api/api.js';
import { messageOf } from '../../state/use-startup.js';
import { Alert } from '../ui/Alert.js';

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

/** The places a search found, each a button. */
function Results({
  results,
  onPick,
}: {
  readonly results: readonly Place[];
  readonly onPick: (place: Place) => void;
}): React.JSX.Element {
  if (results.length === 0) return <Alert kind="status">No places found. Try a nearby city.</Alert>;
  return (
    <ul className="space-y-1" aria-label="Places found">
      {results.map((place) => (
        <li key={`${String(place.latitude)},${String(place.longitude)}`}>
          <button
            type="button"
            className="btn-secondary w-full justify-start"
            onClick={() => {
              onPick(place);
            }}
          >
            {[place.name, place.region, place.country].filter((part) => part !== '').join(', ')}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Search by name, or use the device's location. */
export function PlacePicker({
  api,
  onPick,
}: {
  readonly api: Api;
  readonly onPick: (place: Place) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const search = (event: React.SubmitEvent): void => {
    event.preventDefault();
    setError(null);
    api.searchPlaces(query).then(setResults, (cause: unknown) => {
      setError(messageOf(cause));
    });
  };
  const locate = (): void => {
    setError(null);
    currentPlace(navigator.geolocation).then(onPick, () => {
      setError('We could not get your location. Search for your area instead.');
    });
  };
  return (
    <section className="card space-y-3" aria-labelledby="place-heading">
      <h2 id="place-heading" className="text-lg font-bold">
        Where are you?
      </h2>
      <form className="flex flex-wrap gap-2" onSubmit={search} role="search">
        <label htmlFor="place-query" className="sr-only">
          Area or city
        </label>
        <input
          id="place-query"
          className="field min-w-0 flex-1"
          value={query}
          placeholder="Area or city, e.g. Lajpat Nagar"
          minLength={2}
          maxLength={80}
          required
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>
      <button type="button" className="btn-secondary" onClick={locate}>
        Use my location
      </button>
      {error !== null && <Alert>{error}</Alert>}
      {results !== null && <Results results={results} onPick={onPick} />}
    </section>
  );
}
