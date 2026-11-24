/** The chat request and response, and their limits. */
import { z } from 'zod';
import { activityAdviceSchema } from '../advice/advice-schema.js';
import { memorySchema } from '../memory/memory-schema.js';
import { placeSchema } from '../schemas/air-report.js';

/** How much text a turn and a reply may carry, how many earlier turns go with it, and how many one-tap questions are offered. */
export const CHAT_LIMITS = {
  message: 500,
  reply: 1500,
  historyTurns: 8,
  suggestions: 4,
} as const;

const chatTurnSchema = z.strictObject({
  role: z.enum(['user', 'assistant']),
  text: z.string().max(CHAT_LIMITS.reply),
});

/** What the browser sends: the new message, where the family is, recent turns. */
export const chatRequestSchema = z.strictObject({
  message: z.string().trim().min(1).max(CHAT_LIMITS.message),
  place: placeSchema,
  history: z.array(chatTurnSchema).max(CHAT_LIMITS.historyTurns),
});

/** What comes back: the reply, the engine's advice card, the updated memory. */
export const chatResponseSchema = z.object({
  reply: z.string().min(1).max(CHAT_LIMITS.reply),
  advice: activityAdviceSchema.nullable(),
  memory: memorySchema,
  suggestions: z.array(z.string().max(120)).max(CHAT_LIMITS.suggestions),
  /** `ai`: Gemini wrote the reply. `engine`: the fallback did, from the same facts. */
  source: z.enum(['ai', 'engine']),
});

/** One earlier turn, as the browser sends it back. */
export type ChatTurn = z.infer<typeof chatTurnSchema>;
/** What the browser sends for one turn. */
export type ChatRequest = z.infer<typeof chatRequestSchema>;
/** What the server answers for one turn. */
export type ChatResponse = z.infer<typeof chatResponseSchema>;
