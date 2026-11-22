import { z } from 'zod';

/** Accepted lengths, in characters, for free text from the browser. */
export const TEXT_LIMITS = { placeQueryMin: 2, placeQueryMax: 80 } as const;

export const placesQuerySchema = z.object({
  q: z.string().trim().min(TEXT_LIMITS.placeQueryMin).max(TEXT_LIMITS.placeQueryMax),
});

/** Query-string coordinates arrive as text. */
export const airQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/** A Firebase Installation ID the browser registered for push. */
export const pushIdSchema = z.object({ id: z.string().min(1).max(256) });
