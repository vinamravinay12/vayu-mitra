import { forgetFact, memoryChips, saveFact, type Memory } from '@vayu/core';
import { useState } from 'react';
import { Chip } from './Chip.js';

/** The chips, with at most one editor open at a time. */
function ChipList({
  memory,
  onChange,
}: {
  readonly memory: Memory;
  readonly onChange: (memory: Memory) => void;
}): React.JSX.Element {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {memoryChips(memory).map((chip) => (
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
  return (
    <section className="card space-y-3" aria-labelledby="memory-heading">
      <h2 id="memory-heading" className="text-lg font-bold">
        What I remember
      </h2>
      {memoryChips(memory).length === 0 ? (
        <p className="text-sm text-muted">
          Nothing yet. Mention who is at home, their health and routines, and it will appear here.
        </p>
      ) : (
        <ChipList memory={memory} onChange={onChange} />
      )}
    </section>
  );
}
