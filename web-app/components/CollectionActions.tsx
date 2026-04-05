'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface CollectionActionsProps {
  collectionId: string;
}

export default function CollectionActions({ collectionId }: CollectionActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this collection? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
      if (r.ok) {
        router.push('/collection');
      } else {
        const d = await r.json();
        alert(d.error || 'Failed to delete collection.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', marginRight: 'auto', display: 'flex', alignItems: 'center' }}>
        Owner actions
      </p>
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          border: '1px solid var(--color-border)',
          background: 'none',
          color: deleting ? 'var(--color-gray)' : 'var(--color-accent)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          cursor: deleting ? 'not-allowed' : 'pointer',
          opacity: deleting ? 0.6 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        <Trash2 size={13} />
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
