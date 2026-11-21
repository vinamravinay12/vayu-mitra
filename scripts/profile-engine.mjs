/**
 * Profiles the clean-air engine with real timings (run via `npm run profile`):
 *  - buildPlan latency percentiles for three households
 *  - the cost of one "tick an action" recompute, which runs on every click
 *  - heap growth across many plans (to catch retention)
 *  - payload sizes: the forecast over the wire and the saved session
 */
import { buildPlan, toggleChoice } from '../packages/core/dist/index.js';
import { fixtureForecast } from '../packages/server/dist/air/fixture-air.js';
import { measure, PLANNED_AT } from './lib/stats.mjs';

const place = {
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.61,
  longitude: 77.21,
};
const lifestyle = {
  workDaysPerWeek: 5,
  departHour: 8,
  burnsWaste: false,
  generatorHoursPerWeek: 0,
  transitNearby: true,
  communityHouseholds: 120,
};
const home = {
  tightness: 'average',
  ventilation: 'morning',
  hasPurifier: false,
  cookingFuel: 'lpg',
  hasKitchenExhaust: false,
  heating: 'none',
  indoorSources: [],
};
const adult = {
  name: 'Asha',
  ageGroup: 'adult',
  conditions: [],
  daytime: 'office',
  commuteMode: 'car-petrol',
  commuteKm: 14,
  outdoorExercise: 'none',
  exerciseHour: 7,
};

const HOUSEHOLDS = {
  'single commuter': { place, home, lifestyle, members: [adult] },
  'family of four, coal heater': {
    place,
    lifestyle: { ...lifestyle, burnsWaste: true },
    home: {
      ...home,
      tightness: 'leaky',
      heating: 'coal-or-wood',
      indoorSources: ['incense', 'mosquito-coil'],
    },
    members: [
      adult,
      {
        ...adult,
        name: 'Dadaji',
        ageGroup: 'senior',
        conditions: ['asthma'],
        daytime: 'home',
        outdoorExercise: 'light',
        exerciseHour: 6,
      },
      {
        ...adult,
        name: 'Meera',
        ageGroup: 'child',
        daytime: 'school',
        commuteMode: 'bus',
        commuteKm: 5,
        outdoorExercise: 'vigorous',
        exerciseHour: 17,
      },
      { ...adult, name: 'Baby', ageGroup: 'infant', daytime: 'home' },
    ],
  },
  'eight people, every source': {
    place,
    lifestyle: { ...lifestyle, burnsWaste: true, generatorHoursPerWeek: 10 },
    home: {
      ...home,
      tightness: 'leaky',
      cookingFuel: 'biomass',
      heating: 'kerosene',
      indoorSources: ['incense', 'mosquito-coil', 'indoor-smoking', 'candles'],
    },
    members: Array.from({ length: 8 }, (_unused, index) => ({
      ...adult,
      name: `Person ${String(index + 1)}`,
      commuteMode: index % 2 === 0 ? 'two-wheeler' : 'auto-rickshaw',
      outdoorExercise: 'light',
      exerciseHour: 6,
    })),
  },
};

const air = fixtureForecast(28.61, PLANNED_AT);
/** Builds a plan for a household on the fixture forecast. */
const planFor = (profile, chosenIds = null) =>
  buildPlan({ profile, air, now: PLANNED_AT, chosenIds });

console.log('\n## Engine latency (5 000 runs each)\n');
console.log('| Household | p50 | p95 | p99 | plans/sec |\n| :-- | --: | --: | --: | --: |');
for (const [name, profile] of Object.entries(HOUSEHOLDS)) {
  const timing = measure(() => planFor(profile), 5_000);
  console.log(
    `| ${name} | ${timing.p50} | ${timing.p95} | ${timing.p99} | ${timing.opsPerSec.toLocaleString('en-IN')} |`,
  );
}
const family = HOUSEHOLDS['family of four, coal heater'];
const basePlan = planFor(family);
const toggled = toggleChoice(basePlan.chosenIds, 'seal-gaps', basePlan.actions);
const tick = measure(() => planFor(family, toggled), 5_000);
console.log(
  `| one tick (toggle + full recompute) | ${tick.p50} | ${tick.p95} | ${tick.p99} | ${tick.opsPerSec.toLocaleString('en-IN')} |`,
);

console.log('\n## Memory\n');
globalThis.gc?.();
const before = process.memoryUsage().heapUsed;
const profiles = Object.values(HOUSEHOLDS);
for (let run = 0; run < 20_000; run += 1) planFor(profiles[run % profiles.length]);
globalThis.gc?.();
const after = process.memoryUsage().heapUsed;
console.log(
  `Heap change after 20 000 plans: ${((after - before) / 1024 / 1024).toFixed(2)} MB${globalThis.gc ? '' : ' (run with --expose-gc for a settled figure)'}`,
);

/** Size of a string in kilobytes, as UTF-8 bytes. */
const kilobytes = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`;
console.log('\n## Payloads\n');
console.log('| Item | Size |\n| :-- | --: |');
console.log(
  `| Forecast sent to the browser (48 hours, before gzip) | ${kilobytes(JSON.stringify(air))} |`,
);
console.log(
  `| Saved session in localStorage | ${kilobytes(JSON.stringify({ profile: family, chosenIds: basePlan.chosenIds, language: 'en' }))} |`,
);
console.log(
  `| Full plan object (computed in the browser, never sent) | ${kilobytes(JSON.stringify(basePlan))} |`,
);
