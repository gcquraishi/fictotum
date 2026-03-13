'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { BookMarked, ChevronDown, Check, Plus, X } from 'lucide-react';

interface Collection {
  collection_id: string;
  name: string;
  itemCount: number;
}

interface AddToCollectionButtonProps {
  itemId: string;
  itemType: 'figure' | 'media';
  itemLabel?: string;
}

export default function AddToCollectionButton({ itemId, itemType, itemLabel }: AddToCollectionButtonProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click — must be before any early return (Rules of Hooks)
  useEffect(() => {
    if (!session) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [session]);

  // Don't render if not authenticated
  if (status === 'loading' || !session) return null;

  const handleOpen = async () => {
    if (!open) {
      setLoading(true);
      try {
        const r = await fetch('/api/collections');
        const data = await r.json();
        setCollections(data.collections || []);
      } finally {
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  };

  const handleAdd = async (collectionId: string) => {
    setSaving(collectionId);
    try {
      const r = await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, item_type: itemType }),
      });
      if (r.ok) {
        setAdded((prev) => new Set([...prev, collectionId]));
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          border: '1px solid var(--color-border)',
          background: 'none',
          color: 'var(--color-gray)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Save to collection"
      >
        <BookMarked size={12} />
        Save
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            minWidth: '220px',
            background: '#fff',
            border: '1px solid var(--color-border)',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
              Save to Collection
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray)', display: 'flex', padding: 0 }}
            >
              <X size={12} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)' }}>
              Loading...
            </div>
          ) : collections.length === 0 ? (
            <div style={{ padding: '16px' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', color: 'var(--color-gray)', marginBottom: '10px' }}>
                No collections yet.
              </p>
              <a
                href="/collection/new"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--color-accent)',
                  textDecoration: 'none',
                }}
              >
                <Plus size={12} />
                Create one
              </a>
            </div>
          ) : (
            <>
              {collections.map((col) => (
                <button
                  key={col.collection_id}
                  onClick={() => handleAdd(col.collection_id)}
                  disabled={!!saving || added.has(col.collection_id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: added.has(col.collection_id) ? 'var(--color-section-bg)' : 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: added.has(col.collection_id) ? 'default' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    {col.name}
                  </span>
                  {saving === col.collection_id ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-gray)' }}>…</span>
                  ) : added.has(col.collection_id) ? (
                    <Check size={13} style={{ color: '#4A7C59', flexShrink: 0 }} />
                  ) : null}
                </button>
              ))}
              <a
                href="/collection/new"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--color-gray)',
                  textDecoration: 'none',
                }}
              >
                <Plus size={12} />
                New collection
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
