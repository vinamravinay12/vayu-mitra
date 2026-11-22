import { useState } from 'react';

/** What is kept, and a two-step delete of all of it. */
export function PrivacyPanel({ onDelete }: { readonly onDelete: () => void }): React.JSX.Element {
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="card space-y-3" aria-labelledby="privacy-heading">
      <h2 id="privacy-heading" className="text-lg font-bold">
        Your data
      </h2>
      <p className="text-sm text-ink-soft">
        Kept: what I remember, your place and your alert settings. Not kept: the conversation
        itself, which stays in this tab.
      </p>
      {confirming ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Confirm deletion">
          <button type="button" className="btn-primary bg-danger-fg" onClick={onDelete}>
            Yes, delete everything
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setConfirming(false);
            }}
          >
            Keep my data
          </button>
        </div>
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
      )}
    </section>
  );
}
