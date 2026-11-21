import type { ExtractResponse } from '../../api/client.js';
import { DescribeForm } from './DescribeForm.js';

interface StartScreenProps {
  readonly onExtracted: (extracted: ExtractResponse) => void;
  readonly onFillManually: () => void;
}

/** What Vayu Mitra does, in three promises. */
const PROMISES: readonly (readonly [string, string])[] = [
  [
    'Today’s cleanest hours',
    'An hour-by-hour routine for your city’s forecast: when to air the home, exercise and travel.',
  ],
  [
    'Fixes ranked for your family',
    'Indoor air hacks and low-emission switches, ordered by how much they protect the most vulnerable person at home.',
  ],
  [
    'The impact of every choice',
    'See each change cut your family’s smog dose, and how much PM2.5 it keeps out of your neighbourhood’s air.',
  ],
];

/** The first screen: describe the household in words, or fill in the form. */
export function StartScreen({ onExtracted, onFillManually }: StartScreenProps): React.JSX.Element {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">
          A clean-air plan for your family, for today’s smog
        </h1>
        <p className="max-w-3xl text-lg text-ink-soft">
          Winter smog is worst at dawn and at night, and much of what a family breathes comes from
          inside the home. Tell Vayu Mitra how you live, and it works out what to change first — and
          shows you exactly what each change does.
        </p>
      </section>
      <ul className="grid gap-4 sm:grid-cols-3">
        {PROMISES.map(([title, detail]) => (
          <li key={title} className="card">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{detail}</p>
          </li>
        ))}
      </ul>
      <section className="card space-y-4" aria-labelledby="describe-heading">
        <h2 id="describe-heading" className="text-xl font-semibold">
          Tell us about your household
        </h2>
        <DescribeForm onExtracted={onExtracted} />
        <p className="text-sm text-ink-soft">
          Prefer not to use AI?{' '}
          <button
            type="button"
            className="font-semibold text-brand underline"
            onClick={onFillManually}
          >
            Fill in the form yourself
          </button>
          .
        </p>
      </section>
    </div>
  );
}
