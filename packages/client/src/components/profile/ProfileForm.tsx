import {
  defaultMember,
  PROFILE_LIMITS,
  profileSchema,
  type HouseholdProfile,
  type Member,
} from '@vayu/core';
import { useCallback, useState } from 'react';
import type { EditableProfile } from '../../state/session.js';
import { Alert } from '../ui/Alert.js';
import { HomeFields } from './HomeFields.js';
import { LifestyleFields } from './LifestyleFields.js';
import { MemberFields } from './MemberFields.js';
import { PlaceSearch } from './PlaceSearch.js';

/** "person 2 › commuteKm" from a schema path, counting people from one. */
const pathWords = (path: readonly PropertyKey[]): string =>
  path
    .map((part) => (typeof part === 'number' ? String(part + 1) : String(part)))
    .join(' › ')
    .replace('members ›', 'person');

/** The one problem to fix first, in words a family understands. */
export function firstProblem(editing: EditableProfile): string | null {
  if (editing.place === null) {
    return 'Choose where you live so we can load your forecast.';
  }
  const parsed = profileSchema.safeParse(editing);
  if (parsed.success) {
    return null;
  }
  return parsed.error.issues
    .slice(0, 1)
    .map((issue) => `Please check ${pathWords(issue.path)}: ${issue.message}`)
    .join('');
}

interface MembersSectionProps {
  readonly members: readonly Member[];
  readonly assumed: ReadonlySet<string>;
  readonly onChange: (members: readonly Member[]) => void;
}

/** Everyone in the household, with add and remove. */
function MembersSection({ members, assumed, onChange }: MembersSectionProps): React.JSX.Element {
  return (
    <section className="card space-y-4" aria-labelledby="members-heading">
      <h2 id="members-heading" className="text-lg font-semibold">
        Who lives with you
      </h2>
      {members.map((member, index) => (
        <MemberFields
          key={index}
          member={member}
          position={index}
          isAssumed={(field) => assumed.has(`members.${String(index)}.${field}`)}
          onChange={(changed) => {
            onChange(members.map((current, position) => (position === index ? changed : current)));
          }}
          onRemove={
            members.length > 1
              ? () => {
                  onChange(members.filter((_member, position) => position !== index));
                }
              : undefined
          }
        />
      ))}
      {members.length < PROFILE_LIMITS.maxMembers ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            onChange([...members, defaultMember('adult', members.length)]);
          }}
        >
          Add a person
        </button>
      ) : null}
    </section>
  );
}

interface ProfileFormProps {
  readonly initial: EditableProfile;
  readonly onConfirm: (profile: HouseholdProfile) => void;
}

/**
 * The review step. Whatever the AI read is shown as an ordinary form, with
 * every guessed answer flagged, so nothing reaches the engine unchecked.
 */
export function ProfileForm({ initial, onConfirm }: ProfileFormProps): React.JSX.Element {
  const [editing, setEditing] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const assumed = new Set(editing.assumed);
  const choosePlace = useCallback((place: EditableProfile['place']) => {
    setEditing((current) => ({ ...current, place }));
  }, []);
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setProblem(firstProblem(editing));
        const parsed = profileSchema.safeParse(editing);
        if (parsed.success) onConfirm(parsed.data);
      }}
    >
      <section className="card">
        <PlaceSearch
          initialQuery={editing.placeQuery}
          place={editing.place}
          onChoose={choosePlace}
        />
      </section>
      <MembersSection
        members={editing.members}
        assumed={assumed}
        onChange={(members) => {
          setEditing({ ...editing, members });
        }}
      />
      <section className="card">
        <HomeFields
          home={editing.home}
          isAssumed={(field) => assumed.has(`home.${field}`)}
          onChange={(home) => {
            setEditing({ ...editing, home });
          }}
        />
      </section>
      <section className="card">
        <LifestyleFields
          lifestyle={editing.lifestyle}
          isAssumed={(field) => assumed.has(`lifestyle.${field}`)}
          onChange={(lifestyle) => {
            setEditing({ ...editing, lifestyle });
          }}
        />
      </section>
      {problem === null ? null : <Alert>{problem}</Alert>}
      <button type="submit" className="btn-primary">
        See today’s plan
      </button>
    </form>
  );
}
