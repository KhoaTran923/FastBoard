import { useSearchStore } from '../stores/searchStore';

export function SearchBar() {
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);

  return (
    <div className="relative w-full max-w-md">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-medium-grey"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tasks…"
        aria-label="Search tasks"
        className="h-10 w-full rounded-md border border-medium-grey/25 bg-light-grey pl-10 pr-9 text-sm text-black placeholder:text-medium-grey focus:border-purple focus:outline-none dark:bg-very-dark dark:text-white"
      />

      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-medium-grey hover:text-red"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
