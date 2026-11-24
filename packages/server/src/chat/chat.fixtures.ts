/** Chat-test helpers: requests, a turn and reply facts. */
import { DELHI } from '../test-utils/deps.js';

/** A chat request about Delhi, with the message and history given. */
export const ask = (
  message: string,
  history: { role: 'user' | 'assistant'; text: string }[] = [],
) => ({
  message,
  place: DELHI,
  history,
});

/** A turn with a message and no history. */
export const TURN = { message: 'm', history: [] };

/** Reply facts with an advice sentence and nothing remembered. */
export const FACTS = {
  air: 'AQI 250',
  otherPlaces: [],
  advice: null,
  newlyRemembered: [],
  alreadyKnown: [],
  onTopic: true,
};
