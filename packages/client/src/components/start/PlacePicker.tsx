import type { Place } from '@vayu/core';
import { useId, useState } from 'react';
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

/** Searching by name and locating, with whatever went wrong. */
function usePlaceSearch(api: Api, onPick: (place: Place) => void) {
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

interface PlacePickerProps {
  readonly api: Api;
  readonly onPick: (place: Place) => void;
  /** Inside "Change place": no card and no heading of its own. */
  readonly embedded?: boolean;
}

/** Search by name, or use the device's location. */
export function PlacePicker({
  api,
  onPick,
  embedded = false,
}: PlacePickerProps): React.JSX.Element {
  const id = useId();
  const [query, setQuery] = useState('');
  const { results, error, search, locate } = usePlaceSearch(api, onPick);
  const body = (
    <>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          search(query);
        }}
        role="search"
      >
        <label htmlFor={`${id}-query`} className="sr-only">
          Area or city
        </label>
        <input
          id={`${id}-query`}
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
    </>
  );
  if (embedded) return <div className="space-y-3">{body}</div>;
  return (
    <section className="card space-y-3" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-lg font-bold">
        Where are you?
      </h2>
      {body}
    </section>
  );
}
