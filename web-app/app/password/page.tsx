'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export default function PasswordPage() {
  return (
    <Suspense fallback={<PasswordShell />}>
      <PasswordForm />
    </Suspense>
  );
}

function PasswordShell() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#FAF8F0' }}
    />
  );
}

function PasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const next = searchParams.get('next') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/site-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(next);
        router.refresh();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#FAF8F0' }}
    >
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            style={{
              fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#1C1917',
            }}
          >
            Ficto<span style={{ color: '#D4A017' }}>tum</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="password"
              style={{
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                fontSize: '9px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#A09880',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Enter password to continue
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #D6D0C4',
                borderRadius: '3px',
                background: '#FAF8F0',
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                fontSize: '14px',
                color: '#1C1917',
                outline: 'none',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#B8860B'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D6D0C4'}
            />
          </div>

          {error && (
            <p
              style={{
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                fontSize: '11px',
                color: '#EF4444',
                marginBottom: '12px',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1C1917',
              color: '#FAF8F0',
              border: 'none',
              borderRadius: '3px',
              fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading || !password ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
