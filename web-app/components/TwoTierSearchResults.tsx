'use client';

import { useState, useMemo, useEffect } from 'react';
import WikidataMatchCard from './WikidataMatchCard';
import type {
  SearchResult,
  WikidataMatch,
  TwoTierSearchResultsProps
} from '@/types/contribute';

// ============================================================================
// CHR-17: CLIENT-SIDE DEDUPLICATION UTILITY (Defense in Depth)
// ============================================================================

/**
 * Filters out Wikidata results that already exist in database results
 * This is a client-side safety net in case API filtering somehow missed duplicates
 */
function deduplicateResults(
  wikidataResults: WikidataMatch[],
  dbResults: SearchResult[]
): { filtered: WikidataMatch[]; count: number } {
  if (dbResults.length === 0 || wikidataResults.length === 0) {
    return { filtered: wikidataResults, count: 0 };
  }

  // Extract Q-IDs from database results (if they have wikidata_id)
  const dbQids = new Set(
    dbResults
      .map(result => result.metadata?.wikidata_id)
      .filter(Boolean)
  );

  // Filter out Wikidata matches that already exist in DB
  const filtered = wikidataResults.filter(match => !dbQids.has(match.qid));
  const count = wikidataResults.length - filtered.length;

  return { filtered, count };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TwoTierSearchResults({
  dbResults,
  wikidataResults,
  searchQuery,
  onSelectExisting,
  onSelectWikidata,
  onSelectUserGenerated,
  onAddAsFigure,
  onBrowseWorks,
  isEnriching = false
}: TwoTierSearchResultsProps) {

  // CHR-17: Prioritize database results - only show Wikidata if user opts in or no DB results
  const [showWikidataResults, setShowWikidataResults] = useState(false);

  // Auto-show Wikidata results if there are no database results
  const shouldShowWikidata = dbResults.length === 0 || showWikidataResults;

  // CHR-17: Client-side deduplication (defense in depth) - only applies when showing Wikidata
  const { filtered: dedupedWikidataResults, count: clientFilteredCount } = useMemo(
    () => deduplicateResults(wikidataResults, dbResults),
    [wikidataResults, dbResults]
  );

  // Reset Wikidata toggle when search results change (new search query)
  useEffect(() => {
    setShowWikidataResults(false);
  }, [searchQuery]);

  const hasResults = dbResults.length > 0 || dedupedWikidataResults.length > 0;

  // ============================================================================
  // RENDER: SECTION 1 - ALREADY IN CHRONOSGRAPH
  // ============================================================================

  const renderDatabaseResults = () => {
    if (dbResults.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'var(--color-text)',
          marginBottom: '16px'
        }}>
          Already in Fictotum
        </h3>
        <div className="space-y-2">
          {dbResults.map((result) => (
            <button
              key={result.id}
              onClick={() => onSelectExisting(result)}
              className="w-full p-4 text-left group hover:opacity-70 transition-opacity"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    fontSize: '18px',
                    color: 'var(--color-text)'
                  }}>
                    {result.name}
                  </p>
                  {result.description && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-gray)' }}>
                      {result.description}
                    </p>
                  )}
                  {result.year && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-gray)' }}>
                      {result.year}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="capitalize px-2 py-1" style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    background: 'var(--color-section-bg)',
                    color: 'var(--color-text)'
                  }}>
                    {result.type}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: SECTION 1.5 - WIKIDATA TOGGLE (CHR-17 UX IMPROVEMENT)
  // ============================================================================

  const renderWikidataToggle = () => {
    // Only show toggle if:
    // 1. We have database results (prioritizing existing data)
    // 2. We have Wikidata results available
    // 3. User hasn't already opted to show Wikidata
    if (dbResults.length === 0 || dedupedWikidataResults.length === 0 || showWikidataResults) {
      return null;
    }

    return (
      <div className="pt-4">
        <button
          onClick={() => setShowWikidataResults(true)}
          className="w-full p-4 text-left group hover:opacity-70 transition-opacity"
          style={{
            background: 'var(--color-section-bg)',
            border: '2px dashed var(--color-border)'
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--color-accent)',
              flexShrink: 0
            }}>
              WIKIDATA
            </span>
            <div className="flex-1">
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 300,
                fontSize: '16px',
                color: 'var(--color-text)'
              }}>
                Not finding what you're looking for?
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-gray)' }}>
                Search Wikidata for {dedupedWikidataResults.length} more option{dedupedWikidataResults.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </button>
      </div>
    );
  };

  // ============================================================================
  // RENDER: SECTION 2 - ADD FROM WIKIDATA
  // ============================================================================

  const renderWikidataResults = () => {
    // CHR-17: Only show Wikidata results if user opts in or no DB results exist
    if (!shouldShowWikidata || dedupedWikidataResults.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'var(--color-text)',
          marginBottom: '16px'
        }}>
          Add from Wikidata
        </h3>

        {isEnriching && (
          <div className="p-4 flex items-center gap-3" style={{
            borderLeft: '4px solid var(--color-accent)',
            background: 'var(--color-section-bg)'
          }}>
            <div className="w-5 h-5 border-2 animate-spin" style={{
              borderColor: 'var(--color-accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%'
            }} />
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Loading AI suggestions for locations and eras...
            </p>
          </div>
        )}

        <div className="space-y-2">
          {dedupedWikidataResults.map((match) => {
            const isCreator = match.enrichedData?.isCreator;

            return (
              <WikidataMatchCard
                key={match.qid}
                match={match}
                variant={isCreator ? 'creator' : 'default'}
                onSelect={() => onSelectWikidata(match)}
                // Bug fix CHR-19: Removed onAddFigure for creators - they should only show "Browse Works"
                onAddFigure={!isCreator && onAddAsFigure ? () => onAddAsFigure(match) : undefined}
                onBrowseWorks={isCreator && onBrowseWorks ? () => onBrowseWorks(match) : undefined}
                disabled={isEnriching}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: SECTION 3 - NOT FOUND? CREATE MANUALLY
  // ============================================================================

  const renderManualCreation = () => (
    <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
      <button
        onClick={onSelectUserGenerated}
        className="w-full p-4 text-left group hover:opacity-70 transition-opacity"
        style={{
          background: 'var(--color-section-bg)',
          border: '2px dashed var(--color-border)'
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: 'var(--color-accent)',
            flexShrink: 0
          }}>
            CREATE
          </span>
          <div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 300,
              fontSize: '16px',
              color: 'var(--color-text)'
            }}>
              Not found anywhere?
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-gray)' }}>
              Create a new entry without Wikidata enrichment
            </p>
          </div>
        </div>
      </button>
    </div>
  );

  // ============================================================================
  // RENDER: EMPTY STATE
  // ============================================================================

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <p className="mb-4" style={{
        fontFamily: 'var(--font-serif)',
        fontWeight: 300,
        fontSize: '18px',
        color: 'var(--color-gray)'
      }}>
        No results found for "{searchQuery}"
      </p>
      <button
        onClick={onSelectUserGenerated}
        className="inline-flex items-center gap-2 hover:opacity-70 transition-opacity"
        style={{
          background: 'var(--color-text)',
          color: 'var(--color-bg)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          padding: '14px',
          border: 'none'
        }}
      >
        Add Manually
      </button>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (!hasResults) {
    return renderEmptyState();
  }

  return (
    <div className="space-y-6">
      {renderDatabaseResults()}
      {renderWikidataToggle()}
      {renderWikidataResults()}
      {renderManualCreation()}
    </div>
  );
}
