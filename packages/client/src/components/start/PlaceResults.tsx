/** The places a search found, each a button to pick it. */
import type { Place } from '@vayu/core';
import { Alert } from '../ui/Alert.js';

/** The places a search found, each a button. */
export function PlaceResults({
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
