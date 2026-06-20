import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';
type ButtonSize = 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/60';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-purple text-white hover:bg-purple-hover',
  secondary:
    'bg-purple/10 text-purple hover:bg-purple/25 dark:bg-white dark:text-purple dark:hover:bg-white/90',
  destructive: 'bg-red text-white hover:bg-red-hover',
};

const buttonSizes: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-[13px]',
  lg: 'h-12 px-6 text-[15px]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className = '', ...props }: InputProps) {
  return (
    <input
      className={`h-10 w-full rounded-md border bg-transparent px-4 text-[13px] text-black placeholder:text-black/35 focus:outline-none dark:text-white dark:placeholder:text-white/30 ${
        invalid ? 'border-red focus:border-red' : 'border-medium-grey/25 focus:border-purple'
      } ${className}`}
      {...props}
    />
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-medium-grey">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red">{error}</span>}
    </label>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
