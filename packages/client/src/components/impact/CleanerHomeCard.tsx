/** What the household can change: low-emission steps with their estimated saving, and indoor air hacks. */
import {
  indoorHacks,
  lowEmissionSteps,
  type IndoorHack,
  type LowEmissionStep,
  type Memory,
  type Saving,
} from '@vayu/core';

/** "About 2.1 kg of CO₂ and 400 mg of PM2.5 less per trip (estimate)." */
export function describeSaving(saving: Saving): string {
  const pm25 = saving.pm25Milligrams > 0 ? ` and ${String(saving.pm25Milligrams)} mg of PM2.5` : '';
  return `About ${String(saving.co2Kg)} kg of CO₂${pm25} less per ${saving.per} (estimate).`;
}

/** One step or hack: what to do, why, and the saving when there is one. */
function Item({ item }: { readonly item: LowEmissionStep | IndoorHack }): React.JSX.Element {
  const saving = 'saving' in item ? item.saving : null;
  return (
    <li className="space-y-1">
      <p className="font-semibold">{item.title}</p>
      <p className="text-sm text-ink-soft">{item.detail}</p>
      {saving !== null && (
        <p className="text-sm font-medium text-ok-fg">{describeSaving(saving)}</p>
      )}
    </li>
  );
}

/** A titled list of items. */
function ItemList({
  id,
  heading,
  items,
}: {
  readonly id: string;
  readonly heading: string;
  readonly items: readonly (LowEmissionStep | IndoorHack)[];
}): React.JSX.Element {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="font-semibold text-ink-soft">
        {heading}
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Two lists built from what the family has told Vayu Mitra, so they change as
 * the memory does: what adds less to the smog, then what keeps it out indoors.
 */
export function CleanerHomeCard({ memory }: { readonly memory: Memory }): React.JSX.Element {
  return (
    <section className="card space-y-4" aria-labelledby="cleaner-home-heading">
      <h2 id="cleaner-home-heading" className="text-lg font-bold">
        Cut the smog at home
      </h2>
      <p className="text-sm text-muted">
        Based on what you have told me. Savings are estimates from typical Indian city figures.
      </p>
      <ItemList
        id="low-emission-heading"
        heading="Add less to the smog"
        items={lowEmissionSteps(memory)}
      />
      <ItemList id="indoor-heading" heading="Cleaner air indoors" items={indoorHacks(memory)} />
    </section>
  );
}
