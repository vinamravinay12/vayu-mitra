/** Chooses the editor for a remembered fact: a person or a routine. */
import type { PersonFact, RoutineFact } from '@vayu/core';
import type { EditorProps } from './EditorActions.js';
import { PersonEditor } from './PersonEditor.js';
import { RoutineEditor } from './RoutineEditor.js';

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
