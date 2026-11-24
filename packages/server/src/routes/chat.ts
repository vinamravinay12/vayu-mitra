/** POST /api/chat: one turn of the conversation. */
import { chatRequestSchema, type ChatRequest } from '@vayu/core';
import { Router } from 'express';
import { userOf } from '../auth/require-user.js';
import { stripInvisible } from '../guard/strip-invisible.js';
import { runChat, type ChatDependencies } from '../chat/run-chat.js';
import { respondToUpstreamError } from './air.js';

/** The request with invisible characters removed from every piece of text the model will read. */
const withoutInvisible = (request: ChatRequest): ChatRequest => ({
  ...request,
  message: stripInvisible(request.message).trim(),
  history: request.history.map((turn) => ({ ...turn, text: stripInvisible(turn.text) })),
});

/** POST /api/chat — one turn of the conversation. */
export function chatRouter(deps: ChatDependencies): Router {
  const router = Router();
  router.post('/chat', async (request, response) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    const turn = parsed.success ? withoutInvisible(parsed.data) : null;
    if (turn === null || turn.message === '') {
      response.status(400).json({ error: 'Please write a message of up to 500 characters.' });
      return;
    }
    try {
      response.setHeader('Cache-Control', 'no-store');
      response.json(await runChat(deps, userOf(response), turn));
    } catch (cause) {
      if (!respondToUpstreamError(cause, response)) throw cause;
    }
  });
  return router;
}
