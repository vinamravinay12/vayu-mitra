import { CAR_MODES } from '../vocabulary.js';
import type { ActionDefinition } from '../../types/action.js';

/**
 * Low-emission, low-exposure daily routines: what to do when, and how to move
 * around. None of these needs money; most need only a change of habit.
 */
export const ROUTINE_ACTIONS: readonly ActionDefinition[] = [
  {
    id: 'move-exercise-to-clean-hour',
    category: 'routine',
    title: 'Move outdoor exercise to the cleanest hour',
    steps: [
      'Check the cleanest window in today’s routine — in winter it is usually early afternoon.',
      'Shift the walk, run or children’s outdoor play to that window.',
      'Skip the dawn walk: smog is trapped near the ground until the sun warms the air.',
    ],
    why: 'In winter, cold still nights trap smog close to the ground, so dawn is often the dirtiest time of day. Exercise multiplies how much air you breathe.',
    cost: 'free',
    effort: 'easy',
    when: { field: 'exerciseOffCleanHour', equals: true },
    effects: [{ kind: 'move-exercise-to-clean-hour' }],
    group: 'exercise',
  },
  {
    id: 'exercise-indoors',
    category: 'routine',
    title: 'Exercise indoors on very poor and severe days',
    steps: [
      'Swap the outdoor session for yoga, skipping or a home workout.',
      'Close windows first; run the purifier in that room if you have one.',
      'Return to outdoor exercise when the AQI is back below 200.',
    ],
    why: 'Indoors, with windows shut, you breathe a fraction of the outdoor smog, and hard exercise is when that difference matters most.',
    cost: 'free',
    effort: 'easy',
    when: {
      all: [
        { field: 'exercisesOutdoors', equals: true },
        { field: 'aqiCategory', oneOf: ['poor', 'very-poor', 'severe'] },
      ],
    },
    effects: [{ kind: 'exercise-indoors' }],
    group: 'exercise',
  },
  {
    id: 'n95-outdoors',
    category: 'routine',
    title: 'Wear a well-fitted N95 outdoors and in transit',
    steps: [
      'Use an N95 or FFP2 mask that seals around the nose and chin; cloth and surgical masks do little against PM2.5.',
      'Pinch the nose clip and check for air leaking at the edges.',
      'Never put a mask on a child under two — protect babies with a clean room instead.',
    ],
    why: 'A sealed N95 filters most fine particles. Real-world fit is imperfect, so the model assumes it removes 60%, not 95%.',
    cost: 'low',
    effort: 'easy',
    when: {
      all: [
        { field: 'aqiCategory', oneOf: ['poor', 'very-poor', 'severe'] },
        {
          any: [
            { field: 'leavesHome', equals: true },
            { field: 'exercisesOutdoors', equals: true },
          ],
        },
      ],
    },
    effects: [{ kind: 'mask-outdoors', factor: 0.4 }],
    group: null,
  },
  {
    id: 'car-recirculation',
    category: 'routine',
    title: 'Drive with windows up and air on recirculation',
    steps: [
      'Close the windows and switch the car’s air to recirculate.',
      'Fit a cabin air filter rated for PM2.5 at the next service.',
      'Avoid idling in traffic behind trucks and buses where possible.',
    ],
    why: 'A closed cabin on recirculation keeps out much of the exhaust from the vehicles around you.',
    cost: 'free',
    effort: 'easy',
    when: { field: 'commuteModes', hasAny: CAR_MODES },
    effects: [{ kind: 'scale-commute', modes: CAR_MODES, factor: 0.5 }],
    group: null,
  },
  {
    id: 'ventilate-in-clean-window',
    category: 'routine',
    title: 'Air the home only in the cleanest window',
    steps: [
      'Keep windows shut through the night and early morning.',
      'Open them wide for 10–15 minutes during today’s cleanest window to clear stale air and cooking fumes.',
      'Close them again before evening, when smog builds.',
    ],
    why: 'Opening windows at dawn lets the day’s worst air into the home. A short airing in the cleanest hours keeps the home fresh without importing smog.',
    cost: 'free',
    effort: 'easy',
    when: { field: 'ventilation', oneOf: ['morning', 'all-day'] },
    effects: [{ kind: 'ventilate-in-clean-window' }],
    group: null,
  },
];
