/** What both fact editors take: the fact, and what to do on Save or Cancel. */
export interface EditorProps<F> {
  readonly fact: F;
  readonly onSave: (fact: F) => void;
  readonly onCancel: () => void;
}

/** Save and Cancel, shared by both editors. */
export function EditorActions({ onCancel }: { readonly onCancel: () => void }): React.JSX.Element {
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
