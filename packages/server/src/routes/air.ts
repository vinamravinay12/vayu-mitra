import { Router, type Request, type Response } from 'express';
import type { AirService } from '../air/air-service.js';
import { UpstreamError } from '../air/fetch-json.js';
import { describeCause, logEvent } from '../logging/log.js';
import { airQuerySchema, placesQuerySchema, TEXT_LIMITS } from '../validation/request-schemas.js';

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

/** GET /api/places and GET /api/air — place search and the station-anchored air report. */
export function airRouter(air: AirService): Router {
  const router = Router();
  router.get('/places', placesHandler(air));
  router.get('/air', reportHandler(air));
  return router;
}

/** Place search by name; cached a day, since places do not move. */
const placesHandler = (air: AirService) => async (request: Request, response: Response) => {
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
};

/** The air report for a point; cached five minutes, as stations report hourly. */
const reportHandler = (air: AirService) => async (request: Request, response: Response) => {
  const parsed = airQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: 'Latitude and longitude are required.' });
    return;
  }
  try {
    const report = await air.report(parsed.data.lat, parsed.data.lon);
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.json(report);
  } catch (cause) {
    if (!respondToUpstreamError(cause, response)) throw cause;
  }
};
