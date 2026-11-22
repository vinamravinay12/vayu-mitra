import { forgetFact, memoryChips, saveFact, type Memory, type MemoryChip } from '@vayu/core';
import { useState } from 'react';
import { FactEditor } from './FactEditor.js';

interface ChipProps {
  readonly chip: MemoryChip;
  readonly editing: boolean;
  readonly onEdit: (editing: boolean) => void;
  readonly onForget: () => void;
  readonly onSave: (fact: MemoryChip['fact']) => void;
}

/** One remembered fact, with Edit (not for home features) and Forget. */
function Chip({ chip, editing, onEdit, onForget, onSave }: ChipProps): React.JSX.Element {
  const small = 'btn-secondary min-h-8 px-2 py-0.5 text-xs';
  return (
    <li className="rounded-lg border border-line p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{chip.label}</span>
        <span className="flex gap-1">
          {chip.fact.kind !== 'home' && (
            <button
              type="button"
              className={small}
              aria-label={`Edit ${chip.label}`}
              onClick={() => {
                onEdit(true);
              }}
            >
              Edit
            </button>
          )}
          <button
            type="button"
            className={small}
            aria-label={`Forget ${chip.label}`}
            onClick={onForget}
          >
            Forget
          </button>
        </span>
      </div>
      {editing && chip.fact.kind !== 'home' && (
        <div className="mt-2">
          <FactEditor
            fact={chip.fact}
            onCancel={() => {
              onEdit(false);
            }}
            onSave={(fact) => {
              onEdit(false);
              onSave(fact);
            }}
          />
        </div>
      )}
    </li>
  );
}

/**
 * What Vayu Mitra has learnt from the conversation, as chips. Nothing is
 * remembered silently: every fact shows here, and each can be corrected or
 * forgotten in one tap.
 */
export function MemoryPanel({
  memory,
  onChange,
}: {
  readonly memory: Memory;
  readonly onChange: (memory: Memory) => void;
}): React.JSX.Element {
  const [editing, setEditing] = useState<string | null>(null);
  const chips = memoryChips(memory);
  return (
    <section className="card space-y-3" aria-labelledby="memory-heading">
      <h2 id="memory-heading" className="text-lg font-bold">
        What I remember
      </h2>
      {chips.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing yet. Mention who is at home, their health and routines, and it will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {chips.map((chip) => (
            <Chip
              key={chip.id}
              chip={chip}
              editing={editing === chip.id}
              onEdit={(open) => {
                setEditing(open ? chip.id : null);
              }}
              onForget={() => {
                onChange(forgetFact(memory, chip.id));
              }}
              onSave={(fact) => {
                onChange(saveFact(memory, fact));
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
