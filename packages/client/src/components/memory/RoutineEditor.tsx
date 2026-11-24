/** Editing a routine: its usual time and length. */
import type { RoutineFact } from '@vayu/core';
import { useState } from 'react';
import { EditorActions, type EditorProps } from './EditorActions.js';

/** One labelled input of the routine editor; the attributes go to the input. */
function Field({
  label,
  onValue,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  readonly id: string;
  readonly label: string;
  readonly onValue: (value: string) => void;
}): React.JSX.Element {
  return (
    <div>
      <label className="label" htmlFor={input.id}>
        {label}
      </label>
      <input
        {...input}
        onChange={(event) => {
          onValue(event.target.value);
        }}
      />
    </div>
  );
}

/** The time and minutes being edited, and saving them: a blank time means none, a bad length keeps the old. */
function useRoutineDraft(fact: RoutineFact, onSave: (fact: RoutineFact) => void) {
  const [time, setTime] = useState(fact.time ?? '');
  const [minutes, setMinutes] = useState(String(fact.minutes));
  const save = (event: React.SubmitEvent): void => {
    event.preventDefault();
    onSave({ ...fact, time: time === '' ? null : time, minutes: Number(minutes) || fact.minutes });
  };
  return { time, setTime, minutes, setMinutes, save };
}

/** Usual time and length of a routine. */
export function RoutineEditor({
  fact,
  onSave,
  onCancel,
}: EditorProps<RoutineFact>): React.JSX.Element {
  const { time, setTime, minutes, setMinutes, save } = useRoutineDraft(fact, onSave);
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={save}>
      <Field
        id={`${fact.id}-time`}
        label="Usual time"
        type="time"
        className="field"
        value={time}
        onValue={setTime}
      />
      <Field
        id={`${fact.id}-minutes`}
        label="Minutes"
        type="number"
        min={5}
        max={240}
        className="field w-24"
        value={minutes}
        onValue={setMinutes}
      />
      <EditorActions onCancel={onCancel} />
    </form>
  );
}
