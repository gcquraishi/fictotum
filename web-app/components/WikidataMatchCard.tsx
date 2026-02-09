'use client';

import type {
  WikidataMatch,
  WikidataMatchCardProps
} from '@/types/contribute';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WikidataMatchCard({
  match,
  variant = 'default',
  onSelect,
  onAddFigure,
  onBrowseWorks,
  disabled = false
}: WikidataMatchCardProps) {

  const { qid, label, description, confidence, enrichedData } = match;

  // ============================================================================
  // CONFIDENCE BADGE STYLING
  // ============================================================================

  const getConfidenceBadge = () => {
    if (!confidence) return null;

    const styles = {
      high: {
        background: 'var(--color-section-bg)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border-bold)'
      },
      medium: {
        background: 'var(--color-section-bg)',
        color: 'var(--color-gray)',
        border: '1px solid var(--color-border)'
      },
      low: {
        background: 'var(--color-section-bg)',
        color: 'var(--color-accent)',
        border: '1px solid var(--color-accent)'
      }
    };

    return (
      <span className="px-2 py-0.5 text-xs" style={{
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        ...styles[confidence]
      }}>
        {confidence} confidence
      </span>
    );
  };

  // ============================================================================
  // ENRICHED DATA PREVIEW
  // ============================================================================

  const renderEnrichedPreview = () => {
    if (!enrichedData) return null;

    const previews = [];

    // Birth/Death years for figures
    if (enrichedData.birth_year || enrichedData.death_year) {
      previews.push(
        <span key="lifespan" className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-gray)' }}>
          Birth: {enrichedData.birth_year || '?'}, Death: {enrichedData.death_year || '?'}
        </span>
      );
    }

    // Release year for works
    if (enrichedData.release_year) {
      previews.push(
        <span key="release" className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-gray)' }}>
          Released: {enrichedData.release_year}
        </span>
      );
    }

    // Locations
    if (enrichedData.locations && enrichedData.locations.length > 0) {
      const locationCount = enrichedData.locations.length;
      const firstLocation = enrichedData.locations[0];
      previews.push(
        <span key="locations" className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-gray)' }}>
          {locationCount === 1
            ? `Location: ${firstLocation.name}`
            : `${locationCount} locations`}
        </span>
      );
    }

    // Eras
    if (enrichedData.eras && enrichedData.eras.length > 0) {
      const eraCount = enrichedData.eras.length;
      const topEra = enrichedData.eras[0];
      previews.push(
        <span key="eras" className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-gray)' }}>
          Era: {topEra.name}
          {eraCount > 1 && ` (+${eraCount - 1} more)`}
        </span>
      );
    }

    // Works count for creators
    if (enrichedData.isCreator && enrichedData.worksCount) {
      previews.push(
        <span key="works" className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-gray)' }}>
          {enrichedData.worksCount} works
        </span>
      );
    }

    if (previews.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-3 mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
        {previews.map((preview, idx) => (
          <div key={idx}>{preview}</div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER: DEFAULT VARIANT (Single "Add This" button)
  // ============================================================================

  const renderDefaultVariant = () => (
    <button
      onClick={onSelect}
      disabled={disabled}
      className="w-full p-4 text-left group disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-70 transition-opacity"
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)'
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Q-ID Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs" style={{
              fontFamily: 'var(--font-mono)',
              background: 'var(--color-section-bg)',
              color: 'var(--color-accent)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {qid}
            </span>
            {getConfidenceBadge()}
          </div>

          {/* Label (Title/Name) */}
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: '18px',
            color: 'var(--color-text)'
          }}>
            {label}
          </p>

          {/* Description */}
          {description && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-gray)' }}>
              {description}
            </p>
          )}

          {/* Enriched Data Preview */}
          {renderEnrichedPreview()}
        </div>

        {/* Add Button */}
        <div className="flex-shrink-0">
          <div className="px-4 py-2 text-sm" style={{
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px'
          }}>
            Add This
          </div>
        </div>
      </div>
    </button>
  );

  // ============================================================================
  // RENDER: CREATOR VARIANT (Dual buttons)
  // ============================================================================

  const renderCreatorVariant = () => (
    <div className="p-4 hover:opacity-70 transition-opacity" style={{
      background: 'var(--color-bg)',
      border: '2px solid var(--color-accent)'
    }}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {/* Q-ID Badge with Creator Indicator */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs" style={{
              fontFamily: 'var(--font-mono)',
              background: 'var(--color-section-bg)',
              color: 'var(--color-accent)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {qid}
            </span>
            <span className="px-2 py-0.5 text-xs flex items-center gap-1" style={{
              fontFamily: 'var(--font-mono)',
              background: 'var(--color-section-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-bold)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Creator
            </span>
            {getConfidenceBadge()}
          </div>

          {/* Label (Name) */}
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: '18px',
            color: 'var(--color-text)'
          }}>
            {label}
          </p>

          {/* Description */}
          {description && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-gray)' }}>
              {description}
            </p>
          )}

          {/* Enriched Data Preview */}
          {renderEnrichedPreview()}
        </div>
      </div>

      {/* Dual Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onAddFigure}
          disabled={disabled}
          className="flex-1 px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70 transition-opacity flex items-center justify-center gap-2"
          style={{
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            border: 'none'
          }}
        >
          Add as Figure
        </button>
        <button
          onClick={onBrowseWorks}
          disabled={disabled}
          className="flex-1 px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70 transition-opacity flex items-center justify-center gap-2"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            border: 'none'
          }}
        >
          Browse Works
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return variant === 'creator' ? renderCreatorVariant() : renderDefaultVariant();
}
