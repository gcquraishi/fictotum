'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InlineFigureCreator from '@/components/InlineFigureCreator';

const MEDIA_TYPES = [
  'Film', 'Book', 'TV Series', 'Documentary', 'Play', 'Musical', 'Comic', 'Video Game', 'Podcast',
];

export default function AddWorkPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState('Film');
  const [releaseYear, setReleaseYear] = useState('');
  const [creator, setCreator] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdWork, setCreatedWork] = useState<{ media_id: string; title: string } | null>(null);

  // Creator search
  const [creatorQuery, setCreatorQuery] = useState('');
  const [creatorResults, setCreatorResults] = useState<Array<{ id: string; name: string }>>([]);
  const [creatorSearching, setCreatorSearching] = useState(false);
  const [showCreatorCreator, setShowCreatorCreator] = useState(false);

  const searchCreators = async (query: string) => {
    if (query.length < 2) {
      setCreatorResults([]);
      return;
    }
    setCreatorSearching(true);
    try {
      const response = await fetch(`/api/search/universal?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      const results = (data.results || data || [])
        .filter((r: any) => r.type === 'figure')
        .slice(0, 5)
        .map((r: any) => ({ id: r.id || r.canonical_id, name: r.name }));
      setCreatorResults(results);
    } catch {
      setCreatorResults([]);
    } finally {
      setCreatorSearching(false);
    }
  };

  const handleCreatorInput = (value: string) => {
    setCreatorQuery(value);
    setCreator(value);
    const timer = setTimeout(() => searchCreators(value), 400);
    return () => clearTimeout(timer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/media/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          mediaType,
          releaseYear: releaseYear ? parseInt(releaseYear) : undefined,
          creator: creator.trim() || undefined,
        }),
      });

      if (response.status === 409) {
        const data = await response.json();
        setCreatedWork({
          media_id: data.existing?.media_id || data.media_id,
          title: data.existing?.title || title.trim(),
        });
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create work');
      }

      const data = await response.json();
      setCreatedWork({ media_id: data.media_id, title: data.title || title.trim() });
    } catch (err: any) {
      setError(err.message || 'Failed to create work');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (createdWork) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-accent)',
              marginBottom: '16px',
            }}
          >
            Success
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '32px',
              fontWeight: 300,
              marginBottom: '24px',
            }}
          >
            {createdWork.title} Added
          </h2>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link
              href={`/media/${createdWork.media_id}`}
              style={{
                padding: '10px 20px',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textDecoration: 'none',
                color: 'var(--color-text)',
              }}
            >
              View Work
            </Link>
            <Link
              href={`/contribute/portrayal?work=${encodeURIComponent(createdWork.media_id)}`}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'var(--color-text)',
                color: 'var(--color-bg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textDecoration: 'none',
              }}
            >
              Add a Portrayal to This Work
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 40px' }}>
        <Link
          href="/contribute"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--color-gray)',
            textDecoration: 'none',
            display: 'block',
            marginBottom: '24px',
          }}
          className="hover:opacity-70 transition-opacity"
        >
          &larr; Contribute
        </Link>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '32px',
            fontWeight: 300,
            marginBottom: '32px',
          }}
        >
          Add a Work
        </h1>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '20px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#991b1b',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', marginBottom: '6px' }}>
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Oppenheimer"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', marginBottom: '6px' }}>
                  Media Type *
                </label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                  }}
                >
                  {MEDIA_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', marginBottom: '6px' }}>
                  Year
                </label>
                <input
                  type="number"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  placeholder="2023"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', marginBottom: '6px' }}>
                Creator / Director / Author
              </label>
              <input
                type="text"
                value={creatorQuery}
                onChange={(e) => handleCreatorInput(e.target.value)}
                placeholder="Search for a creator..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '16px',
                }}
              />

              {creatorSearching && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', padding: '4px 0' }}>
                  Searching...
                </div>
              )}

              {creatorResults.length > 0 && (
                <div style={{ border: '1px solid var(--color-border)', borderTop: 'none' }}>
                  {creatorResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setCreator(r.name);
                        setCreatorQuery(r.name);
                        setCreatorResults([]);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--color-bg)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '14px',
                      }}
                      className="hover:bg-[var(--color-section-bg)] transition-colors"
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}

              {!showCreatorCreator && creatorQuery.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setShowCreatorCreator(true)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--color-accent)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  Add as new figure &rarr;
                </button>
              )}

              {showCreatorCreator && (
                <div style={{ marginTop: '8px' }}>
                  <InlineFigureCreator
                    defaultName={creatorQuery}
                    onCreated={(figure) => {
                      setCreator(figure.name);
                      setCreatorQuery(figure.name);
                      setShowCreatorCreator(false);
                    }}
                    onCancel={() => setShowCreatorCreator(false)}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '32px',
              border: 'none',
              background: isSubmitting || !title.trim() ? 'var(--color-gray)' : 'var(--color-text)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              cursor: isSubmitting || !title.trim() ? 'default' : 'pointer',
            }}
          >
            {isSubmitting ? 'Creating...' : 'Add Work'}
          </button>
        </form>
      </div>
    </div>
  );
}
