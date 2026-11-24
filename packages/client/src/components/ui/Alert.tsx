/** An announced message: an error that interrupts, or a status that waits. */

interface AlertProps {
  readonly children: React.ReactNode;
  /** `error` interrupts a screen reader; `status` waits politely. */
  readonly kind?: 'error' | 'status';
}

/** A message the page announces: errors at once, status updates when the reader is idle. */
export function Alert({ children, kind = 'error' }: AlertProps): React.JSX.Element {
  const tone = kind === 'error' ? 'bg-danger-bg text-danger-fg' : 'bg-info-bg text-info-fg';
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-4 py-3 text-sm font-medium ${tone}`}
    >
      {children}
    </p>
  );
}
