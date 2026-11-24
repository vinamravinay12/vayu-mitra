/** The server’s composition root: binds the app to the environment, network, Firestore, Web Push and the port. */
import { Firestore } from '@google-cloud/firestore';
import { OAuth2Client } from 'google-auth-library';
import webpush from 'web-push';
import { createAirService } from './air/air-service.js';
import { airSources } from './air/build-sources.js';
import { fetchJsonOverNetwork } from './air/fetch-json.js';
import { createApp } from './app.js';
import { createAccountStore } from './auth/accounts.js';
import { loadConfig } from './config.js';
import { firestoreCollection, oidcSchedulerVerifier, webPushMessenger } from './gcp/bindings.js';
import { createGeminiClientFromKey } from './llm/gemini-client.js';
import { logEvent } from './logging/log.js';
import { createLogMessenger } from './push/messenger.js';
import {
  createMemoryCollection,
  createUserStore,
  type DocumentCollection,
} from './store/user-store.js';

/**
 * Binds the app to the outside world: environment, network, Firestore, Web
 * Push and a port. Everything it wires up is built and tested in its own module.
 */
const config = loadConfig(process.env);
/** The wall clock; every module takes time from here, so tests can fix it. */
const now = (): Date => new Date();
const llm =
  config.geminiApiKey === null
    ? null
    : createGeminiClientFromKey(config.geminiApiKey, config.models);
const air = createAirService(
  airSources(config.airDataMode, { fetchJson: fetchJsonOverNetwork, keys: config, now }),
);
// On Cloud Run, Firestore finds the project and authenticates as the service's own account.
const firestore =
  config.store === 'firestore' ? new Firestore({ ignoreUndefinedProperties: true }) : null;
/** A collection in Firestore, or in process memory for development. */
const collection = (name: string): DocumentCollection =>
  firestore === null ? createMemoryCollection() : firestoreCollection(firestore.collection(name));
const accounts =
  config.authMode === 'none'
    ? null
    : createAccountStore(
        { accounts: collection('accounts'), emails: collection('account-emails') },
        now,
      );
const verifyScheduler =
  config.scheduler === null ? null : oidcSchedulerVerifier(new OAuth2Client(), config.scheduler);

if (llm === null) logEvent('WARNING', 'No GEMINI_API_KEY: replies come from the engine alone.');
if (accounts === null) logEvent('WARNING', 'Sign-in off: one shared local household.');
if (firestore === null) logEvent('WARNING', 'STORE=memory: records are lost on restart.');

const server = createApp({
  config,
  llm,
  air,
  store: createUserStore(collection('users')),
  accounts,
  messenger: config.push === null ? createLogMessenger() : webPushMessenger(webpush, config.push),
  verifyScheduler,
}).listen(config.port, () => {
  logEvent('INFO', 'Vayu Mitra listening', {
    port: config.port,
    gemini: llm !== null,
    airData: config.airDataMode,
    stations: { cpcb: config.dataGovInApiKey !== null, waqi: config.waqiToken !== null },
    auth: config.authMode,
    store: config.store,
    push: config.push !== null,
    alerts: verifyScheduler !== null,
  });
});

// Cloud Run sends SIGTERM before stopping an instance; finish in-flight requests first.
process.on('SIGTERM', () => {
  server.close();
});
