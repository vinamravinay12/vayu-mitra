import { useState } from 'react';
import type { ChatMessage, ChatState } from '../../state/use-chat.js';
import { Alert } from '../ui/Alert.js';
import { AdviceCard } from './AdviceCard.js';

/** How to start, shown until the first message. */
const INTRO =
  'Tell me who is at home and what you are planning. For example: “Dadi has asthma and walks at 6:30 every morning. Is it OK today?” I will remember what you tell me, and you can change it any time.';

/** The messages so far, announced politely as they arrive. */
function MessageLog({
  messages,
  today,
}: {
  readonly messages: readonly ChatMessage[];
  readonly today: string;
}): React.JSX.Element {
  return (
    <div role="log" aria-live="polite" aria-label="Conversation">
      <ol className="space-y-3">
        {messages.map((message) => (
          <li
            key={message.id}
            className={message.role === 'user' ? 'ml-8 rounded-lg bg-brand-soft p-3' : 'mr-4'}
          >
            <span className="sr-only">
              {message.role === 'user' ? 'You said:' : 'Vayu Mitra said:'}
            </span>
            <p className="whitespace-pre-line">{message.text}</p>
            {message.advice !== undefined && message.advice !== null && (
              <AdviceCard advice={message.advice} today={today} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The message being typed, and sending it, which clears the box. */
function useDraft(onSend: (text: string) => void) {
  const [draft, setDraft] = useState('');
  const submit = (event: React.SubmitEvent): void => {
    event.preventDefault();
    onSend(draft);
    setDraft('');
  };
  return { draft, setDraft, submit };
}

/** The message box. */
function Composer({
  pending,
  onSend,
}: {
  readonly pending: boolean;
  readonly onSend: (text: string) => void;
}): React.JSX.Element {
  const { draft, setDraft, submit } = useDraft(onSend);
  return (
    <form className="flex gap-2" onSubmit={submit}>
      <label htmlFor="chat-message" className="sr-only">
        Your message
      </label>
      <input
        id="chat-message"
        className="field min-w-0 flex-1"
        value={draft}
        maxLength={500}
        autoComplete="off"
        placeholder="Ask about a walk, school run, opening windows…"
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
      <button type="submit" className="btn-primary" disabled={pending || draft.trim() === ''}>
        Send
      </button>
    </form>
  );
}

interface ChatPanelProps {
  readonly chat: ChatState;
  readonly suggestions: readonly string[];
  /** The outlook's first date, so advice can say "tomorrow". */
  readonly today: string;
}

/** The conversation, the one-tap questions and the message box. */
export function ChatPanel({ chat, suggestions, today }: ChatPanelProps): React.JSX.Element {
  return (
    <section className="card flex flex-col gap-4" aria-labelledby="chat-heading">
      <h2 id="chat-heading" className="text-lg font-bold">
        Ask Vayu Mitra
      </h2>
      {chat.messages.length === 0 && <p className="text-ink-soft">{INTRO}</p>}
      <MessageLog messages={chat.messages} today={today} />
      {chat.pending && <Alert kind="status">Checking the air for you…</Alert>}
      {chat.error !== null && <Alert>{chat.error}</Alert>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
        {suggestions.map((question) => (
          <button
            key={question}
            type="button"
            className="btn-secondary py-1 text-sm"
            disabled={chat.pending}
            onClick={() => {
              chat.send(question);
            }}
          >
            {question}
          </button>
        ))}
      </div>
      <Composer pending={chat.pending} onSend={chat.send} />
    </section>
  );
}
