import { ACTION_CATEGORIES, toggleChoice, type CleanAirPlan } from '@vayu/core';
import { CATEGORY_TITLES } from '../../lib/labels.js';
import { ActionCard } from './ActionCard.js';

interface ActionsPanelProps {
  readonly plan: CleanAirPlan;
  readonly onChoose: (chosenIds: readonly string[]) => void;
}

/**
 * Every action that applies to this household, grouped as the problem frames
 * them: daily routines, indoor fixes and sustainable alternatives. Choosing an
 * action recomputes the whole plan in the browser at once.
 */
export function ActionsPanel({ plan, onChoose }: ActionsPanelProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        Ranked by how much each one protects your family — the most vulnerable first — then by how
        much smog it keeps out of your neighbourhood. Tick the ones you will do.
      </p>
      {ACTION_CATEGORIES.map((category) => {
        const actions = plan.actions.filter((assessed) => assessed.action.category === category);
        return (
          <section key={category} aria-labelledby={`category-${category}`} className="space-y-3">
            <h2 id={`category-${category}`} className="text-lg font-semibold">
              {CATEGORY_TITLES[category]}
            </h2>
            {actions.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing here would make a real difference for your household today.
              </p>
            ) : (
              <ul className="space-y-3">
                {actions.map((assessed) => (
                  <ActionCard
                    key={assessed.action.id}
                    assessed={assessed}
                    chosen={plan.chosenIds.includes(assessed.action.id)}
                    onToggle={() => {
                      onChoose(toggleChoice(plan.chosenIds, assessed.action.id, plan.actions));
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
