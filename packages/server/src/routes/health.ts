import { Router } from 'express';
import type { ServerConfig } from '../config.js';

/** GET /api/health — liveness and which integrations are on, never anything about the keys. */
export function healthRouter(mode: 'gemini' | 'offline', config: ServerConfig): Router {
  const router = Router();
  router.get('/health', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.json({
      status: 'ok',
      mode,
      airData: config.airDataMode,
      stations: {
        cpcb: config.dataGovInApiKey !== null,
        waqi: config.waqiToken !== null,
      },
      auth: config.authMode,
      alerts: config.scheduler !== null,
    });
  });
  return router;
}
