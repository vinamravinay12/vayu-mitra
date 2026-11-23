import { chatRequestSchema } from '@vayu/core';
import { Router } from 'express';
import { userOf } from '../auth/require-user.js';
import { runChat, type ChatDependencies } from '../chat/run-chat.js';
import { respondToUpstreamError } from './air.js';

/** POST /api/chat — one turn of the conversation. */
export function chatRouter(deps: ChatDependencies): Router {
  const router = Router();
  router.post('/chat', async (request, response) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Please write a message of up to 500 characters.' });
      return;
    }
    try {
      response.setHeader('Cache-Control', 'no-store');
      response.json(await runChat(deps, userOf(response), parsed.data));
    } catch (cause) {
      if (!respondToUpstreamError(cause, response)) throw cause;
    }
  });
  return router;
}
