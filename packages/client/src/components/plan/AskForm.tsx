import { useId, useState } from 'react';
import { askQuestion, type AskResponse, type PlanContext } from '../../api/client.js';
import { useRequest, type RequestState } from '../../state/use-request.js';
import { Alert } from '../ui/Alert.js';

/** Questions families often ask, as one-tap starters. */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  'When is the safest time for a walk today?',
  'Is it safe to open the windows?',
  'What matters most for the most vulnerable person in our home?',
];

/** Shortest and longest question the server accepts. */
const LIMITS = { min: 5, max: 300 } as const;

/** The state of the latest question, announced politely. */
function AnswerView({
  state,
  asked,
  language,
}: {
  readonly state: RequestState<AskResponse>;
  readonly asked: string;
  readonly language: string;
}): React.JSX.Element | null {
  if (state.status === 'loading') return <Alert kind="status">Thinking about “{asked}”…</Alert>;
  if (state.status === 'error') return <Alert>{state.message}</Alert>;
  if (state.status !== 'done') return null;
  return (
    <div aria-live="polite" className="rounded-lg bg-brand-soft p-4">
      <p className="text-sm font-semibold">You asked: {asked}</p>
      <p lang={state.value.verified ? language : 'en'}>{state.value.answer}</p>
    </div>
  );
}

interface QuestionInputProps {
  readonly inputId: string;
  readonly busy: boolean;
  readonly question: string;
  readonly onQuestion: (question: string) => void;
  readonly onSend: (question: string) => void;
}

/** The free-text question box and the one-tap suggestions. */
function QuestionInput({
  inputId,
  busy,
  question,
  onQuestion,
  onSend,
}: QuestionInputProps): React.JSX.Element {
  const ready = question.trim().length >= LIMITS.min && !busy;
  return (
    <>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onSend(question.trim());
        }}
      >
        <label htmlFor={inputId} className="label">
          Your question
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={inputId}
            className="field min-w-0 flex-1"
            value={question}
            maxLength={LIMITS.max}
            onChange={(event) => {
              onQuestion(event.target.value);
            }}
          />
          <button type="submit" className="btn-primary" disabled={!ready}>
            Ask
          </button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="btn-secondary min-h-9 py-1 text-sm"
            disabled={busy}
            onClick={() => {
              onQuestion(suggestion);
              onSend(suggestion);
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </>
  );
}

/** Ask Vayu Mitra about the plan; answers are grounded in the plan's own numbers. */
export function AskForm({ context }: { readonly context: PlanContext }): React.JSX.Element {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const inputId = useId();
  const { state, start } = useRequest(askQuestion);
  return (
    <section className="card space-y-3" aria-labelledby={`${inputId}-heading`}>
      <h2 id={`${inputId}-heading`} className="text-lg font-semibold">
        Ask about your plan
      </h2>
      <QuestionInput
        inputId={inputId}
        busy={state.status === 'loading'}
        question={question}
        onQuestion={setQuestion}
        onSend={(text) => {
          setAsked(text);
          start(context, text);
        }}
      />
      <AnswerView state={state} asked={asked} language={context.language} />
    </section>
  );
}
