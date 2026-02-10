'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TemporalCoverageChart from '@/components/TemporalCoverageChart';
import CoverageGapIndicator from '@/components/CoverageGapIndicator';
import TemporalCoverageFilters from '@/components/TemporalCoverageFilters';
import PeriodDetailPanel from '@/components/PeriodDetailPanel';
import { TemporalCoverageData, TimeBucket } from '@/lib/types';

export default function CoveragePage() {
  const [data, setData] = useState<TemporalCoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    granularity: 'century' | 'decade' | 'year';
    mediaType?: string;
    showSeriesOnly?: boolean;
  }>({
    granularity: 'century',
  });

  const fetchCoverageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        granularity: filters.granularity,
        ...(filters.mediaType && { mediaType: filters.mediaType }),
      });

      const response = await fetch(`/api/temporal-coverage?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch coverage data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCoverageData();
  }, [fetchCoverageData]);

  const handlePeriodClick = (bucket: TimeBucket) => {
    setSelectedPeriod(bucket.period);
  };

  const handleGapClick = (period: string) => {
    setSelectedPeriod(period);
  };

  const calculateCoveragePercentage = (): number => {
    if (!data || data.timeBuckets.length === 0) return 0;
    const adequateBuckets = data.timeBuckets.filter(b => b.workCount >= 5).length;
    return Math.round((adequateBuckets / data.timeBuckets.length) * 100);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
        {/* Back Link */}
        <Link
          href="/"
          className="hover:opacity-70 transition-opacity"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--color-gray)',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '32px',
          }}
        >
          &larr; Back to Home
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <p className="fsg-label" style={{ marginBottom: '8px' }}>
            Temporal Distribution Analysis
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '48px',
              fontWeight: 300,
              color: 'var(--color-text)',
              marginBottom: '12px',
            }}
          >
            Temporal Coverage Explorer
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              color: 'var(--color-gray)',
              maxWidth: '700px',
              lineHeight: '1.5',
            }}
          >
            Comprehensive visualization of Fictotum's historical coverage across all time periods,
            showing content density, media type distribution, and identification of under-represented eras.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div
            style={{
              marginBottom: '32px',
              padding: '16px',
              background: 'var(--color-section-bg)',
              borderLeft: '4px solid var(--color-accent)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-accent)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '4px',
              }}
            >
              Error Loading Coverage Data
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text)' }}>
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '96px 0', textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
              }}
            >
              Analyzing temporal coverage...
            </p>
          </div>
        )}

        {/* Main Content */}
        {data && !loading && (
          <>
            {/* Statistics Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1px',
                background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
                marginBottom: '32px',
              }}
            >
              <div style={{ background: 'var(--color-bg)', padding: '20px' }}>
                <p className="fsg-label-sm" style={{ marginBottom: '8px' }}>Total Works</p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '32px',
                    fontWeight: 500,
                    color: 'var(--color-accent)',
                  }}
                >
                  {data.statistics.totalWorks}
                </p>
              </div>

              <div style={{ background: 'var(--color-bg)', padding: '20px' }}>
                <p className="fsg-label-sm" style={{ marginBottom: '8px' }}>Total Figures</p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '32px',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                  }}
                >
                  {data.statistics.totalFigures}
                </p>
              </div>

              <div style={{ background: 'var(--color-bg)', padding: '20px' }}>
                <p className="fsg-label-sm" style={{ marginBottom: '8px' }}>Date Range</p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                  }}
                >
                  {data.statistics.earliestYear < 0
                    ? `${Math.abs(data.statistics.earliestYear)} BCE`
                    : data.statistics.earliestYear}
                  {' \u2014 '}
                  {data.statistics.latestYear}
                </p>
              </div>

              <div style={{ background: 'var(--color-bg)', padding: '20px' }}>
                <p className="fsg-label-sm" style={{ marginBottom: '8px' }}>Coverage Quality</p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '32px',
                    fontWeight: 500,
                    color: 'var(--color-accent)',
                  }}
                >
                  {calculateCoveragePercentage()}%
                </p>
              </div>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '32px' }}>
              <TemporalCoverageFilters onFilterChange={setFilters} />
            </div>

            {/* Main Chart */}
            <div style={{ marginBottom: '32px' }}>
              <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                <span>Temporal Distribution</span>
              </div>
              <TemporalCoverageChart
                timeBuckets={data.timeBuckets}
                onPeriodClick={handlePeriodClick}
              />
            </div>

            {/* Coverage Gaps */}
            <div style={{ marginBottom: '32px' }}>
              <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                <span>Coverage Analysis</span>
              </div>
              <CoverageGapIndicator
                coverageGaps={data.statistics.coverageGaps}
                onGapClick={handleGapClick}
              />
            </div>

            {/* Period Detail Panel */}
            <PeriodDetailPanel
              period={selectedPeriod || ''}
              isOpen={selectedPeriod !== null}
              onClose={() => setSelectedPeriod(null)}
            />
          </>
        )}
      </div>
    </div>
  );
}
