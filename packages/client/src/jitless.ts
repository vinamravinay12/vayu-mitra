/** Zod configured for the page’s CSP: schemas are interpreted, never compiled with eval. */
import { z } from 'zod';

/**
 * The page's CSP forbids `eval`, and Trusted Types reports any attempt.
 * Zod would otherwise probe `new Function` to compile faster validators, so
 * it is told to interpret schemas instead. Imported first, before any schema.
 */
z.config({ jitless: true });
