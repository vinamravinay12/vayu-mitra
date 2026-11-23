import type { ThemePreference } from '../../state/use-theme.js';
import { ThemeToggle } from './ThemeToggle.js';

interface HeaderProps {
  readonly theme: ThemePreference;
  readonly onThemeChange: (preference: ThemePreference) => void;
  /** Shown only when someone is signed in with Google. */
  readonly onSignOut: (() => void) | null;
}

/** Brand, theme choice and sign-out. */
export function Header({ theme, onThemeChange, onSignOut }: HeaderProps): React.JSX.Element {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <a href="/" className="flex items-center gap-2 text-lg font-bold text-brand">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          Vayu Mitra
          <span className="hidden text-sm font-normal text-muted sm:inline">clean-air coach</span>
        </a>
        <div className="flex flex-wrap items-center gap-2">
          {onSignOut !== null && (
            <button
              type="button"
              className="btn-secondary min-h-9 py-1 text-sm"
              onClick={onSignOut}
            >
              Sign out
            </button>
          )}
          <ThemeToggle preference={theme} onChange={onThemeChange} />
        </div>
      </div>
    </header>
  );
}
