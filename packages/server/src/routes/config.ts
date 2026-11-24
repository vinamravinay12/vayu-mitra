/** GET /api/config: what the browser needs to start. */
import { Router } from 'express';
import type { ServerConfig } from '../config.js';

/**
 * GET /api/config — what the browser needs to start: whether sign-in is on,
 * and the Web Push public key when alerts are set up. Both are public.
 */
export function configRouter(config: ServerConfig): Router {
  const router = Router();
  router.get('/config', (_request, response) => {
    response.setHeader('Cache-Control', 'no-cache');
    response.json({ auth: config.authMode, vapidKey: config.push?.publicKey ?? null });
  });
  return router;
}
