'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserCircle, Calendar, BookMarked, ArrowRight } from 'lucide-react';

interface Contribution {
  type: 'figure' | 'media';
  id: string;
  name?: string;
  era?: string;
  media_type?: string;
  created_at?: string;
}

interface ContributionData {
  figureCount: number;
  mediaCount: number;
  portrayalCount: number;
  recentFigures: Contribution[];
  recentMedia: Contribution[];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contributions, setContributions] = useState<ContributionData | null>(null);
  const [loadingContributions, setLoadingContributions] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/user/contributions')
      .then((r) => r.json())
      .then((data) => setContributions(data))
      .catch(() => setContributions(null))
      .finally(() => setLoadingContributions(false));
  }, [status]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session?.user) return null;
  const user = session.user;

  const totalContributions = contributions
    ? contributions.figureCount + contributions.mediaCount + contributions.portrayalCount
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Identity block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '48px', paddingBottom: '32px', borderBottom: '1px solid var(--color-border)' }}>
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              width={72}
              height={72}
              style={{ borderRadius: '50%', border: '1px solid var(--color-border)' }}
              unoptimized
            />
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--color-section-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserCircle size={36} style={{ color: 'var(--color-gray)' }} />
            </div>
          )}
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '32px', color: 'var(--color-text)', lineHeight: 1.1, marginBottom: '6px' }}>
              {user.name || 'Your Profile'}
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', marginBottom: '4px' }}>
              {user.email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Calendar size={12} style={{ color: 'var(--color-gray)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Member
              </span>
            </div>
          </div>
        </div>

        {/* Contribution stats */}
        <div style={{ marginBottom: '48px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '16px' }}>
            Contributions
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', border: '1px solid var(--color-border)', background: 'var(--color-border)' }}>
            {[
              { label: 'Figures Added', value: contributions?.figureCount ?? 0 },
              { label: 'Works Added', value: contributions?.mediaCount ?? 0 },
              { label: 'Portrayals', value: contributions?.portrayalCount ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#fff', padding: '20px', textAlign: 'center' }}>
                {loadingContributions ? (
                  <div style={{ height: '32px', width: '48px', margin: '0 auto 8px', background: 'var(--color-section-bg)' }} />
                ) : (
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: 'var(--color-accent)', fontWeight: 300, lineHeight: 1, marginBottom: '6px' }}>
                    {value}
                  </p>
                )}
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent contributions */}
        {contributions && (contributions.recentFigures.length > 0 || contributions.recentMedia.length > 0) && (
          <div style={{ marginBottom: '48px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '16px' }}>
              Recent Activity
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', border: '1px solid var(--color-border)' }}>
              {[...contributions.recentFigures.slice(0, 5), ...contributions.recentMedia.slice(0, 5)]
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .slice(0, 8)
                .map((item) => {
                  const href = item.type === 'figure' ? `/figure/${item.id}` : `/media/${item.id}`;
                  const label = item.name || 'Unknown';
                  const meta = item.type === 'figure' ? item.era : item.media_type;
                  return (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 20px',
                        background: '#fff',
                        textDecoration: 'none',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <div>
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--color-text)', marginBottom: '2px' }}>
                          {label}
                        </p>
                        {meta && (
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {item.type} · {meta}
                          </p>
                        )}
                      </div>
                      <ArrowRight size={14} style={{ color: 'var(--color-gray)', flexShrink: 0 }} />
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {/* Collections link */}
        <div style={{ padding: '20px 24px', border: '1px solid var(--color-border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookMarked size={20} style={{ color: 'var(--color-accent)' }} />
            <div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--color-text)', marginBottom: '2px' }}>
                My Collections
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Curated paths you have saved
              </p>
            </div>
          </div>
          <Link
            href="/collection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textDecoration: 'none',
            }}
          >
            View
            <ArrowRight size={12} />
          </Link>
        </div>

      </div>
    </div>
  );
}
