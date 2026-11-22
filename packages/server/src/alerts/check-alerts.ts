import { decideAlert } from '@vayu/core';
import type { AirService } from '../air/air-service.js';
import { describeCause, logEvent } from '../logging/log.js';
import type { Messenger } from '../push/messenger.js';
import type { UserRecord } from '../store/user-record.js';
import type { UserStore } from '../store/user-store.js';

export interface AlertJobDependencies {
  readonly air: AirService;
  readonly store: UserStore;
  readonly messenger: Messenger;
  readonly now: () => Date;
}

/** What one run did, for the scheduler's log. */
export interface AlertRunSummary {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Families checked at once: the air report cache absorbs most of the upstream load. */
const BATCH_SIZE = 20;

/** Checks one family; returns whether an alert went out. Saves only what changed. */
async function checkOne(
  deps: AlertJobDependencies,
  uid: string,
  record: UserRecord,
): Promise<boolean> {
  if (record.place === null || record.pushIds.length === 0) {
    return false;
  }
  const now = deps.now();
  const report = await deps.air.report(record.place.latitude, record.place.longitude);
  const decision = decideAlert({
    settings: record.alerts,
    state: record.alertState,
    report,
    memory: record.memory,
    placeName: record.place.name,
    now,
  });
  let pushIds = record.pushIds;
  if (decision.send) {
    const { staleIds } = await deps.messenger.send(pushIds, decision);
    pushIds = pushIds.filter((id) => !staleIds.includes(id));
  }
  const changed =
    pushIds.length !== record.pushIds.length ||
    JSON.stringify(decision.state) !== JSON.stringify(record.alertState);
  if (changed) {
    await deps.store.put(uid, { ...record, alertState: decision.state, pushIds });
  }
  return decision.send;
}

/**
 * Background alerts, run by Cloud Scheduler every 30 minutes. Each family with
 * alerts on gets the engine's decision for their place; one family's failure
 * is logged and does not stop the others.
 */
export async function checkAlerts(deps: AlertJobDependencies): Promise<AlertRunSummary> {
  const subscribers = await deps.store.alertSubscribers();
  const summary: AlertRunSummary = { checked: subscribers.length, sent: 0, skipped: 0, failed: 0 };
  for (let start = 0; start < subscribers.length; start += BATCH_SIZE) {
    const batch = subscribers.slice(start, start + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ uid, record }) => checkOne(deps, uid, record)),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        summary.failed += 1;
        logEvent('WARNING', 'alert check failed for one family', {
          cause: describeCause(result.reason),
        });
      } else if (result.value) {
        summary.sent += 1;
      } else {
        summary.skipped += 1;
      }
    }
  }
  logEvent('INFO', 'alert run finished', { ...summary });
  return summary;
}
