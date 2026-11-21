import type { Place } from '@vayu/core';
import { useEffect, useId, useRef, useState } from 'react';
import { searchPlaces } from '../../api/client.js';
import { useRequest } from '../../state/use-request.js';
import { Alert } from '../ui/Alert.js';

/** "Lajpat Nagar, Delhi, India" — enough to tell two Delhis apart. */
export const placeLabel = (place: Place): string =>
  [place.name, place.region, place.country].filter((part) => part !== '').join(', ');

/** Shortest query worth sending. */
const MIN_QUERY = 2;

/**
 * Place search that runs once for the place the AI read, and picks its best
 * match; the family can search again and choose another.
 */
function usePlaceSearch(
  initialQuery: string,
  place: Place | null,
  onChoose: (place: Place) => void,
) {
  const search = useRequest(searchPlaces);
  const { state, start } = search;
  const autoSearched = useRef(false);
  const autoChosen = useRef(false);
  useEffect(() => {
    if (!autoSearched.current && initialQuery.trim().length >= MIN_QUERY && place === null) {
      autoSearched.current = true;
      start(initialQuery.replace(/,.*$/, '').trim());
    }
  }, [initialQuery, place, start]);
  const [bestMatch] = state.status === 'done' ? state.value : [];
  useEffect(() => {
    if (autoSearched.current && !autoChosen.current && bestMatch !== undefined && place === null) {
      autoChosen.current = true;
      onChoose(bestMatch);
    }
  }, [bestMatch, place, onChoose]);
  return search;
}

/** The places found, as buttons; the chosen one is pressed. */
function Results({
  places,
  place,
  onChoose,
}: {
  readonly places: readonly Place[];
  readonly place: Place | null;
  readonly onChoose: (place: Place) => void;
}): React.JSX.Element {
  if (places.length === 0) {
    return <Alert kind="status">No places found. Try the city name.</Alert>;
  }
  return (
    <ul className="space-y-1" aria-label="Places found">
      {places.map((candidate) => {
        const label = placeLabel(candidate);
        const chosen = place !== null && placeLabel(place) === label;
        return (
          <li key={`${label}-${String(candidate.latitude)}`}>
            <button
              type="button"
              aria-pressed={chosen}
              className={`btn-secondary w-full justify-start text-left ${chosen ? 'border-brand bg-brand-soft' : ''}`}
              onClick={() => {
                onChoose(candidate);
              }}
            >
              {label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface PlaceSearchProps {
  readonly initialQuery: string;
  readonly place: Place | null;
  readonly onChoose: (place: Place) => void;
}

/** Finds the family's place for the forecast. */
export function PlaceSearch({
  initialQuery,
  place,
  onChoose,
}: PlaceSearchProps): React.JSX.Element {
  const [query, setQuery] = useState(initialQuery);
  const inputId = useId();
  const { state, start } = usePlaceSearch(initialQuery, place, onChoose);
  const ready = query.trim().length >= MIN_QUERY && state.status !== 'loading';
  return (
    <fieldset className="space-y-3">
      <legend className="text-lg font-semibold">Where you live</legend>
      <p className="text-sm text-ink-soft">
        {place === null
          ? 'Search for your city or neighbourhood, then choose it.'
          : `Forecast for ${placeLabel(place)}.`}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="label">
            City or neighbourhood
          </label>
          <input
            id={inputId}
            className="field"
            value={query}
            maxLength={80}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (ready) start(query.trim());
              }
            }}
          />
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={!ready}
          onClick={() => {
            start(query.trim());
          }}
        >
          {state.status === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </div>
      {state.status === 'error' ? <Alert>{state.message}</Alert> : null}
      {state.status === 'done' ? (
        <Results places={state.value} place={place} onChoose={onChoose} />
      ) : null}
    </fieldset>
  );
}
