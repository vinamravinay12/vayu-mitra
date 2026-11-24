import { useState } from 'react';

/** The second step: delete for good, or keep the data. */
function ConfirmDelete({
  onDelete,
  onKeep,
}: {
  readonly onDelete: () => void;
  readonly onKeep: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Confirm deletion">
      <button type="button" className="btn-primary bg-danger-fg" onClick={onDelete}>
        Yes, delete everything
      </button>
      <button type="button" className="btn-secondary" onClick={onKeep}>
        Keep my data
      </button>
    </div>
  );
}

/** Delete my data, then a confirmation before anything is deleted. */
function DeleteControl({ onDelete }: { readonly onDelete: () => void }): React.JSX.Element {
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <ConfirmDelete
      onDelete={onDelete}
      onKeep={() => {
        setConfirming(false);
      }}
    />
  ) : (
    <button
      type="button"
      className="btn-secondary"
      onClick={() => {
        setConfirming(true);
      }}
    >
      Delete my data
    </button>
  );
}

/** What is kept, and a two-step delete of all of it. */
export function PrivacyPanel({ onDelete }: { readonly onDelete: () => void }): React.JSX.Element {
  return (
    <section className="card space-y-3" aria-labelledby="privacy-heading">
      <h2 id="privacy-heading" className="text-lg font-bold">
        Your data
      </h2>
      <p className="text-sm text-ink-soft">
        Kept: what I remember, your place and your alert settings. Not kept: the conversation
        itself, which stays in this tab.
      </p>
      <DeleteControl onDelete={onDelete} />
    </section>
  );
}
