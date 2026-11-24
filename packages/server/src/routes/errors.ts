/** JSON 404s and the last-resort error handler. */
import type { NextFunction, Request, Response } from 'express';
import { describeCause, logEvent } from '../logging/log.js';
import { fieldOf } from '../validation/field-of.js';

const KNOWN_ERRORS: Readonly<Record<string, { status: number; message: string }>> = {
  'entity.parse.failed': { status: 400, message: 'Request body must be valid JSON.' },
  'entity.too.large': { status: 413, message: 'Request is too large.' },
};

/** Errors the framework raises on purpose carry a type or a 404; anything else is a bug. */
export function describeBodyError(error: unknown): { status: number; message: string } | undefined {
  const [type, status] = [fieldOf(error, 'type'), fieldOf(error, 'status')];
  const known = typeof type === 'string' ? KNOWN_ERRORS[type] : undefined;
  if (known !== undefined) {
    return known;
  }
  return status === 404 ? { status: 404, message: 'Not found.' } : undefined;
}

/** JSON 404 for any route that does not exist. */
export const notFound = (_request: Request, response: Response): void => {
  response.status(404).json({ error: 'Not found.' });
};

/**
 * Last resort: known request errors get their status; anything else is logged
 * and a generic 500. Express recognises an error handler by its four
 * parameters, which is why this one function is allowed four (eslint.config.js).
 */
export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const known = describeBodyError(error);
  if (known === undefined) {
    logEvent('ERROR', 'unhandled error', { cause: describeCause(error) });
  }
  response.status(known?.status ?? 500).json({ error: known?.message ?? 'Something went wrong.' });
}
