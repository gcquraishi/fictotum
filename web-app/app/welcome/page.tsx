import Link from 'next/link';
import Image from 'next/image';
import { getSession } from '@/lib/neo4j';
import FigureCard from '@/components/FigureCard';
import PortrayalCard from '@/components/PortrayalCard';
import { formatLifespan, formatMediaType } from '@/lib/card-utils';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'One Figure, A Thousand Stories | Fictotum Archive',
  description:
    'See how Julius Caesar has been portrayed across 20 media works spanning 2,000 years — from Plutarch to PlayStation. Explore the Fictotum Archive.',
  openGraph: {
    title: 'One Figure, A Thousand Stories | Fictotum Archive',
    description:
      'Julius Caesar: 20 portrayals across books, films, TV series, and video games. See how history becomes fiction.',
    type: 'website',
  },
};

// =============================================================================
// SHOWCASE FIGURE ID
// =============================================================================

const SHOWCASE_FIGURE_ID = 'HF_RM_001'; // Julius Caesar

// =============================================================================
// FEATURED PORTRAYALS (hand-picked for maximum contrast)
// =============================================================================

const FEATURED_MEDIA_IDS = [
  'plutarch_lives',       // 100 AD - Book - Complex (the ancient source)
  'cleopatra_1963',       // 1963 - Film - Heroic (Hollywood golden age)
  'hbo_rome',             // 2005 - TVSeries - Complex (prestige TV)
  'ac_origins',           // 2017 - Game - Villainous (video game)
];

// =============================================================================
// DATA FETCHING
// =============================================================================

interface ShowcaseData {
  figure: {
    name: string;
    birthYear: number | null;
    deathYear: number | null;
    era: string | null;
    imageUrl: string | null;
    portrayalCount: number;
    mediaTypeCount: number;
    mediaTypes: string[];
  };
  portrayals: {
    title: string;
    mediaId: string;
    mediaType: string | null;
    releaseYear: number | null;
    creator: string | null;
    imageUrl: string | null;
    wikidataId: string | null;
    sentiment: string | null;
    characterName: string | null;
    actor: string | null;
  }[];
  connected: {
    canonicalId: string;
    name: string;
    era: string | null;
    birthYear: number | null;
    deathYear: number | null;
    sharedWorks: number;
  }[];
  stats: {
    figures: number;
    works: number;
    portrayals: number;
  };
}

async function getShowcaseData(): Promise<ShowcaseData> {
  const session = await getSession();
  try {
    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return v;
      if (typeof v === 'object' && v !== null && 'toNumber' in v) {
        return (v as { toNumber: () => number }).toNumber();
      }
      return Number(v);
    };

    // 1. Figure overview
    const figureResult = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $id})-[r:APPEARS_IN]->(m:MediaWork)
       WITH f, count(r) AS portrayalCount,
            collect(DISTINCT m.media_type) AS mediaTypes
       RETURN f.name AS name, f.era AS era,
              f.birth_year AS birth_year, f.death_year AS death_year,
              f.image_url AS image_url,
              portrayalCount, mediaTypes`,
      { id: SHOWCASE_FIGURE_ID }
    );

    if (!figureResult.records.length) {
      return {
        figure: { name: 'Unknown', birthYear: null, deathYear: null, era: null, imageUrl: null, portrayalCount: 0, mediaTypeCount: 0, mediaTypes: [] },
        portrayals: [],
        connected: [],
        stats: { figures: 0, works: 0, portrayals: 0 },
      };
    }

    const fr = figureResult.records[0];
    const mediaTypes = fr.get('mediaTypes') as string[];

    // 2. Featured portrayals (curated subset)
    const portrayalsResult = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $id})-[r:APPEARS_IN]->(m:MediaWork)
       WHERE m.media_id IN $mediaIds
       RETURN m.media_id AS media_id, m.title AS title, m.media_type AS media_type,
              m.release_year AS release_year, m.creator AS creator,
              m.image_url AS image_url, m.wikidata_id AS wikidata_id,
              r.sentiment AS sentiment, r.character_name AS character_name,
              r.actor AS actor
       ORDER BY m.release_year`,
      { id: SHOWCASE_FIGURE_ID, mediaIds: FEATURED_MEDIA_IDS }
    );

    // 3. Connected figures
    const connectedResult = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $id})-[:APPEARS_IN]->(m:MediaWork)<-[:APPEARS_IN]-(other:HistoricalFigure)
       WHERE other.canonical_id <> $id
       WITH other, count(DISTINCT m) AS sharedWorks
       ORDER BY sharedWorks DESC
       LIMIT 8
       RETURN other.canonical_id AS id, other.name AS name, other.era AS era,
              other.birth_year AS birth_year, other.death_year AS death_year,
              sharedWorks`,
      { id: SHOWCASE_FIGURE_ID }
    );

    // 4. Archive stats
    const statsResult = await session.run(
      `MATCH (f:HistoricalFigure) WITH count(f) AS figureCount
       MATCH (m:MediaWork) WITH figureCount, count(m) AS workCount
       MATCH ()-[r:APPEARS_IN]->() WITH figureCount, workCount, count(r) AS portrayalCount
       RETURN figureCount, workCount, portrayalCount`
    );

    const figure = {
      name: fr.get('name') as string,
      birthYear: toNum(fr.get('birth_year')),
      deathYear: toNum(fr.get('death_year')),
      era: fr.get('era') as string | null,
      imageUrl: fr.get('image_url') as string | null,
      portrayalCount: toNum(fr.get('portrayalCount')) || 0,
      mediaTypeCount: mediaTypes.length,
      mediaTypes,
    };

    const portrayals = portrayalsResult.records.map((r) => ({
      title: r.get('title') as string,
      mediaId: r.get('media_id') as string,
      mediaType: r.get('media_type') as string | null,
      releaseYear: toNum(r.get('release_year')),
      creator: r.get('creator') as string | null,
      imageUrl: r.get('image_url') as string | null,
      wikidataId: r.get('wikidata_id') as string | null,
      sentiment: r.get('sentiment') as string | null,
      characterName: r.get('character_name') as string | null,
      actor: r.get('actor') as string | null,
    }));

    const connected = connectedResult.records.map((r) => ({
      canonicalId: r.get('id') as string,
      name: r.get('name') as string,
      era: r.get('era') as string | null,
      birthYear: toNum(r.get('birth_year')),
      deathYear: toNum(r.get('death_year')),
      sharedWorks: toNum(r.get('sharedWorks')) || 0,
    }));

    const sr = statsResult.records[0];
    const stats = sr
      ? {
          figures: toNum(sr.get('figureCount')) || 0,
          works: toNum(sr.get('workCount')) || 0,
          portrayals: toNum(sr.get('portrayalCount')) || 0,
        }
      : { figures: 0, works: 0, portrayals: 0 };

    return { figure, portrayals, connected, stats };
  } finally {
    await session.close();
  }
}

// =============================================================================
// NARRATIVE HELPERS
// =============================================================================

function getYearSpan(portrayals: ShowcaseData['portrayals']): string {
  const years = portrayals
    .map((p) => p.releaseYear)
    .filter((y): y is number => y !== null);
  if (years.length < 2) return '';
  const min = Math.min(...years);
  const max = Math.max(...years);
  const span = max - min;
  if (span > 1000) return `${(span / 1000).toFixed(1).replace('.0', '')}k`;
  return span.toString();
}

function getMediaTypeSummary(mediaTypes: string[]): string {
  const unique = mediaTypes
    .map(formatMediaType)
    .map((t) => t.toLowerCase())
    .filter((v, i, arr) => arr.indexOf(v) === i);
  if (unique.length <= 1) return unique[0] || '';
  return `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function WelcomePage() {
  const data = await getShowcaseData();
  const { figure, portrayals, connected, stats } = data;
  const lifespan = formatLifespan(figure.birthYear, figure.deathYear);
  const yearSpan = getYearSpan(portrayals);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* ================================================================
          HERO — compact layout, sticker + text side by side
          ================================================================ */}
      <section
        style={{
          padding: '48px 40px 32px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-accent)',
            marginBottom: '16px',
          }}
        >
          Fictotum Archive
        </p>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginBottom: '24px' }}>
          {/* Sticker */}
          <div style={{ flexShrink: 0 }}>
            <Image
              src="/illustrations/caesar_sticker.png"
              alt="Julius Caesar Sticker"
              width={180}
              height={180}
              priority
            />
          </div>

          {/* Text + nameplate */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '36px',
                fontWeight: 300,
                lineHeight: 1.2,
                marginBottom: '12px',
              }}
            >
              One Figure, A Thousand Stories
            </h1>

            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                color: 'var(--color-gray)',
                fontStyle: 'italic',
                lineHeight: 1.5,
                marginBottom: '12px',
              }}
            >
              {figure.name} has been reimagined {figure.portrayalCount} times across{' '}
              {figure.mediaTypeCount} media types{yearSpan ? ` spanning ${yearSpan}+ years` : ''}.
              Hero. Villain. Genius. Tyrant.
            </p>

            {/* Inline nameplate */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 400,
                }}
              >
                {figure.name}
              </span>
              {lifespan && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-gray)',
                  }}
                >
                  {lifespan}
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--color-accent)',
                }}
              >
                {figure.era}
              </span>
            </div>
          </div>
        </div>

        {/* Stat pills — compact row */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {[
            { label: 'Portrayals', value: figure.portrayalCount },
            { label: 'Media Types', value: figure.mediaTypeCount },
            { label: 'Connected Figures', value: connected.length },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                {s.value}
              </span>{' '}
              <span style={{ color: 'var(--color-gray)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          CONTRASTING PORTRAYALS
          ================================================================ */}
      <section
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 40px 32px',
        }}
      >
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '24px',
          }}
        >
          <div className="fsg-section-header" style={{ marginBottom: '4px' }}>
            <span>Contrasting Portrayals</span>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '15px',
              fontStyle: 'italic',
              color: 'var(--color-gray)',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            The same historical figure, seen through{' '}
            {getMediaTypeSummary(portrayals.map((p) => p.mediaType).filter((t): t is string => !!t))}
            &mdash;each with a different interpretation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {portrayals.map((p) => (
              <PortrayalCard
                key={p.mediaId}
                media={{
                  mediaId: p.mediaId,
                  title: p.title,
                  releaseYear: p.releaseYear,
                  mediaType: p.mediaType || undefined,
                  creator: p.creator || undefined,
                  imageUrl: p.imageUrl,
                  wikidataId: p.wikidataId || undefined,
                }}
                sentiment={p.sentiment || undefined}
                characterName={p.characterName || undefined}
                actorName={p.actor || undefined}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          CONNECTED FIGURES
          ================================================================ */}
      <section
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 40px 32px',
        }}
      >
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '24px',
          }}
        >
          <div className="fsg-section-header" style={{ marginBottom: '4px' }}>
            <span>Connected Figures</span>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '15px',
              fontStyle: 'italic',
              color: 'var(--color-gray)',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            Historical figures who co-appear with {figure.name} across the same
            media works&mdash;revealing the constellations of history.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '20px',
            }}
          >
            {connected.map((c) => (
              <FigureCard
                key={c.canonicalId}
                canonicalId={c.canonicalId}
                name={c.name}
                birthYear={c.birthYear}
                deathYear={c.deathYear}
                era={c.era || undefined}
                portrayalCount={c.sharedWorks}
                portrayalLabel={`${c.sharedWorks} shared`}
                variant="compact"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA - EXPLORE THE ARCHIVE
          ================================================================ */}
      <section
        style={{
          background: 'var(--color-dept-bg)',
          borderTop: '1px solid var(--color-border)',
          padding: '60px 40px',
        }}
      >
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-accent)',
              marginBottom: '16px',
            }}
          >
            The Full Archive
          </p>

          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '24px',
              fontWeight: 300,
              lineHeight: 1.4,
              marginBottom: '24px',
            }}
          >
            {figure.name} is just one of{' '}
            <span style={{ color: 'var(--color-accent)', fontWeight: 400 }}>
              {stats.figures.toLocaleString()}
            </span>{' '}
            historical figures in the archive, connected through{' '}
            <span style={{ color: 'var(--color-accent)', fontWeight: 400 }}>
              {stats.portrayals.toLocaleString()}
            </span>{' '}
            portrayals across{' '}
            <span style={{ color: 'var(--color-accent)', fontWeight: 400 }}>
              {stats.works.toLocaleString()}
            </span>{' '}
            media works.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              marginTop: '32px',
            }}
          >
            <Link
              href="/"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '14px 32px',
                background: 'var(--color-text)',
                color: 'var(--color-bg)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
              className="hover:opacity-80 transition-opacity"
            >
              Explore the Archive
            </Link>
            <Link
              href={`/figure/${SHOWCASE_FIGURE_ID}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '14px 32px',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
              className="hover:border-[var(--color-text)] transition-colors"
            >
              {figure.name}&apos;s Full Dossier
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border-bold)',
          padding: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          color: 'var(--color-gray)',
        }}
      >
        <div>&copy; 2026 Fictotum Archive</div>
        <div>A Project Mapping History & Fiction</div>
      </footer>
    </div>
  );
}
