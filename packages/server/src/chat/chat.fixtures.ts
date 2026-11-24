import { DELHI } from '../test-utils/deps.js';

export const ask = (
  message: string,
  history: { role: 'user' | 'assistant'; text: string }[] = [],
) => ({
  message,
  place: DELHI,
  history,
});

export const TURN = { message: 'm', history: [] };

export const FACTS = {
  air: 'AQI 250',
  otherPlaces: [],
  advice: null,
  newlyRemembered: [],
  alreadyKnown: [],
  onTopic: true,
};
