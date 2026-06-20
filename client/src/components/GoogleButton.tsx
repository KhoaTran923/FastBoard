/**
 * Placeholder for Google OAuth — the design includes it, but social sign-in
 * isn't part of the Week 2/3 backend yet, so it's rendered disabled.
 */
export function GoogleButton() {
  return (
    <button
      type="button"
      disabled
      title="Google sign-in is coming in a later milestone"
      className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-medium-grey/30 text-sm font-bold text-black/70 disabled:cursor-not-allowed dark:text-white/70"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.3-.1-2.4-.4-3.5Z"
        />
        <path
          fill="#FF3D00"
          d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7Z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 36.5 44 31 44 24c0-1.3-.1-2.4-.4-3.5Z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
