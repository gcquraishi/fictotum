export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, BookMarked, User as UserIcon, Globe, Layers } from 'lucide-react';
import CollectionMiniGraph from '@/components/CollectionMiniGraph';
import CollectionActions from '@/components/CollectionActions';
import { auth } from '@/lib/auth';
import { getCollectionById } from '@/lib/collections';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://fictotum.com';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  let data;
  try {
    data = await getCollectionById(id);
  } catch {
    return { title: 'Collection Not Found' };
  }

  if (!data) {
    return { title: 'Collection Not Found' };
  }

  const { collection, owner, items } = data;
  const title = collection.name;
  const description =
    collection.description ||
    `A curated collection of ${items.length} figures and works${owner?.name ? ` by ${owner.name}` : ''} on Fictotum.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} — Fictotum`,
      description,
      type: 'website',
      url: `${BASE_URL}/collection/${id}`,
    },
    twitter: {
      card: 'summary',
      title: `${title} — Fictotum`,
      description,
    },
  };
}

export default async function CollectionDetailPage({ params }: Params) {
  const { id } = await params;

  let data;
  try {
    data = await getCollectionById(id);
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  const { collection, owner, items } = data;
  const session = await auth();
  const isOwner = !!(session?.user?.email && owner?.email && session.user.email === owner.email);

  const figures = items.filter((i) => i.type === 'figure');
  const works = items.filter((i) => i.type === 'media');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <Link
            href="/collection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-gray)',
              textDecoration: 'none',
            }}
          >
            <ChevronLeft size={12} />
            Collections
          </Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-border)' }}>/</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-gray)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '200px',
          }}>
            {collection.name}
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <BookMarked size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
                  Collection
                </p>
              </div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '40px', color: 'var(--color-text)', lineHeight: 1.1, marginBottom: '12px' }}>
                {collection.name}
              </h1>
              {collection.description && (
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', color: 'var(--color-gray)', lineHeight: 1.6, maxWidth: '600px' }}>
                  {collection.description}
                </p>
              )}
            </div>

            {/* Owner & share info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
              {owner?.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {owner.image ? (
                    <Image
                      src={owner.image}
                      alt={owner.name}
                      width={24}
                      height={24}
                      style={{ borderRadius: '50%', border: '1px solid var(--color-border)' }}
                      unoptimized
                    />
                  ) : (
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-section-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserIcon size={14} style={{ color: 'var(--color-gray)' }} />
                    </div>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
                    {owner.name}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={12} style={{ color: 'var(--color-gray)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Public
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={12} style={{ color: 'var(--color-gray)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '1px', marginBottom: '40px', border: '1px solid var(--color-border)', background: 'var(--color-border)' }}>
          {[
            { label: 'Figures', value: figures.length },
            { label: 'Works', value: works.length },
            { label: 'Total', value: items.length },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, background: '#fff', padding: '16px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--color-accent)', fontWeight: 300, lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginTop: '4px' }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Mini-graph visualization */}
        {items.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '12px' }}>
              Graph View
            </p>
            <CollectionMiniGraph items={items} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-gray)', marginTop: '8px', textAlign: 'center' }}>
              Click any node to navigate to its detail page
            </p>
          </div>
        )}

        {/* Entity lists */}
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
            border: '1px dashed var(--color-border)',
          }}>
            <BookMarked size={36} style={{ color: 'var(--color-border)', margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--color-gray)' }}>
              This collection is empty.
            </p>
            {isOwner && (
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-gray)', marginTop: '8px' }}>
                Browse figures and works and use the Save button to add items here.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            {/* Figures column */}
            {figures.length > 0 && (
              <div>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'var(--color-gray)',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  Historical Figures ({figures.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {figures.map((item) => (
                    <Link
                      key={item.id}
                      href={`/figure/${item.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: '#fff',
                        textDecoration: 'none',
                      }}
                    >
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name || ''}
                          width={32}
                          height={32}
                          style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          unoptimized
                        />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-section-bg)', flexShrink: 0 }} />
                      )}
                      <div>
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-text)', lineHeight: 1.2 }}>
                          {item.name}
                        </p>
                        {item.era && (
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {item.era}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Works column */}
            {works.length > 0 && (
              <div>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'var(--color-gray)',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  Media Works ({works.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {works.map((item) => {
                    const navId = item.wikidata_id || item.id;
                    return (
                      <Link
                        key={item.id || item.wikidata_id}
                        href={`/media/${navId}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          background: '#fff',
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: 'var(--color-section-bg)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--color-gray)',
                          textTransform: 'uppercase',
                        }}>
                          {item.media_type?.slice(0, 2) || '?'}
                        </div>
                        <div>
                          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-text)', lineHeight: 1.2 }}>
                            {item.title}
                          </p>
                          {(item.media_type || item.release_year) && (
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              {[item.media_type, item.release_year].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <CollectionActions collectionId={collection.collection_id} />
        )}
      </div>
    </div>
  );
}
