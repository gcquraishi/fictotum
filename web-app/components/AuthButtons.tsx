// file: web-app/components/AuthButtons.tsx
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="w-24 h-8 bg-white/50 border border-brand-primary/20 rounded animate-pulse" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-brand-text/70">
            <UserIcon className="w-4 h-4" />
            <span>{session.user?.name || session.user?.email}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="px-3 py-1.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-md flex items-center gap-2 transition-colors shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => signIn('google')}
        className="px-3 py-1.5 text-sm font-semibold text-white bg-brand-accent hover:bg-brand-accent/90 rounded-md flex items-center gap-2 transition-colors shadow-sm"
      >
        <LogIn className="w-4 h-4" />
        Google
      </button>
      <button
        onClick={() => signIn('github')}
        className="px-3 py-1.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-md flex items-center gap-2 transition-colors shadow-sm"
      >
        <LogIn className="w-4 h-4" />
        GitHub
      </button>
    </div>
  );
}
