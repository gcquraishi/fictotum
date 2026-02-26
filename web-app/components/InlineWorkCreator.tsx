'use client';

import { useState } from 'react';

const MEDIA_TYPES = [
  'Film', 'Book', 'TV Series', 'Documentary', 'Play', 'Musical', 'Comic', 'Video Game', 'Podcast',
];

interface CreatedWork {
  media_id: string;
  title: string;
  media_type: string;
  release_year?: number;
}

interface InlineWorkCreatorProps {
  onCreated: (work: CreatedWork) => void;
  onCancel: () => void;
  defaultTitle?: string;
}

export default function InlineWorkCreator({ onCreated, onCancel, defaultTitle = '' }: InlineWorkCreatorProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [mediaType, setMediaType] = useState('Film');
  const [releaseYear, setReleaseYear] = useState('');
  const [creator, setCreator] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

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
        // Work already exists — use the existing one
        onCreated({
          media_id: data.existing?.media_id || data.media_id,
          title: data.existing?.title || title.trim(),
          media_type: data.existing?.media_type || mediaType,
          release_year: releaseYear ? parseInt(releaseYear) : undefined,
        });
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create work');
      }

      const data = await response.json();
      onCreated({
        media_id: data.media_id,
        title: data.title || title.trim(),
        media_type: mediaType,
        release_year: releaseYear ? parseInt(releaseYear) : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create work');
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
        Create New Work
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
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Oppenheimer"
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
          <div style={{ flex: 2 }}>
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
              Media Type *
            </label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            >
              {MEDIA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
              Year
            </label>
            <input
              type="number"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value)}
              placeholder="e.g. 1964"
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
            Creator / Director
          </label>
          <input
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="e.g. Christopher Nolan"
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
          disabled={isSubmitting || !title.trim()}
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
          {isSubmitting ? 'Adding...' : 'Add Work'}
        </button>
      </div>
    </form>
  );
}
