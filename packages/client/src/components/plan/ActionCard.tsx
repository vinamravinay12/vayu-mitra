import { COST_LABELS, type AssessedAction } from '@vayu/core';
import { useId } from 'react';

interface ActionCardProps {
  readonly assessed: AssessedAction;
  readonly chosen: boolean;
  readonly onToggle: () => void;
}

/** Effort in words. */
const EFFORT_WORDS = { easy: 'Easy', moderate: 'Some effort', hard: 'Hard' } as const;

/** One recommendation: choose it, see its computed impact, and how to do it. */
export function ActionCard({ assessed, chosen, onToggle }: ActionCardProps): React.JSX.Element {
  const { action, explanation, recommended } = assessed;
  const checkboxId = useId();
  return (
    <li className={`card space-y-3 ${chosen ? 'border-brand ring-1 ring-brand' : ''}`}>
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-brand"
          checked={chosen}
          aria-describedby={`${checkboxId}-impact`}
          onChange={onToggle}
        />
        <div className="min-w-0 space-y-1">
          <label htmlFor={checkboxId} className="block font-semibold text-ink">
            {action.title}
          </label>
          <p className="flex flex-wrap gap-2 text-xs font-medium text-ink-soft">
            <span className="rounded-full bg-brand-soft px-2 py-0.5">
              {COST_LABELS[action.cost]}
            </span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5">
              {EFFORT_WORDS[action.effort]}
            </span>
            {recommended ? (
              <span className="rounded-full bg-ok-bg px-2 py-0.5 text-ok-fg">
                Recommended for you
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <ul id={`${checkboxId}-impact`} className="space-y-1 text-sm text-ink">
        {explanation.map((sentence) => (
          <li key={sentence}>{sentence}</li>
        ))}
      </ul>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-brand">
          How to do it, and why it works
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
          {action.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-2 text-ink-soft">{action.why}</p>
      </details>
    </li>
  );
}
