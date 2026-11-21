import { Router, type Response } from 'express';
import type { AirService } from '../air/air-service.js';
import { UpstreamError } from '../air/fetch-json.js';
import { describeCause, logEvent } from '../logging/log.js';
import { airQuerySchema, placesQuerySchema, TEXT_LIMITS } from '../validation/schemas.js';

/** Answers an upstream failure with 502; returns false for anything else. */
export function respondToUpstreamError(cause: unknown, response: Response): boolean {
  if (
    !(cause instanceof UpstreamError) &&
    !(cause instanceof Error && cause.name === 'TimeoutError')
  ) {
    return false;
  }
  logEvent('WARNING', 'air data upstream failed', { cause: describeCause(cause) });
  response.status(502).json({
    error: 'The air-quality service is not answering right now. Please try again in a minute.',
  });
  return true;
}

/** GET /api/places and GET /api/air — place search and the hourly forecast. */
export function airRouter(air: AirService): Router {
  const router = Router();
  router.get('/places', async (request, response) => {
    const parsed = placesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json({
        error: `Type ${String(TEXT_LIMITS.placeQueryMin)} to ${String(TEXT_LIMITS.placeQueryMax)} characters of a place name.`,
      });
      return;
    }
    try {
      response.setHeader('Cache-Control', 'public, max-age=86400');
      response.json({ places: await air.places(parsed.data.q) });
    } catch (cause) {
      if (!respondToUpstreamError(cause, response)) throw cause;
    }
  });
  router.get('/air', async (request, response) => {
    const parsed = airQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json({ error: 'Latitude and longitude are required.' });
      return;
    }
    try {
      const snapshot = await air.forecast(parsed.data.lat, parsed.data.lon);
      response.setHeader('Cache-Control', 'public, max-age=900');
      response.json(snapshot);
    } catch (cause) {
      if (!respondToUpstreamError(cause, response)) throw cause;
    }
  });
  return router;
}
