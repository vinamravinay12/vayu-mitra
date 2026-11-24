/** The conversation in this tab: messages, the turn under way, and sending one. */
import {
  CHAT_LIMITS,
  type ActivityAdvice,
  type ChatRequest,
  type ChatResponse,
  type Place,
} from '@vayu/core';
import { useCallback, useRef, useState } from 'react';
import type { Api } from '../api/api.js';
import { messageOf } from './use-startup.js';

/** One message on screen. Assistant messages may carry the engine's advice card. */
export interface ChatMessage {
  readonly id: number;
  readonly role: 'user' | 'assistant';
  readonly text: string;
  readonly advice?: ActivityAdvice | null;
  readonly source?: ChatResponse['source'];
}

/** The conversation as the chat panel uses it. */
export interface ChatState {
  readonly messages: readonly ChatMessage[];
  readonly pending: boolean;
  readonly error: string | null;
  readonly send: (text: string) => void;
}

/** The last few turns, as the server takes them, so a follow-up makes sense. */
const historyOf = (messages: readonly ChatMessage[]) =>
  messages.slice(-CHAT_LIMITS.historyTurns).map(({ role, text }) => ({ role, text }));

/** The reply as a message on screen, with its advice card. */
const assistantMessage = (id: number, reply: ChatResponse): ChatMessage => ({
  id,
  role: 'assistant',
  text: reply.reply,
  advice: reply.advice,
  source: reply.source,
});

/** Sends one turn and reports the answer or a readable error, then that it is done. */
function ask(
  api: Api,
  request: ChatRequest,
  on: {
    readonly onAnswer: (reply: ChatResponse) => void;
    readonly onError: (message: string) => void;
    readonly onDone: () => void;
  },
): void {
  api
    .chat(request)
    .then(on.onAnswer)
    .catch((cause: unknown) => {
      on.onError(messageOf(cause));
    })
    .finally(on.onDone);
}

/** The messages on screen, adding one, and ids for a new turn (two per turn: question and reply). */
function useMessages() {
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const lastId = useRef(0);
  const append = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  }, []);
  const nextId = useCallback(() => (lastId.current += 2), []);
  return { messages, append, nextId };
}

/** Whether a turn is under way and the last error: a turn starts clean and finishes either way. */
function useTurnStatus() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = useCallback(() => {
    setPending(true);
    setError(null);
  }, []);
  const finish = useCallback(() => {
    setPending(false);
  }, []);
  return { pending, error, start, fail: setError, finish };
}

/**
 * The conversation. It lives only in this tab: the server keeps what was
 * learnt (the memory chips), never the transcript. The last few turns go with
 * each message so a follow-up like "and at 5 pm?" makes sense.
 */
export function useChat(
  api: Api,
  place: Place | null,
  onReply: (reply: ChatResponse) => void,
): ChatState {
  const { messages, append, nextId } = useMessages();
  const { pending, error, start, fail, finish } = useTurnStatus();
  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (place === null || message === '' || pending) return;
      const id = nextId();
      const request = { message, place, history: historyOf(messages) };
      append({ id, role: 'user', text: message });
      start();
      ask(api, request, {
        onAnswer: (reply) => {
          append(assistantMessage(id + 1, reply));
          onReply(reply);
        },
        onError: fail,
        onDone: finish,
      });
    },
    [api, append, fail, finish, messages, nextId, onReply, pending, place, start],
  );
  return { messages, pending, error, send };
}
