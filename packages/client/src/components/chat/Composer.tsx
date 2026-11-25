/** The message box: a visible label, the input, Send, and the length limit announced with it. */
import { useState } from 'react';

/** The longest message the server accepts, said beside the box rather than discovered. */
const MAX_MESSAGE = 500;

/** The id of the hint the input is described by. */
const HINT_ID = 'chat-message-hint';

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

/** The input itself, described by the limit below it. */
function MessageInput({
  draft,
  onChange,
}: {
  readonly draft: string;
  readonly onChange: (text: string) => void;
}): React.JSX.Element {
  return (
    <input
      id="chat-message"
      className="field min-w-0 flex-1"
      aria-describedby={HINT_ID}
      value={draft}
      maxLength={MAX_MESSAGE}
      autoComplete="off"
      placeholder="Ask about a walk, school run, opening windows…"
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

/** The message box, with a visible label and its limit announced with it. */
export function Composer({
  pending,
  onSend,
}: {
  readonly pending: boolean;
  readonly onSend: (text: string) => void;
}): React.JSX.Element {
  const { draft, setDraft, submit } = useDraft(onSend);
  return (
    <form onSubmit={submit}>
      <label htmlFor="chat-message" className="label">
        Your message
      </label>
      <div className="flex gap-2">
        <MessageInput draft={draft} onChange={setDraft} />
        <button type="submit" className="btn-primary" disabled={pending || draft.trim() === ''}>
          Send
        </button>
      </div>
      <p id={HINT_ID} className="mt-1 text-sm text-muted">
        {`Up to ${String(MAX_MESSAGE)} characters.`}
      </p>
    </form>
  );
}
