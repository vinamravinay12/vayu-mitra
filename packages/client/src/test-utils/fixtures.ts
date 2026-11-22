import {
  categoryOf,
  DEFAULT_ALERT_SETTINGS,
  EMPTY_MEMORY,
  type AirReport,
  type Memory,
  type Place,
} from '@vayu/core';
import type { Household } from '../api/api.js';
import type { ClientConfig, FirebaseWebConfig } from '../api/config.js';

export const DELHI: Place = {
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.61,
  longitude: 77.21,
};

export const LOCAL_CONFIG: ClientConfig = { auth: 'none', firebase: null, vapidKey: null };

export const FIREBASE_WEB: FirebaseWebConfig = {
  apiKey: 'web-key',
  authDomain: 'vayu-test.firebaseapp.com',
  projectId: 'vayu-test',
  appId: '1:2:web:3',
  messagingSenderId: '2',
};

export const FIREBASE_CONFIG: ClientConfig = {
  auth: 'firebase',
  firebase: FIREBASE_WEB,
  vapidKey: 'vapid',
};

/** A winter day from 10:00: clearing to the afternoon, worst overnight, easing next morning. */
const DAY = [
  250, 230, 200, 180, 170, 190, 240, 280, 320, 340, 360, 380, 390, 400, 395, 390, 380, 370, 360,
  350, 340, 320, 300, 280, 260, 240, 220, 210, 200, 210,
];

/** A report from 10:00 on 22 November with these index values, measured at ITO. */
export function makeReport(aqis: readonly number[] = DAY): AirReport {
  const hours = aqis.map((aqi, index) => {
    const total = 10 + index;
    const day = total >= 24 ? '2026-11-23' : '2026-11-22';
    return {
      time: `${day}T${String(total % 24).padStart(2, '0')}:00`,
      pm25: 0,
      pm10: 0,
      aqi,
      category: categoryOf(aqi),
    };
  });
  const first = hours[0] ?? { aqi: 0, category: 'good' as const };
  return {
    timezone: 'Asia/Kolkata',
    utcOffsetSeconds: 19_800,
    fetchedAt: '2026-11-22T04:30:00.000Z',
    current: { aqi: first.aqi, category: first.category, dominant: 'pm25', basis: 'station' },
    station: {
      name: 'ITO, Delhi - CPCB',
      source: 'cpcb',
      distanceKm: 2.1,
      observedAt: '2026-11-22T10:00:00+05:30',
    },
    hours,
    forecastSource: 'open-meteo',
  };
}

/** Dadi, who has asthma and walks at 6:30, in a home with N95 masks. */
export const DADI_MEMORY: Memory = {
  people: [
    {
      kind: 'person',
      id: 'person:dadi',
      label: 'Dadi',
      ageGroup: 'senior',
      conditions: ['asthma'],
    },
  ],
  routines: [
    {
      kind: 'routine',
      id: 'routine:walk:dadi',
      activity: 'walk',
      personId: 'person:dadi',
      time: '06:30',
      minutes: 30,
    },
  ],
  home: [{ kind: 'home', id: 'home:n95-masks', feature: 'n95-masks' }],
};

export const emptyHousehold = (overrides: Partial<Household> = {}): Household => ({
  memory: EMPTY_MEMORY,
  place: null,
  alerts: DEFAULT_ALERT_SETTINGS,
  pushEnabled: false,
  ...overrides,
});
