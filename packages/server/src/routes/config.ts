import { Router } from 'express';
import type { ServerConfig } from '../config.js';

/**
 * GET /api/config — what the browser needs to start: whether sign-in is on
 * and, if so, the project's public web config and Web Push key. These are
 * identifiers, not secrets; serving them at runtime keeps them out of the
 * repository and lets one build run against any project.
 */
export function configRouter(config: ServerConfig): Router {
  const router = Router();
  router.get('/config', (_request, response) => {
    response.setHeader('Cache-Control', 'no-cache');
    response.json({
      auth: config.authMode,
      firebase: config.firebase?.web ?? null,
      vapidKey: config.firebase?.vapidKey ?? null,
    });
  });
  return router;
}
