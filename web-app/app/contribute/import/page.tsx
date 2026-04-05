'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CreatorWorksView from '@/components/CreatorWorksView';
import type { BulkAddResults, WikidataMatch } from '@/types/contribute';

export default function ImportCreatorWorksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<WikidataMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<WikidataMatch | null>(null);
  const [importResults, setImportResults] = useState<BulkAddResults | null>(null);

  const searchCreators = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch('/api/wikidata/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'figure', searchQuery: query }),
      });
      const data = await response.json();
      // Filter for entities that look like creators (have works)
      const matches = (data.matches || data.results || []).filter(
        (m: WikidataMatch) => m.enrichedData?.isCreator || m.enrichedData?.worksCount
      );
      setResults(matches.length > 0 ? matches : (data.matches || data.results || []).slice(0, 5));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCreators(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchCreators]);

  // Import complete
  if (importResults) {
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
            Import Complete
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '32px',
              fontWeight: 300,
              marginBottom: '16px',
            }}
          >
            {importResults.succeeded} Works Imported
          </h2>
          {importResults.failed > 0 && (
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#991b1b',
                marginBottom: '16px',
              }}
            >
              {importResults.failed} failed
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setSelectedCreator(null);
                setImportResults(null);
                setSearchQuery('');
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
              Import Another Creator
            </button>
            <Link
              href="/contribute"
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
              Back to Contribute
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Creator selected — show bulk importer
  if (selectedCreator) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 40px' }}>
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
          <CreatorWorksView
            creatorQid={selectedCreator.qid}
            creatorName={selectedCreator.label}
            creatorBirthYear={selectedCreator.enrichedData?.birth_year}
            creatorDeathYear={selectedCreator.enrichedData?.death_year}
            onClose={() => setSelectedCreator(null)}
            onComplete={(results) => setImportResults(results)}
          />
        </div>
      </div>
    );
  }

  // Search for creator
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
            marginBottom: '8px',
          }}
        >
          Import Creator&apos;s Works
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            color: 'var(--color-gray)',
            fontStyle: 'italic',
            marginBottom: '32px',
          }}
        >
          Search for a creator to bulk import their works from Wikidata.
        </p>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a creator (e.g. Charles Dickens)..."
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

        {searching && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', padding: '8px 0' }}>
            Searching Wikidata...
          </div>
        )}

        {results.length > 0 && (
          <div style={{ border: '1px solid var(--color-border)' }}>
            {results.map((r) => (
              <button
                key={r.qid}
                onClick={() => setSelectedCreator(r)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                className="hover:bg-[var(--color-section-bg)] transition-colors"
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', marginBottom: '2px' }}>
                  {r.label}
                </div>
                {r.description && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)' }}>
                    {r.description}
                    {r.enrichedData?.worksCount ? ` · ${r.enrichedData.worksCount} works` : ''}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && !searching && results.length === 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', padding: '8px 0' }}>
            No creators found matching &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
