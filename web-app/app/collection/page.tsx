'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookMarked, Plus, Globe, Trash2 } from 'lucide-react';

interface Collection {
  collection_id: string;
  name: string;
  description: string;
  itemCount: number;
  updated_at: string;
}

export default function CollectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data) => setCollections(data.collections || []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, [status]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete collection "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const r = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setCollections((prev) => prev.filter((c) => c.collection_id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
            Loading
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '8px' }}>
              My Collections
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '36px', color: 'var(--color-text)', lineHeight: 1.1 }}>
              Curated Paths
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--color-gray)', marginTop: '8px' }}>
              Named sets of figures and works you have gathered together.
            </p>
          </div>
          <Link
            href="/collection/new"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            New Collection
          </Link>
        </div>

        {/* Collections list */}
        {collections.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            border: '1px dashed var(--color-border)',
          }}>
            <BookMarked size={40} style={{ color: 'var(--color-border)', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--color-text)', marginBottom: '8px' }}>
              No collections yet
            </p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-gray)', marginBottom: '24px' }}>
              Create a collection to save figures and works that tell a story together.
            </p>
            <Link
              href="/collection/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'var(--color-accent)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textDecoration: 'none',
              }}
            >
              <Plus size={14} />
              Create your first collection
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', border: '1px solid var(--color-border)' }}>
            {collections.map((col) => (
              <div
                key={col.collection_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  background: '#fff',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Link
                      href={`/collection/${col.collection_id}`}
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '18px',
                        color: 'var(--color-text)',
                        textDecoration: 'none',
                        fontWeight: 400,
                      }}
                      className="hover:text-[var(--color-accent)] transition-colors"
                    >
                      {col.name}
                    </Link>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', background: 'var(--color-section-bg)', padding: '2px 8px' }}>
                      {col.itemCount ?? 0} items
                    </span>
                  </div>
                  {col.description && (
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {col.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px', flexShrink: 0 }}>
                  <Link
                    href={`/collection/${col.collection_id}`}
                    title="View shared link"
                    style={{ color: 'var(--color-gray)', display: 'flex', alignItems: 'center' }}
                    className="hover:text-[var(--color-text)] transition-colors"
                  >
                    <Globe size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(col.collection_id, col.name)}
                    disabled={deleting === col.collection_id}
                    title="Delete collection"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-gray)',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: deleting === col.collection_id ? 0.4 : 1,
                    }}
                    className="hover:text-[var(--color-accent)] transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
