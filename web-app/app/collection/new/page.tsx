'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, BookMarked } from 'lucide-react';

export default function NewCollectionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('A name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Failed to create collection.');
        return;
      }
      router.push(`/collection/${data.collection.collection_id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Back link */}
        <Link
          href="/collection"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--color-gray)',
            textDecoration: 'none',
            marginBottom: '32px',
          }}
          className="hover:text-[var(--color-text)] transition-colors"
        >
          <ChevronLeft size={12} />
          Collections
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <BookMarked size={28} style={{ color: 'var(--color-accent)' }} />
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>
              New Collection
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '28px', color: 'var(--color-text)' }}>
              Create a curated path
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name field */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
                marginBottom: '8px',
              }}
            >
              Collection Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Women of the French Revolution"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                border: '1px solid var(--color-border)',
                background: '#fff',
                color: 'var(--color-text)',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-text)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', marginTop: '6px' }}>
              {name.length}/100
            </p>
          </div>

          {/* Description field */}
          <div style={{ marginBottom: '32px' }}>
            <label
              htmlFor="description"
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
                marginBottom: '8px',
              }}
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Describe what this collection explores..."
              style={{
                width: '100%',
                padding: '12px 16px',
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                border: '1px solid var(--color-border)',
                background: '#fff',
                color: 'var(--color-text)',
                outline: 'none',
                resize: 'vertical',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-text)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-accent)',
              marginBottom: '16px',
              padding: '10px 14px',
              border: '1px solid var(--color-accent)',
              background: 'rgba(139,38,53,0.05)',
            }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: name.trim() ? 'var(--color-text)' : 'var(--color-border)',
                color: name.trim() ? 'var(--color-bg)' : 'var(--color-gray)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                border: 'none',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.6 : 1,
                transition: 'background 0.15s ease',
              }}
            >
              {saving ? 'Creating...' : 'Create Collection'}
            </button>
            <Link
              href="/collection"
              style={{
                padding: '12px 24px',
                border: '1px solid var(--color-border)',
                color: 'var(--color-gray)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              className="hover:border-[var(--color-text)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
