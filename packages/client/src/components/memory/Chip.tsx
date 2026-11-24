import type { MemoryChip } from '@vayu/core';
import { FactEditor } from './FactEditor.js';

interface ChipProps {
  readonly chip: MemoryChip;
  readonly editing: boolean;
  readonly onEdit: (editing: boolean) => void;
  readonly onForget: () => void;
  readonly onSave: (fact: MemoryChip['fact']) => void;
}

/** Edit (not for home features) and Forget, each naming the chip it acts on. */
function ChipButtons({ chip, onEdit, onForget }: ChipProps): React.JSX.Element {
  const small = 'btn-secondary px-3 py-1 text-sm';
  return (
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
  );
}

/** One remembered fact, its buttons, and its editor while open. */
export function Chip(props: ChipProps): React.JSX.Element {
  const { chip, editing, onEdit, onSave } = props;
  return (
    <li className="rounded-lg border border-line p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{chip.label}</span>
        <ChipButtons {...props} />
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
