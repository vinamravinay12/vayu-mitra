/**
 * Profiles the clean-air engine with real timings (run via `npm run profile`):
 *  - picking the nearest of every CPCB station in India and anchoring the forecast
 *  - one piece of activity advice, and one full chat turn's engine work
 *  - applying memory changes and an alert decision
 *  - heap growth across many turns, and the payload sizes sent to the browser
 */
import {
  adviseActivity,
  anchorForecast,
  applyChanges,
  decideAlert,
  DEFAULT_ALERT_SETTINGS,
  describeAdvice,
  EMPTY_MEMORY,
  INITIAL_ALERT_STATE,
  memoryChips,
  nearestStation,
  readIntent,
  suggestQuestions,
} from '../packages/core/dist/index.js';
import { fixtureForecast, fixtureStations } from '../packages/server/dist/air/fixture-air.js';
import { measure, PLANNED_AT } from './lib/stats.mjs';

const DELHI = { latitude: 28.61, longitude: 77.21 };

/** About as many stations as CPCB's national feed carries, spread over India. */
const STATIONS = Array.from({ length: 550 }, (_unused, index) => ({
  ...fixtureStations(PLANNED_AT)[index % 4],
  id: `station-${String(index)}`,
  latitude: 8 + (index % 25) * 1.2,
  longitude: 68 + Math.floor(index / 25) * 1.4,
}));
STATIONS.push(fixtureStations(PLANNED_AT)[0]);

const forecast = fixtureForecast(DELHI.latitude, PLANNED_AT);
const station = nearestStation(DELHI, STATIONS, PLANNED_AT);
const report = anchorForecast(forecast, station, PLANNED_AT);

const CHANGES = [
  { op: 'remember-person', label: 'Dadi', ageGroup: 'senior', conditions: ['asthma'] },
  { op: 'remember-routine', activity: 'walk', person: 'Dadi', time: '06:30', minutes: null },
  { op: 'remember-home', feature: 'n95-masks' },
];
const memory = applyChanges(EMPTY_MEMORY, CHANGES);
const MESSAGE = 'Dadi has asthma and walks at 6:30 every morning. Can she go today?';

/** The engine's share of one chat turn: memory, intent, advice, words, suggestions. */
function chatTurn() {
  const updated = applyChanges(EMPTY_MEMORY, CHANGES);
  const intent = readIntent(MESSAGE, updated);
  const advice = adviseActivity({ ...intent, report, now: PLANNED_AT, home: ['n95-masks'] });
  return [describeAdvice(advice, report), memoryChips(updated), suggestQuestions(updated)];
}

const ROWS = [
  ['nearest of 551 stations', () => nearestStation(DELHI, STATIONS, PLANNED_AT)],
  ['anchor a 72-hour forecast', () => anchorForecast(forecast, station, PLANNED_AT)],
  [
    'advise one activity',
    () =>
      adviseActivity({
        activity: 'walk',
        report,
        now: PLANNED_AT,
        people: memory.people,
        home: [],
        time: '06:30',
        minutes: 30,
      }),
  ],
  ['engine share of a chat turn', chatTurn],
  [
    'alert decision',
    () =>
      decideAlert({
        settings: { ...DEFAULT_ALERT_SETTINGS, enabled: true },
        state: INITIAL_ALERT_STATE,
        report,
        memory,
        placeName: 'New Delhi',
        now: PLANNED_AT,
      }),
  ],
];

console.log('\n## Engine latency (5 000 runs each)\n');
console.log('| Operation | p50 | p95 | p99 | ops/sec |\n| :-- | --: | --: | --: | --: |');
for (const [name, operation] of ROWS) {
  const timing = measure(operation, 5_000);
  console.log(
    `| ${name} | ${timing.p50} | ${timing.p95} | ${timing.p99} | ${timing.opsPerSec.toLocaleString('en-IN')} |`,
  );
}

console.log('\n## Memory\n');
globalThis.gc?.();
const before = process.memoryUsage().heapUsed;
for (let run = 0; run < 20_000; run += 1) chatTurn();
globalThis.gc?.();
const after = process.memoryUsage().heapUsed;
console.log(
  `Heap change after 20 000 chat turns: ${((after - before) / 1024 / 1024).toFixed(2)} MB${globalThis.gc ? '' : ' (run with --expose-gc for a settled figure)'}`,
);

/** Size of a string in kilobytes, as UTF-8 bytes. */
const kilobytes = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`;
const advice = adviseActivity({
  ...readIntent(MESSAGE, memory),
  report,
  now: PLANNED_AT,
  home: [],
});
console.log('\n## Payloads\n');
console.log('| Item | Size |\n| :-- | --: |');
console.log(
  `| Air report sent to the browser (36 hours, before gzip) | ${kilobytes(JSON.stringify(report))} |`,
);
console.log(
  `| Chat reply with advice, memory and suggestions | ${kilobytes(JSON.stringify({ reply: describeAdvice(advice, report), advice, memory, suggestions: suggestQuestions(memory), source: 'engine' }))} |`,
);
console.log(
  `| Stored family record (memory, place, alerts) | ${kilobytes(JSON.stringify({ memory, place: DELHI, alerts: DEFAULT_ALERT_SETTINGS, alertState: INITIAL_ALERT_STATE, pushIds: ['x'.repeat(152)] }))} |`,
);
