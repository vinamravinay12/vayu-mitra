import { CAR_MODES } from '../vocabulary.js';
import type { ActionDefinition } from '../../types/action.js';

/** Modes whose trips can usually move to the metro or a bus. */
const SWITCHABLE_TO_TRANSIT = [...CAR_MODES, 'two-wheeler', 'auto-rickshaw'] as const;

/**
 * Sustainable alternatives: changes that cut what the household adds to the
 * smog, not only what it breathes. Their impact is reported as emissions.
 */
export const SUSTAINABLE_ACTIONS: readonly ActionDefinition[] = [
  {
    id: 'switch-to-metro',
    category: 'sustainable',
    title: 'Take the metro or bus instead of driving',
    steps: [
      'Try public transport for the daily commute, even on two or three days a week to start.',
      'Use a shared auto, cycle or a walk for the first and last kilometre.',
    ],
    why: 'Vehicles are one of the largest sources of city smog in winter. Per traveller, a metro emits a small fraction of a private car, and its closed carriages are among the cleanest air on the commute.',
    cost: 'free',
    effort: 'moderate',
    when: {
      all: [
        { field: 'transitNearby', equals: true },
        { field: 'commuteModes', hasAny: SWITCHABLE_TO_TRANSIT },
      ],
    },
    effects: [{ kind: 'switch-commute', from: SWITCHABLE_TO_TRANSIT, to: 'metro', maxKm: 40 }],
    group: 'commute',
  },
  {
    id: 'carpool',
    category: 'sustainable',
    title: 'Carpool with a neighbour or colleague',
    steps: [
      'Find two people on a similar route through your society or office group.',
      'Take turns driving; agree a fixed pick-up time.',
    ],
    why: 'Three people in one car means two cars fewer on the road: the same trip for a third of the emissions each.',
    cost: 'free',
    effort: 'moderate',
    when: { field: 'commuteModes', hasAny: CAR_MODES },
    effects: [{ kind: 'share-vehicle', occupants: 3 }],
    group: 'commute',
  },
  {
    id: 'walk-or-cycle-short-trips',
    category: 'sustainable',
    title: 'Walk or cycle trips under 3 km',
    steps: [
      'Walk or cycle short commutes and school runs instead of driving.',
      'Choose quieter lanes away from main roads, and go in the cleaner hours when you can.',
    ],
    why: 'Short car trips are the least efficient — a cold engine pollutes most in its first few kilometres. Walking emits nothing.',
    cost: 'free',
    effort: 'moderate',
    when: { field: 'shortVehicleTrip', equals: true },
    effects: [
      {
        kind: 'switch-commute',
        from: [...CAR_MODES, 'two-wheeler', 'auto-rickshaw'],
        to: 'walk',
        maxKm: 3,
      },
    ],
    group: 'commute',
  },
  {
    id: 'clean-cooking-fuel',
    category: 'sustainable',
    title: 'Switch from chulha or kerosene to LPG or induction',
    steps: [
      'Apply for an LPG connection — PM Ujjwala Yojana supports eligible households.',
      'An induction plate (around ₹2,000) covers most everyday cooking.',
    ],
    why: 'Solid fuel and kerosene stoves are the single largest source of indoor smoke in Indian homes, and they add to outdoor smog too.',
    cost: 'medium',
    effort: 'moderate',
    when: { field: 'cookingFuel', oneOf: ['biomass', 'kerosene'] },
    effects: [{ kind: 'switch-cooking', to: 'lpg' }],
    group: null,
  },
  {
    id: 'replace-coal-heater',
    category: 'sustainable',
    title: 'Replace the coal or wood heater',
    steps: [
      'Warm people, not rooms: layers, a hot-water bottle and a heavy quilt cost nothing to run.',
      'If you need a heater, use an electric oil-filled radiator in one closed room.',
      'Never sleep with an angithi or brazier burning in a closed room — it releases carbon monoxide.',
    ],
    why: 'Burning coal or wood indoors fills the home with smoke and carbon monoxide and adds soot to the neighbourhood air every evening.',
    cost: 'medium',
    effort: 'moderate',
    when: { field: 'heating', oneOf: ['coal-or-wood', 'kerosene'] },
    effects: [{ kind: 'switch-heating', to: 'electric' }],
    group: null,
  },
  {
    id: 'compost-not-burn',
    category: 'sustainable',
    title: 'Compost leaves and waste instead of burning them',
    steps: [
      'Separate wet waste into a compost bin or a society compost pit.',
      'Hand dry waste to the municipal collector; never burn plastic.',
    ],
    why: 'Open burning is a major winter smog source and releases toxic smoke at street level, where people breathe it directly.',
    cost: 'free',
    effort: 'easy',
    when: { field: 'burnsWaste', equals: true },
    effects: [{ kind: 'stop-waste-burning' }],
    group: null,
  },
  {
    id: 'inverter-not-generator',
    category: 'sustainable',
    title: 'Use an inverter battery instead of the diesel generator',
    steps: [
      'Size an inverter for lights, fans and the purifier.',
      'Keep the generator for long outages only.',
    ],
    why: 'Diesel generators emit soot right next to homes. An inverter covers most outages with no local emissions.',
    cost: 'high',
    effort: 'moderate',
    when: { field: 'generatorHoursPerWeek', atLeast: 1 },
    effects: [{ kind: 'scale-generator', factor: 0.2 }],
    group: null,
  },
];
