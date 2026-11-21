import { ACTIONS_BY_ID, type Language } from '@vayu/core';
import { useEffect } from 'react';
import { fetchCoach, type CoachResponse, type PlanContext } from '../../api/client.js';
import { useRequest } from '../../state/use-request.js';
import { Alert } from '../ui/Alert.js';
import { AskForm } from './AskForm.js';

/** Language choices for the coach. */
const LANGUAGES: readonly (readonly [Language, string])[] = [
  ['en', 'English'],
  ['hi', 'हिन्दी'],
];

/** Who wrote the explanation, said plainly. */
const SOURCE_NOTE = {
  ai: 'Written by Gemini from your plan’s numbers, and checked: every figure in it comes from the engine.',
  engine: 'The AI coach is unavailable, so this is the engine’s own summary of your plan.',
} as const;

/** The language radios. */
function LanguageChoice({
  language,
  onChange,
}: {
  readonly language: Language;
  readonly onChange: (language: Language) => void;
}): React.JSX.Element {
  return (
    <fieldset>
      <legend className="label">Language</legend>
      <div className="flex gap-4">
        {LANGUAGES.map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="coach-language"
              className="size-5 accent-brand"
              checked={language === value}
              onChange={() => {
                onChange(value);
              }}
            />
            <span lang={value}>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The coach's explanation, with an honest note on who wrote it. */
function Explanation({
  coach,
  language,
}: {
  readonly coach: CoachResponse;
  readonly language: Language;
}): React.JSX.Element {
  return (
    <div aria-live="polite" lang={coach.source === 'ai' ? language : 'en'} className="space-y-3">
      <p className="text-lg font-semibold">{coach.headline}</p>
      <p>{coach.summary}</p>
      {coach.priorities.length > 0 ? (
        <ol className="list-decimal space-y-1 pl-5">
          {coach.priorities.map((priority) => (
            <li key={priority.actionId}>
              <span className="font-semibold">{ACTIONS_BY_ID.get(priority.actionId)?.title}:</span>{' '}
              {priority.why}
            </li>
          ))}
        </ol>
      ) : null}
      <p className="text-xs text-muted" lang="en">
        {SOURCE_NOTE[coach.source]}
      </p>
    </div>
  );
}

interface CoachPanelProps {
  readonly context: PlanContext;
  readonly onLanguage: (language: Language) => void;
}

/** The AI coach: a personal explanation of the plan, and answers to the family's questions. */
export function CoachPanel({ context, onLanguage }: CoachPanelProps): React.JSX.Element {
  const coach = useRequest(fetchCoach);
  const { reset } = coach;
  const key = JSON.stringify(context);
  // A changed choice or language makes an old explanation wrong, so it is cleared.
  useEffect(() => {
    reset();
  }, [key, reset]);
  return (
    <div className="space-y-5">
      <section className="card space-y-4" aria-labelledby="coach-heading">
        <h2 id="coach-heading" className="text-lg font-semibold">
          Your plan, explained
        </h2>
        <LanguageChoice language={context.language} onChange={onLanguage} />
        <button
          type="button"
          className="btn-primary"
          disabled={coach.state.status === 'loading'}
          onClick={() => {
            coach.start(context);
          }}
        >
          {coach.state.status === 'loading' ? 'Writing your explanation…' : 'Explain my plan'}
        </button>
        {coach.state.status === 'error' ? <Alert>{coach.state.message}</Alert> : null}
        {coach.state.status === 'done' ? (
          <Explanation coach={coach.state.value} language={context.language} />
        ) : null}
      </section>
      <AskForm context={context} />
    </div>
  );
}
