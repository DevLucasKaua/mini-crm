import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="seg" role="group" aria-label="Tema">
      <button
        type="button"
        className={theme === 'light' ? 'active' : undefined}
        onClick={() => setTheme('light')}
        aria-label="Tema claro"
        title="Tema claro"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
        </svg>
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'active' : undefined}
        onClick={() => setTheme('dark')}
        aria-label="Modo noturno"
        title="Modo noturno"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M19.5 14A8 8 0 0 1 10 4.5 8 8 0 1 0 19.5 14Z" />
        </svg>
      </button>
    </div>
  );
}
