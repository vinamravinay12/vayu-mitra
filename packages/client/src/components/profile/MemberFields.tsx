import { AGE_LABELS, CONDITION_LABELS, PROFILE_LIMITS, type Member } from '@vayu/core';
import { useId } from 'react';
import { COMMUTE_LABELS, DAYTIME_LABELS, EXERCISE_LABELS } from '../../lib/labels.js';
import { CheckboxGroup } from './CheckboxGroup.js';
import { HourField, NumberField, SelectField } from './fields.js';

/** Props every part of a member's fields shares. */
interface MemberPartProps {
  readonly member: Member;
  readonly isAssumed: (field: keyof Member) => boolean;
  readonly onChange: (member: Member) => void;
}

/** Name, age and health. */
function Identity({ member, isAssumed, onChange }: MemberPartProps): React.JSX.Element {
  const nameId = useId();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className="label">
            Name or role
          </label>
          <input
            id={nameId}
            className="field"
            value={member.name}
            maxLength={PROFILE_LIMITS.maxNameLength}
            onChange={(event) => {
              onChange({ ...member, name: event.target.value });
            }}
          />
        </div>
        <SelectField
          label="Age group"
          value={member.ageGroup}
          options={AGE_LABELS}
          assumed={isAssumed('ageGroup')}
          onChange={(ageGroup) => {
            onChange({ ...member, ageGroup });
          }}
        />
      </div>
      <CheckboxGroup
        legend="Health conditions"
        values={member.conditions}
        options={CONDITION_LABELS}
        onChange={(conditions) => {
          onChange({ ...member, conditions });
        }}
      />
    </>
  );
}

/** Where they spend the day and how they get there. */
function Daytime({ member, isAssumed, onChange }: MemberPartProps): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SelectField
        label="During the day"
        value={member.daytime}
        options={DAYTIME_LABELS}
        assumed={isAssumed('daytime')}
        onChange={(daytime) => {
          onChange({ ...member, daytime });
        }}
      />
      {member.daytime === 'home' ? null : (
        <>
          <SelectField
            label="Travels by"
            value={member.commuteMode}
            options={COMMUTE_LABELS}
            assumed={isAssumed('commuteMode')}
            onChange={(commuteMode) => {
              onChange({ ...member, commuteMode });
            }}
          />
          <NumberField
            label="One-way distance (km)"
            value={member.commuteKm}
            min={0}
            max={PROFILE_LIMITS.maxCommuteKm}
            assumed={isAssumed('commuteKm')}
            onChange={(commuteKm) => {
              onChange({ ...member, commuteKm });
            }}
          />
        </>
      )}
    </div>
  );
}

/** Outdoor exercise and when it usually happens. */
function Exercise({ member, isAssumed, onChange }: MemberPartProps): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SelectField
        label="Outdoor exercise"
        value={member.outdoorExercise}
        options={EXERCISE_LABELS}
        assumed={isAssumed('outdoorExercise')}
        onChange={(outdoorExercise) => {
          onChange({ ...member, outdoorExercise });
        }}
      />
      {member.outdoorExercise === 'none' ? null : (
        <HourField
          label="Usually at"
          value={member.exerciseHour}
          assumed={isAssumed('exerciseHour')}
          onChange={(exerciseHour) => {
            onChange({ ...member, exerciseHour });
          }}
        />
      )}
    </div>
  );
}

interface MemberFieldsProps extends MemberPartProps {
  readonly position: number;
  /** Absent for the last remaining member, who cannot be removed. */
  readonly onRemove: (() => void) | undefined;
}

/** One household member: who they are, where they spend the day, and how they exercise. */
export function MemberFields({
  position,
  onRemove,
  ...part
}: MemberFieldsProps): React.JSX.Element {
  const name = part.member.name.trim();
  return (
    <fieldset className="space-y-4 rounded-lg border border-line p-4">
      <legend className="px-1 font-semibold">Person {String(position + 1)}</legend>
      <Identity {...part} />
      <Daytime {...part} />
      <Exercise {...part} />
      {onRemove === undefined ? null : (
        <button type="button" className="btn-secondary text-sm" onClick={onRemove}>
          Remove {name === '' ? `person ${String(position + 1)}` : name}
        </button>
      )}
    </fieldset>
  );
}
