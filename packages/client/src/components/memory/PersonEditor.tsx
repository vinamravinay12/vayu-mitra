import {
  AGE_GROUPS,
  AGE_LABELS,
  CONDITION_LABELS,
  HEALTH_CONDITIONS,
  type PersonFact,
} from '@vayu/core';
import { useState } from 'react';
import { z } from 'zod';
import { EditorActions, type EditorProps } from './EditorActions.js';

/** The select's value, read back as the option it must be; a value outside the list throws. */
const AGE_GROUP = z.enum(AGE_GROUPS);

/** One health condition. */
type Condition = PersonFact['conditions'][number];

/** The draft with the condition added, or removed if it was there. */
const toggled = (draft: PersonFact, condition: Condition): PersonFact => ({
  ...draft,
  conditions: draft.conditions.includes(condition)
    ? draft.conditions.filter((known) => known !== condition)
    : [...draft.conditions, condition],
});

/** The health conditions, as checkboxes in a labelled group. */
function ConditionChecks({
  draft,
  onToggle,
}: {
  readonly draft: PersonFact;
  readonly onToggle: (condition: Condition) => void;
}): React.JSX.Element {
  return (
    <fieldset>
      <legend className="label">Health</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {HEALTH_CONDITIONS.map((condition) => (
          <label key={condition} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={draft.conditions.includes(condition)}
              onChange={() => {
                onToggle(condition);
              }}
            />
            {CONDITION_LABELS[condition]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The life-stage select, labelled with the person's name. */
function AgeSelect({
  draft,
  onChange,
}: {
  readonly draft: PersonFact;
  readonly onChange: (draft: PersonFact) => void;
}): React.JSX.Element {
  return (
    <>
      <label className="label" htmlFor={`${draft.id}-age`}>
        {draft.label} is a
      </label>
      <select
        id={`${draft.id}-age`}
        className="field"
        value={draft.ageGroup}
        onChange={(event) => {
          onChange({ ...draft, ageGroup: AGE_GROUP.parse(event.target.value) });
        }}
      >
        {AGE_GROUPS.map((age) => (
          <option key={age} value={age}>
            {AGE_LABELS[age]}
          </option>
        ))}
      </select>
    </>
  );
}

/** Life stage and conditions for one person. */
export function PersonEditor({
  fact,
  onSave,
  onCancel,
}: EditorProps<PersonFact>): React.JSX.Element {
  const [draft, setDraft] = useState(fact);
  const save = (event: React.SubmitEvent): void => {
    event.preventDefault();
    onSave(draft);
  };
  const toggle = (condition: Condition): void => {
    setDraft(toggled(draft, condition));
  };
  return (
    <form className="space-y-2" onSubmit={save}>
      <AgeSelect draft={draft} onChange={setDraft} />
      <ConditionChecks draft={draft} onToggle={toggle} />
      <EditorActions onCancel={onCancel} />
    </form>
  );
}
