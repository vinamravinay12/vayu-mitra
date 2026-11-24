import {
  AGE_GROUPS,
  AGE_LABELS,
  CONDITION_LABELS,
  HEALTH_CONDITIONS,
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
      <button type="submit" className="btn-primary py-1 text-sm">
        Save
      </button>
      <button type="button" className="btn-secondary py-1 text-sm" onClick={onCancel}>
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
      minutes: Number(minutes) || fact.minutes,
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

/** A fact that can be edited; home features can only be forgotten. */
export type EditableFact = PersonFact | RoutineFact;

/** The editor for a person or a routine. */
export function FactEditor({
  fact,
  onSave,
  onCancel,
}: EditorProps<EditableFact>): React.JSX.Element {
  return fact.kind === 'person' ? (
    <PersonEditor fact={fact} onSave={onSave} onCancel={onCancel} />
  ) : (
    <RoutineEditor fact={fact} onSave={onSave} onCancel={onCancel} />
  );
}
