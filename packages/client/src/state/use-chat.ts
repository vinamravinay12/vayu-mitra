import { CHAT_LIMITS, type ActivityAdvice, type ChatResponse, type Place } from '@vayu/core';
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

export interface ChatState {
  readonly messages: readonly ChatMessage[];
  readonly pending: boolean;
  readonly error: string | null;
  readonly send: (text: string) => void;
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
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(0);
  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (place === null || message === '' || pending) return;
      const id = (nextId.current += 2);
      const history = messages
        .slice(-CHAT_LIMITS.historyTurns)
        .map(({ role, text: turn }) => ({ role, text: turn }));
      setMessages((current) => [...current, { id, role: 'user', text: message }]);
      setPending(true);
      setError(null);
      api
        .chat({ message, place, history })
        .then((reply) => {
          setMessages((current) => [
            ...current,
            {
              id: id + 1,
              role: 'assistant',
              text: reply.reply,
              advice: reply.advice,
              source: reply.source,
            },
          ]);
          onReply(reply);
        })
        .catch((cause: unknown) => {
          setError(messageOf(cause));
        })
        .finally(() => {
          setPending(false);
        });
    },
    [api, messages, onReply, pending, place],
  );
  return { messages, pending, error, send };
}
