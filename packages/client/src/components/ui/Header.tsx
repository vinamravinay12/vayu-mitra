import type { ThemePreference } from '../../state/use-theme.js';
import { ThemeToggle } from './ThemeToggle.js';

interface HeaderProps {
  readonly theme: ThemePreference;
  readonly onThemeChange: (preference: ThemePreference) => void;
  /** Clears the saved plan and returns to the start. */
  readonly onStartOver: () => void;
}

/** Brand link home, Start over and the theme choice. */
export function Header({ theme, onThemeChange, onStartOver }: HeaderProps): React.JSX.Element {
  return (
    <header className="no-print border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* A real link, so it works without JavaScript; a plain click clears the plan in-app. */}
        <a
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-brand"
          onClick={(event) => {
            if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
              event.preventDefault();
              onStartOver();
            }
          }}
        >
          <img src="/favicon.svg" alt="" width="28" height="28" />
          Vayu Mitra
          <span className="hidden text-sm font-normal text-muted sm:inline">clean-air coach</span>
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary min-h-9 py-1 text-sm"
            onClick={onStartOver}
          >
            Start over
          </button>
          <ThemeToggle preference={theme} onChange={onThemeChange} />
        </div>
      </div>
    </header>
  );
}
