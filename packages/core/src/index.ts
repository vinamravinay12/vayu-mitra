/**
 * Vayu Mitra's clean-air engine. Pure functions over plain data: no network,
 * no storage, no clock of its own. The server and the browser run the same
 * code, so the advice a family sees and the facts the AI is grounded in agree.
 */

export * from './catalog/vocabulary.js';
export { CATEGORY_GUIDANCE, CATEGORY_LABELS } from './catalog/aqi-bands.js';
export { ACTIVITY_PROFILES } from './catalog/activities.js';

export * from './aqi/pollutants.js';
export { categoryOf, computeNaqi, concentrationFor } from './aqi/compute-aqi.js';
export { EPA_PM10_BANDS, EPA_PM25_BANDS, epaIndexToConcentration } from './aqi/us-aqi.js';

export * from './time/local-clock.js';
export * from './stations/station.js';
export * from './stations/nearest-station.js';
export * from './stations/anchor-forecast.js';
export * from './schemas/air-report.js';

export * from './memory/memory-schema.js';
export * from './memory/apply-changes.js';
export * from './memory/describe-memory.js';

export * from './advice/advice-schema.js';
export * from './advice/tips.js';
export * from './advice/advise-activity.js';

export * from './alerts/alert-settings.js';
export * from './alerts/decide-alert.js';

export * from './chat/chat-schema.js';
export * from './chat/detect.js';
export * from './chat/read-request.js';
export * from './chat/describe.js';
export * from './chat/suggest-questions.js';
