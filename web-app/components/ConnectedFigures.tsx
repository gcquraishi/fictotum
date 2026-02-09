'use client';

import { useState, useEffect } from 'react';
import FigureCard from '@/components/FigureCard';

interface ConnectedFigure {
  canonical_id: string;
  name: string;
  era?: string;
  birth_year?: number;
  death_year?: number;
  image_url?: string | null;
  historicity_status?: 'Historical' | 'Fictional' | 'Disputed';
  sharedWorks: number;
}

export default function ConnectedFigures({ figureId }: { figureId: string }) {
  const [figures, setFigures] = useState<ConnectedFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/figures/${encodeURIComponent(figureId)}/connected`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setFigures(data);
      })
      .catch((err) => {
        console.error('Failed to load connected figures:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [figureId]);

  if (loading) {
    return (
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-gray)',
          padding: '20px 0',
        }}
      >
        Loading connected figures...
      </div>
    );
  }

  if (error || figures.length === 0) return null;

  return (
    <div>
      <div className="fsg-section-header">
        <span>Connected Figures</span>
        <span>({figures.length})</span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingTop: '16px',
          paddingBottom: '8px',
        }}
      >
        {figures.map((f) => (
          <FigureCard
            key={f.canonical_id}
            canonicalId={f.canonical_id}
            name={f.name}
            birthYear={f.birth_year}
            deathYear={f.death_year}
            era={f.era}
            imageUrl={f.image_url}
            portrayalCount={f.sharedWorks}
            portrayalLabel={`${f.sharedWorks} shared work${f.sharedWorks !== 1 ? 's' : ''}`}
            historicityStatus={f.historicity_status || 'Historical'}
            variant="compact"
          />
        ))}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-gray)',
          marginTop: '4px',
        }}
      >
        Figures who co-appear in the same media works
      </p>
    </div>
  );
}
