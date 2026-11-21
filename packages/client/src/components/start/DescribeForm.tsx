import { useId, useState } from 'react';
import { extractProfile, type ExtractResponse } from '../../api/client.js';
import { useRequest } from '../../state/use-request.js';
import { Alert } from '../ui/Alert.js';

/** Shortest and longest description the server accepts. */
const LIMITS = { min: 15, max: 2000 } as const;

/** A worked example, so families see the kind of detail that helps. */
export const EXAMPLE_DESCRIPTION =
  'We are a family of four in Lajpat Nagar, Delhi. My father is 68, has asthma and walks in the park at 6 am. ' +
  'I drive 14 km to my office in a petrol car; my daughter (9) takes the school bus 5 km. We cook on LPG, ' +
  'light agarbatti every morning and evening, and use an angithi at night. Our society has 120 flats and the ' +
  'guards burn leaves. The metro is a 10-minute walk.';

interface DescribeFormProps {
  readonly onExtracted: (extracted: ExtractResponse) => void;
}

/** Free-text entry: the family describes their life, Gemini reads it into a profile to check. */
export function DescribeForm({ onExtracted }: DescribeFormProps): React.JSX.Element {
  const [text, setText] = useState('');
  const hintId = useId();
  const { state, start } = useRequest(async (description: string) => {
    onExtracted(await extractProfile(description));
  });
  const tooShort = text.trim().length < LIMITS.min;
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!tooShort) start(text.trim());
      }}
    >
      <label htmlFor="description" className="label">
        Describe your household
      </label>
      <textarea
        id="description"
        className="field min-h-40"
        value={text}
        maxLength={LIMITS.max}
        aria-describedby={hintId}
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      <p id={hintId} className="text-sm text-muted">
        Who lives with you (ages, asthma or heart conditions), how you get to work or school, how
        you cook and heat the home, and where you live. English, Hindi or Hinglish all work.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={tooShort || state.status === 'loading'}
        >
          {state.status === 'loading' ? 'Reading your description…' : 'Build my clean-air plan'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setText(EXAMPLE_DESCRIPTION);
          }}
        >
          Use an example
        </button>
      </div>
      {state.status === 'error' ? <Alert>{state.message}</Alert> : null}
    </form>
  );
}
