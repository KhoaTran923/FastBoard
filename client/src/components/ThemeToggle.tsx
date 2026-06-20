import { useThemeStore } from '../stores/themeStore';

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center justify-center gap-5 rounded-md bg-light-grey py-3 dark:bg-very-dark">
      {/* sun */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#828FA3"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>

      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        onClick={toggle}
        className="relative h-5 w-10 rounded-full bg-purple transition-colors hover:bg-purple-hover"
      >
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white transition-all ${
            isDark ? 'left-[22px]' : 'left-1'
          }`}
        />
      </button>

      {/* moon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#828FA3" aria-hidden>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    </div>
  );
}
