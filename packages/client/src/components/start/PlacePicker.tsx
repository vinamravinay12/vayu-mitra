/** Choosing a place: search by name, or use the device’s location. */
import type { Place } from '@vayu/core';
import { useId, useState } from 'react';
import type { Api } from '../../api/api.js';
import { Alert } from '../ui/Alert.js';
import { PlaceResults } from './PlaceResults.js';
import { usePlaceSearch } from './use-place-search.js';

/** The place-name field, with a visible label that stays while typing (unlike a placeholder). */
function QueryField({
  id,
  query,
  onQuery,
}: {
  readonly id: string;
  readonly query: string;
  readonly onQuery: (query: string) => void;
}): React.JSX.Element {
  return (
    <>
      <label htmlFor={`${id}-query`} className="label mb-0 basis-full">
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
          onQuery(event.target.value);
        }}
      />
    </>
  );
}

/** The place search box: a labelled field and Search, as a search landmark. */
function SearchForm({
  id,
  onSearch,
}: {
  readonly id: string;
  readonly onSearch: (query: string) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query);
      }}
      role="search"
    >
      <QueryField id={id} query={query} onQuery={setQuery} />
      <button type="submit" className="btn-primary">
        Search
      </button>
    </form>
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
  const { results, error, search, locate } = usePlaceSearch(api, onPick);
  const body = (
    <>
      <SearchForm id={id} onSearch={search} />
      <button type="button" className="btn-secondary" onClick={locate}>
        Use my location
      </button>
      {error !== null && <Alert>{error}</Alert>}
      {results !== null && <PlaceResults results={results} onPick={onPick} />}
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
