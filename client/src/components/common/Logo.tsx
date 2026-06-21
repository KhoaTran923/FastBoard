export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg width="24" height="25" viewBox="0 0 24 25" fill="none" className={className} aria-hidden>
      <rect width="6" height="25" rx="2" fill="#635FC7" />
      <rect x="9" width="6" height="25" rx="2" fill="#635FC7" fillOpacity="0.75" />
      <rect x="18" width="6" height="25" rx="2" fill="#635FC7" fillOpacity="0.5" />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark />
      <span className="text-2xl font-extrabold tracking-tight text-black dark:text-white">
        FastBoard
      </span>
    </div>
  );
}
