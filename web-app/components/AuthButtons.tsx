// file: web-app/components/AuthButtons.tsx
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

export default function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div style={{ width: '80px', height: '28px', background: 'var(--color-section-bg)', border: '1px solid var(--color-border)' }} />;
  }

  if (session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          href="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-gray)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          <UserIcon size={14} />
          {session.user?.name?.split(' ')[0] || 'Profile'}
        </Link>
        <button
          onClick={() => signOut()}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            background: 'none',
            border: '1px solid var(--color-border)',
            padding: '4px 10px',
            cursor: 'pointer',
            color: 'var(--color-gray)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    );
  }

  // Use generic signIn() which routes to Auth.js built-in page
  // that only lists configured providers. Safe when env vars are missing.
  return (
    <button
      onClick={() => signIn()}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        background: 'none',
        border: '1px solid var(--color-border)',
        padding: '4px 10px',
        cursor: 'pointer',
        color: 'var(--color-text)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <LogIn size={12} />
      Sign In
    </button>
  );
}
