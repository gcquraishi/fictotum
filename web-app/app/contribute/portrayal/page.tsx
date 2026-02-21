'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Suspense } from 'react';
import Link from 'next/link';
import InlineWorkCreator from '@/components/InlineWorkCreator';
import InlineFigureCreator from '@/components/InlineFigureCreator';

interface SelectedWork {
  media_id: string;
  title: string;
  media_type?: string;
  release_year?: number;
}

interface SelectedFigure {
  canonical_id: string;
  name: string;
  birth_year?: number;
  death_year?: number;
}

interface SearchResult {
  id: string;
  name: string;
  type: 'figure' | 'media';
  subtitle?: string;
}

const SENTIMENT_OPTIONS = [
  'Heroic', 'Villainous', 'Complex', 'Neutral', 'Tragic', 'Sympathetic', 'Critical', 'Satirical',
];

function PortrayalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedWork, setSelectedWork] = useState<SelectedWork | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<SelectedFigure | null>(null);

  // Step 1: Work search
  const [workQuery, setWorkQuery] = useState('');
  const [workResults, setWorkResults] = useState<SearchResult[]>([]);
  const [workSearching, setWorkSearching] = useState(false);
  const [showWorkCreator, setShowWorkCreator] = useState(false);

  // Step 2: Figure search
  const [figureQuery, setFigureQuery] = useState('');
  const [figureResults, setFigureResults] = useState<SearchResult[]>([]);
  const [figureSearching, setFigureSearching] = useState(false);
  const [showFigureCreator, setShowFigureCreator] = useState(false);

  // Step 3: Portrayal details
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>([]);
  const [actorName, setActorName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill from query params
  useEffect(() => {
    const workParam = searchParams.get('work');
    const figureParam = searchParams.get('figure');

    if (workParam) {
      // Fetch work details and pre-fill
      fetch(`/api/search/universal?q=${encodeURIComponent(workParam)}&type=media`)
        .then(r => r.json())
        .then(data => {
          const results = data.results || data;
          if (Array.isArray(results) && results.length > 0) {
            const work = results[0];
            setSelectedWork({
              media_id: work.id || work.media_id,
              title: work.name || work.title,
              media_type: work.media_type,
              release_year: work.release_year,
            });
            setStep(2);
          }
        })
        .catch(() => {});
    }

    if (figureParam) {
      fetch(`/api/search/universal?q=${encodeURIComponent(figureParam)}&type=figure`)
        .then(r => r.json())
        .then(data => {
          const results = data.results || data;
          if (Array.isArray(results) && results.length > 0) {
            const fig = results[0];
            setSelectedFigure({
              canonical_id: fig.id || fig.canonical_id,
              name: fig.name,
            });
            if (selectedWork) setStep(3);
          }
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced work search
  const searchWorks = useCallback(async (query: string) => {
    if (query.length < 2) {
      setWorkResults([]);
      return;
    }
    setWorkSearching(true);
    try {
      const response = await fetch(`/api/search/universal?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      const results = (data.results || data || [])
        .filter((r: any) => r.type === 'media' || r.type === 'work')
        .map((r: any) => ({
          id: r.id || r.media_id,
          name: r.label || r.name || r.title,
          type: 'media' as const,
          subtitle: r.meta || [r.media_type, r.release_year].filter(Boolean).join(' · '),
        }));
      setWorkResults(results);
    } catch {
      setWorkResults([]);
    } finally {
      setWorkSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchWorks(workQuery), 400);
    return () => clearTimeout(timer);
  }, [workQuery, searchWorks]);

  // Debounced figure search
  const searchFigures = useCallback(async (query: string) => {
    if (query.length < 2) {
      setFigureResults([]);
      return;
    }
    setFigureSearching(true);
    try {
      const response = await fetch(`/api/search/universal?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      const results = (data.results || data || [])
        .filter((r: any) => r.type === 'figure')
        .map((r: any) => ({
          id: r.id || r.canonical_id,
          name: r.label || r.name,
          type: 'figure' as const,
          subtitle: r.meta || [r.era, r.birth_year && r.death_year ? `${r.birth_year}–${r.death_year}` : null].filter(Boolean).join(' · '),
        }));
      setFigureResults(results);
    } catch {
      setFigureResults([]);
    } finally {
      setFigureSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchFigures(figureQuery), 400);
    return () => clearTimeout(timer);
  }, [figureQuery, searchFigures]);

  const toggleSentiment = (sentiment: string) => {
    setSelectedSentiments(prev =>
      prev.includes(sentiment)
        ? prev.filter(s => s !== sentiment)
        : prev.length < 5 ? [...prev, sentiment] : prev
    );
  };

  const handleSubmitPortrayal = async () => {
    if (!selectedWork || !selectedFigure || selectedSentiments.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contribution/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figureId: selectedFigure.canonical_id,
          mediaId: selectedWork.media_id,
          sentimentTags: selectedSentiments,
          actorName: actorName.trim() || undefined,
          roleDescription: roleDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create portrayal');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create portrayal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
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
              marginBottom: '8px',
            }}
          >
            Portrayal Added
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '16px',
              color: 'var(--color-gray)',
              fontStyle: 'italic',
              marginBottom: '32px',
            }}
          >
            {selectedFigure!.name} in {selectedWork!.title}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link
              href={`/figure/${selectedFigure!.canonical_id}`}
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
              View Figure
            </Link>
            <Link
              href={`/media/${selectedWork!.media_id}`}
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
            <button
              onClick={() => {
                setSelectedWork(null);
                setSelectedFigure(null);
                setSelectedSentiments([]);
                setActorName('');
                setRoleDescription('');
                setSuccess(false);
                setStep(1);
              }}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'var(--color-text)',
                color: 'var(--color-bg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
              }}
            >
              Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 40px' }}>
        {/* Header */}
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
            marginBottom: '8px',
          }}
        >
          Add a Portrayal
        </h1>

        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '3px',
                background: s <= step ? 'var(--color-text)' : 'var(--color-border)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

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

        {/* ====== STEP 1: Select Work ====== */}
        {step === 1 && (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-gray)',
                marginBottom: '12px',
              }}
            >
              Step 1 — Select a Media Work
            </div>

            <input
              type="text"
              value={workQuery}
              onChange={(e) => setWorkQuery(e.target.value)}
              placeholder="Search for a film, book, TV series..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                marginBottom: '8px',
              }}
            />

            {workSearching && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', padding: '8px 0' }}>
                Searching...
              </div>
            )}

            {workResults.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', marginBottom: '16px' }}>
                {workResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedWork({ media_id: r.id, title: r.name, media_type: r.subtitle?.split(' · ')[0] });
                      setStep(2);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    className="hover:bg-[var(--color-section-bg)] transition-colors"
                  >
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}>{r.name}</span>
                    {r.subtitle && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase' }}>
                        {r.subtitle}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {workQuery.length >= 2 && !workSearching && workResults.length === 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', padding: '8px 0' }}>
                No works found matching &ldquo;{workQuery}&rdquo;
              </div>
            )}

            {!showWorkCreator ? (
              <button
                onClick={() => setShowWorkCreator(true)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--color-accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 0',
                }}
              >
                Can&apos;t find it? Add a new work &rarr;
              </button>
            ) : (
              <InlineWorkCreator
                defaultTitle={workQuery}
                onCreated={(work) => {
                  setSelectedWork(work);
                  setShowWorkCreator(false);
                  setStep(2);
                }}
                onCancel={() => setShowWorkCreator(false)}
              />
            )}
          </div>
        )}

        {/* ====== STEP 2: Select Figure ====== */}
        {step === 2 && (
          <div>
            {/* Selected work summary */}
            <div
              style={{
                padding: '12px 16px',
                border: '1px solid var(--color-border)',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-gray)', marginBottom: '2px' }}>
                  Work
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}>
                  {selectedWork?.title}
                  {selectedWork?.media_type && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', marginLeft: '8px', textTransform: 'uppercase' }}>
                      {selectedWork.media_type}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setStep(1); setSelectedWork(null); }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
              >
                Change
              </button>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-gray)',
                marginBottom: '12px',
              }}
            >
              Step 2 — Select a Historical Figure
            </div>

            <input
              type="text"
              value={figureQuery}
              onChange={(e) => setFigureQuery(e.target.value)}
              placeholder="Search for a historical figure..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                marginBottom: '8px',
              }}
            />

            {figureSearching && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', padding: '8px 0' }}>
                Searching...
              </div>
            )}

            {figureResults.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', marginBottom: '16px' }}>
                {figureResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedFigure({ canonical_id: r.id, name: r.name });
                      setStep(3);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    className="hover:bg-[var(--color-section-bg)] transition-colors"
                  >
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}>{r.name}</span>
                    {r.subtitle && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase' }}>
                        {r.subtitle}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {figureQuery.length >= 2 && !figureSearching && figureResults.length === 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', padding: '8px 0' }}>
                No figures found matching &ldquo;{figureQuery}&rdquo;
              </div>
            )}

            {!showFigureCreator ? (
              <button
                onClick={() => setShowFigureCreator(true)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--color-accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 0',
                }}
              >
                Not in our database? Add a new figure &rarr;
              </button>
            ) : (
              <InlineFigureCreator
                defaultName={figureQuery}
                onCreated={(figure) => {
                  setSelectedFigure(figure);
                  setShowFigureCreator(false);
                  setStep(3);
                }}
                onCancel={() => setShowFigureCreator(false)}
              />
            )}
          </div>
        )}

        {/* ====== STEP 3: Portrayal Details ====== */}
        {step === 3 && (
          <div>
            {/* Selected work + figure summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div
                style={{
                  padding: '12px 16px',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-gray)', marginBottom: '2px' }}>Work</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}>{selectedWork?.title}</div>
                </div>
                <button
                  onClick={() => { setStep(1); setSelectedWork(null); setSelectedFigure(null); }}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  Change
                </button>
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-gray)', marginBottom: '2px' }}>Figure</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}>{selectedFigure?.name}</div>
                </div>
                <button
                  onClick={() => { setStep(2); setSelectedFigure(null); }}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  Change
                </button>
              </div>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-gray)',
                marginBottom: '16px',
              }}
            >
              Step 3 — Describe the Portrayal
            </div>

            {/* Sentiment tags */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--color-gray)',
                  marginBottom: '8px',
                }}
              >
                How is {selectedFigure?.name} portrayed? (select 1-5) *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SENTIMENT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSentiment(s)}
                    style={{
                      padding: '6px 14px',
                      border: '1px solid var(--color-border)',
                      background: selectedSentiments.includes(s) ? 'var(--color-text)' : 'var(--color-bg)',
                      color: selectedSentiments.includes(s) ? 'var(--color-bg)' : 'var(--color-text)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Actor name */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--color-gray)',
                  marginBottom: '4px',
                }}
              >
                Actor / Voice Actor
              </label>
              <input
                type="text"
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                placeholder="e.g. Cillian Murphy"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Role description */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--color-gray)',
                  marginBottom: '4px',
                }}
              >
                Role Description
              </label>
              <textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Brief description of how the figure is portrayed..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Auth check */}
            {!session && authStatus !== 'loading' && (
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: '#92400e',
                  }}
                >
                  Sign in required to submit a portrayal.
                </span>
                <Link
                  href="/api/auth/signin"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#92400e',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmitPortrayal}
              disabled={isSubmitting || selectedSentiments.length === 0 || !session}
              style={{
                width: '100%',
                padding: '14px',
                border: 'none',
                background: isSubmitting || selectedSentiments.length === 0 || !session ? 'var(--color-gray)' : 'var(--color-text)',
                color: 'var(--color-bg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: isSubmitting || selectedSentiments.length === 0 || !session ? 'default' : 'pointer',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Add Portrayal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortrayalPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
          Loading...
        </span>
      </div>
    }>
      <PortrayalContent />
    </Suspense>
  );
}
