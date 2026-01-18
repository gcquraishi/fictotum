// file: web-app/components/AuthButtons.tsx
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="w-24 h-8 bg-gray-700 rounded animate-pulse" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-300">
            <UserIcon className="w-4 h-4" />
            <span>{session.user?.name || session.user?.email}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="px-3 py-1.5 text-sm font-semibold text-white bg-gray-700 hover:bg-red-600 rounded-md flex items-center gap-2 transition-colors"
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
        className="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-2 transition-colors"
      >
        <LogIn className="w-4 h-4" />
        Google
      </button>
      <button
        onClick={() => signIn('github')}
        className="px-3 py-1.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-2 transition-colors"
      >
        <LogIn className="w-4 h-4" />
        GitHub
      </button>
    </div>
  );
}
