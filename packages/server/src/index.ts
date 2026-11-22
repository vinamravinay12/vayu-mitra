import { initializeApp } from 'firebase-admin/app';
import { OAuth2Client } from 'google-auth-library';
import { createAirService } from './air/air-service.js';
import { airSources } from './air/build-sources.js';
import { fetchJsonOverNetwork } from './air/fetch-json.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { firebaseBindings, oidcSchedulerVerifier } from './firebase/bindings.js';
import { createGeminiClientFromKey } from './llm/gemini-client.js';
import { logEvent } from './logging/log.js';
import { createLogMessenger } from './push/messenger.js';
import { createMemoryCollection, createUserStore } from './store/user-store.js';

/**
 * Binds the app to the outside world: environment, network, Firebase and a
 * port. Everything it wires up is built and tested in its own module.
 */
const config = loadConfig(process.env);
const now = (): Date => new Date();
const llm =
  config.geminiApiKey === null
    ? null
    : createGeminiClientFromKey(config.geminiApiKey, config.models);
const air = createAirService(airSources(config.airDataMode, fetchJsonOverNetwork, config, now));
// On Cloud Run the Admin SDK authenticates as the service's own account.
const firebase =
  config.firebase === null
    ? null
    : firebaseBindings(initializeApp({ projectId: config.firebase.projectId }));
const verifyScheduler =
  config.scheduler === null ? null : oidcSchedulerVerifier(new OAuth2Client(), config.scheduler);

if (llm === null) logEvent('WARNING', 'No GEMINI_API_KEY: replies come from the engine alone.');
if (firebase === null)
  logEvent('WARNING', 'Firebase off: one shared local household, kept in memory.');

const server = createApp({
  config,
  llm,
  air,
  store: createUserStore(firebase?.users ?? createMemoryCollection()),
  messenger: firebase?.messenger ?? createLogMessenger(),
  verifyIdToken: firebase?.verifyIdToken ?? null,
  verifyScheduler,
}).listen(config.port, () => {
  logEvent('INFO', 'Vayu Mitra listening', {
    port: config.port,
    gemini: llm !== null,
    airData: config.airDataMode,
    stations: { cpcb: config.dataGovInApiKey !== null, waqi: config.waqiToken !== null },
    auth: config.authMode,
    alerts: verifyScheduler !== null,
  });
});

// Cloud Run sends SIGTERM before stopping an instance; finish in-flight requests first.
process.on('SIGTERM', () => {
  server.close();
});
