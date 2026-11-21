import { Router } from 'express';
import type { AirDataMode } from '../config.js';

/** GET /api/health — liveness, which model mode and which air source is running. */
export function healthRouter(mode: 'gemini' | 'offline', airDataMode: AirDataMode): Router {
  const router = Router();
  router.get('/health', (_request, response) => {
    // Reports whether a key is in use, never anything about the key itself.
    response.setHeader('Cache-Control', 'no-store');
    response.json({ status: 'ok', mode, airData: airDataMode });
  });
  return router;
}
