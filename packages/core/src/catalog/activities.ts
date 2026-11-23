import type { Activity } from './vocabulary.js';

/** How hard someone breathes doing it: harder breathing takes in more smog. */
export type Intensity = 'light' | 'moderate' | 'vigorous';

/**
 * Where it happens, which decides the precautions: outdoors (masks, pace,
 * traffic), in a closed vehicle (windows up, recirculation, a mask for stops),
 * or at home (airing, purifier).
 */
export type Setting = 'outdoors' | 'in-vehicle' | 'home';

export interface ActivityProfile {
  readonly label: string;
  readonly intensity: Intensity;
  readonly setting: Setting;
  readonly defaultMinutes: number;
  /** What to do instead when the air rules it out. */
  readonly indoorAlternative: string;
  /** Lower-case words that mean this activity, English and common Hinglish. */
  readonly keywords: readonly string[];
}

export const ACTIVITY_PROFILES: Readonly<Record<Activity, ActivityProfile>> = {
  walk: {
    label: 'walk',
    intensity: 'light',
    setting: 'outdoors',
    defaultMinutes: 30,
    indoorAlternative: 'a brisk walk indoors or on a covered corridor, or a mall walk',
    keywords: ['walk', 'stroll', 'sair', 'tehel', 'tahal'],
  },
  run: {
    label: 'run',
    intensity: 'vigorous',
    setting: 'outdoors',
    defaultMinutes: 40,
    indoorAlternative: 'a treadmill or an indoor workout with the purifier on',
    keywords: ['run', 'jog', 'marathon', 'daud'],
  },
  cycle: {
    label: 'cycle ride',
    intensity: 'vigorous',
    setting: 'outdoors',
    defaultMinutes: 45,
    indoorAlternative: 'a stationary bike or an indoor workout',
    keywords: ['cycle', 'cycling', 'bike ride', 'biking'],
  },
  'outdoor-play': {
    label: 'outdoor play',
    intensity: 'vigorous',
    setting: 'outdoors',
    defaultMinutes: 60,
    indoorAlternative: 'indoor games, a sports hall or play at home',
    keywords: ['play', 'park', 'playground', 'cricket', 'football', 'khel', 'khelne'],
  },
  'school-run': {
    label: 'school run',
    intensity: 'light',
    setting: 'outdoors',
    defaultMinutes: 20,
    indoorAlternative: 'a closed car or bus with recirculation on, or skipping the walk leg',
    keywords: ['school', 'bus stop', 'pick up', 'drop off', 'pickup', 'drop'],
  },
  commute: {
    label: 'commute',
    intensity: 'light',
    setting: 'outdoors',
    defaultMinutes: 40,
    indoorAlternative: 'the metro or a closed vehicle with recirculation, or working from home',
    keywords: ['commute', 'office', 'work', 'metro', 'scooter', 'bike to work'],
  },
  yoga: {
    label: 'outdoor yoga',
    intensity: 'moderate',
    setting: 'outdoors',
    defaultMinutes: 45,
    indoorAlternative: 'yoga indoors with windows shut and the purifier on',
    keywords: ['yoga', 'pranayam', 'exercise', 'workout', 'gym'],
  },
  'outdoor-chores': {
    label: 'outdoor errands',
    intensity: 'light',
    setting: 'outdoors',
    defaultMinutes: 30,
    indoorAlternative: 'delivery, or batching errands into one short trip',
    keywords: ['market', 'shopping', 'errand', 'sabzi', 'grocery', 'vegetables', 'bazaar'],
  },
  'car-trip': {
    label: 'car trip',
    intensity: 'light',
    setting: 'in-vehicle',
    defaultMinutes: 60,
    indoorAlternative: 'leaving at a cleaner hour, or putting the trip off if it can wait',
    keywords: ['car', 'drive', 'driving', 'by car', 'cab', 'taxi', 'gaadi', 'road trip'],
  },
  'open-windows': {
    label: 'airing the home',
    intensity: 'light',
    setting: 'home',
    defaultMinutes: 15,
    indoorAlternative: 'keeping windows shut and running the purifier or exhaust fan',
    keywords: ['window', 'ventilate', 'air out', 'airing', 'khidki', 'fresh air'],
  },
};
