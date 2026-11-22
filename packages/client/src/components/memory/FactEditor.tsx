import {
  AGE_GROUPS,
  AGE_LABELS,
  CONDITION_LABELS,
  HEALTH_CONDITIONS,
  type MemoryFact,
  type PersonFact,
  type RoutineFact,
} from '@vayu/core';
import { useState } from 'react';

interface EditorProps<F> {
  readonly fact: F;
  readonly onSave: (fact: F) => void;
  readonly onCancel: () => void;
}

/** Save and Cancel, shared by both editors. */
function Actions({ onCancel }: { readonly onCancel: () => void }): React.JSX.Element {
  return (
    <div className="flex gap-2">
      <button type="submit" className="btn-primary min-h-9 py-1 text-sm">
        Save
      </button>
      <button type="button" className="btn-secondary min-h-9 py-1 text-sm" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

/** Life stage and conditions for one person. */
function PersonEditor({ fact, onSave, onCancel }: EditorProps<PersonFact>): React.JSX.Element {
  const [draft, setDraft] = useState(fact);
  const toggle = (condition: PersonFact['conditions'][number]): void => {
    const has = draft.conditions.includes(condition);
    setDraft({
      ...draft,
      conditions: has
        ? draft.conditions.filter((c) => c !== condition)
        : [...draft.conditions, condition],
    });
  };
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <label className="label" htmlFor={`${fact.id}-age`}>
        {fact.label} is a
      </label>
      <select
        id={`${fact.id}-age`}
        className="field"
        value={draft.ageGroup}
        onChange={(event) => {
          setDraft({ ...draft, ageGroup: event.target.value as PersonFact['ageGroup'] });
        }}
      >
        {AGE_GROUPS.map((age) => (
          <option key={age} value={age}>
            {AGE_LABELS[age]}
          </option>
        ))}
      </select>
      <fieldset>
        <legend className="label">Health</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {HEALTH_CONDITIONS.map((condition) => (
            <label key={condition} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={draft.conditions.includes(condition)}
                onChange={() => {
                  toggle(condition);
                }}
              />
              {CONDITION_LABELS[condition]}
            </label>
          ))}
        </div>
      </fieldset>
      <Actions onCancel={onCancel} />
    </form>
  );
}

/** Usual time and length of a routine. */
function RoutineEditor({ fact, onSave, onCancel }: EditorProps<RoutineFact>): React.JSX.Element {
  const [time, setTime] = useState(fact.time ?? '');
  const [minutes, setMinutes] = useState(String(fact.minutes));
  const save = (event: React.SubmitEvent): void => {
    event.preventDefault();
    onSave({
      ...fact,
      time: time === '' ? null : time,
      minutes: Math.min(240, Math.max(5, Number(minutes) || fact.minutes)),
    });
  };
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={save}>
      <div>
        <label className="label" htmlFor={`${fact.id}-time`}>
          Usual time
        </label>
        <input
          id={`${fact.id}-time`}
          type="time"
          className="field"
          value={time}
          onChange={(event) => {
            setTime(event.target.value);
          }}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${fact.id}-minutes`}>
          Minutes
        </label>
        <input
          id={`${fact.id}-minutes`}
          type="number"
          min={5}
          max={240}
          className="field w-24"
          value={minutes}
          onChange={(event) => {
            setMinutes(event.target.value);
          }}
        />
      </div>
      <Actions onCancel={onCancel} />
    </form>
  );
}

/** The editor for a fact; home features have nothing to edit, only forget. */
export function FactEditor({
  fact,
  onSave,
  onCancel,
}: EditorProps<MemoryFact>): React.JSX.Element | null {
  if (fact.kind === 'person')
    return <PersonEditor fact={fact} onSave={onSave} onCancel={onCancel} />;
  if (fact.kind === 'routine')
    return <RoutineEditor fact={fact} onSave={onSave} onCancel={onCancel} />;
  return null;
}
