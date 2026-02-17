'use client';

import { useState } from 'react';

interface CreatedFigure {
  canonical_id: string;
  name: string;
  birth_year?: number;
  death_year?: number;
}

interface InlineFigureCreatorProps {
  onCreated: (figure: CreatedFigure) => void;
  onCancel: () => void;
  defaultName?: string;
}

export default function InlineFigureCreator({ onCreated, onCancel, defaultName = '' }: InlineFigureCreatorProps) {
  const [name, setName] = useState(defaultName);
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [historicity, setHistoricity] = useState<'Historical' | 'Fictional' | 'Disputed'>('Historical');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/figures/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          historicity,
          birthYear: birthYear ? parseInt(birthYear) : undefined,
          deathYear: deathYear ? parseInt(deathYear) : undefined,
          data_source: 'user_generated',
        }),
      });

      if (response.status === 409) {
        const data = await response.json();
        // Figure already exists — use the existing one
        onCreated({
          canonical_id: data.existing?.canonical_id || data.canonical_id,
          name: data.existing?.name || name.trim(),
          birth_year: birthYear ? parseInt(birthYear) : undefined,
          death_year: deathYear ? parseInt(deathYear) : undefined,
        });
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create figure');
      }

      const data = await response.json();
      onCreated({
        canonical_id: data.canonical_id,
        name: data.name || name.trim(),
        birth_year: birthYear ? parseInt(birthYear) : undefined,
        death_year: deathYear ? parseInt(deathYear) : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create figure');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '20px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-section-bg)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'var(--color-accent)',
          marginBottom: '16px',
        }}
      >
        Create New Figure
      </div>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '12px',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
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
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Napoleon Bonaparte"
            required
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

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
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
              Birth Year
            </label>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="-44"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
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
              Death Year
            </label>
            <input
              type="number"
              value={deathYear}
              onChange={(e) => setDeathYear(e.target.value)}
              placeholder="14"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
              }}
            />
          </div>
        </div>

        <div>
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
            Historicity *
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['Historical', 'Fictional', 'Disputed'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHistoricity(h)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  border: '1px solid var(--color-border)',
                  background: historicity === h ? 'var(--color-text)' : 'var(--color-bg)',
                  color: historicity === h ? 'var(--color-bg)' : 'var(--color-text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: isSubmitting ? 'var(--color-gray)' : 'var(--color-text)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            cursor: isSubmitting ? 'default' : 'pointer',
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Figure'}
        </button>
      </div>
    </form>
  );
}
