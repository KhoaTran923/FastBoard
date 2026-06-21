import type { ReactNode } from 'react';
import { Logo } from './Logo';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-light-grey px-4 dark:bg-very-dark">
      <div className="w-full max-w-115 rounded-lg bg-white p-8 shadow-sm dark:bg-dark-grey sm:p-10">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-2xl font-bold text-black dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-medium-grey">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center justify-center">
      <span className="text-xs font-bold text-medium-grey">OR</span>
    </div>
  );
}
