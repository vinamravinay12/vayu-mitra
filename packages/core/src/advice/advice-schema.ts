/** The shape of a piece of advice: the verdict, the hours compared, and the precautions. */
import { z } from 'zod';
import { AQI_CATEGORIES } from '../catalog/aqi-bands.js';
import { ACTIVITIES } from '../catalog/vocabulary.js';
import { ADVICE_TIP_IDS } from './tips.js';

/**
 * go: fine at the planned time. shift: a cleaner hour later is fine.
 * care: acceptable with precautions. skip: no good time in the outlook.
 */
const VERDICTS = ['go', 'shift', 'care', 'skip'] as const;

const adviceHourSchema = z.object({
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/),
  aqi: z.number().int().min(0).max(500),
  category: z.enum(AQI_CATEGORIES),
});

/** The engine's answer to "can we do this?", which the AI only puts into words. */
export const activityAdviceSchema = z.object({
  activity: z.enum(ACTIVITIES),
  verdict: z.enum(VERDICTS),
  /** The hour asked about: the routine's usual time, or now. */
  planned: adviceHourSchema,
  /** The cleanest daylight window in the outlook, when better than planned. */
  bestWindow: adviceHourSchema.nullable(),
  /** Who makes this a sensitive case, by label. */
  sensitiveFor: z.array(z.string().max(40)).max(8),
  tips: z.array(z.enum(ADVICE_TIP_IDS)).max(ADVICE_TIP_IDS.length),
  indoorAlternative: z.string().max(200),
});

/** Go, shift to a better hour, go with care, or skip. */
export type Verdict = (typeof VERDICTS)[number];
/** One hour the advice compares: its time, index and category. */
export type AdviceHour = z.infer<typeof adviceHourSchema>;
/** One piece of advice, as the engine decides it and the card shows it. */
export type ActivityAdvice = z.infer<typeof activityAdviceSchema>;
