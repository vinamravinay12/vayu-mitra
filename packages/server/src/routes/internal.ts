/** The scheduler-only route that runs the alert check. */
import { Router } from 'express';
import { checkAlerts, type AlertJobDependencies } from '../alerts/check-alerts.js';
import { bearerToken } from '../auth/require-user.js';
import type { SchedulerVerifier } from '../auth/require-user.js';

/**
 * POST /api/internal/check-alerts — the background alert run. Only Cloud
 * Scheduler can call it: the request must carry a Google-signed OIDC token for
 * this service's audience, issued to the scheduler's own service account.
 * Anyone else gets the same 404 as a route that does not exist.
 */
export function internalRouter(deps: AlertJobDependencies, verify: SchedulerVerifier): Router {
  const router = Router();
  router.post('/internal/check-alerts', async (request, response) => {
    const token = bearerToken(request.get('authorization'));
    if (token === null || !(await verify(token))) {
      response.status(404).json({ error: 'Not found.' });
      return;
    }
    response.json(await checkAlerts(deps));
  });
  return router;
}
