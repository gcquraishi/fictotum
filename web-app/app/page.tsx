import Link from 'next/link';
import FigureCard from '@/components/FigureCard';
import WorkCard from '@/components/WorkCard';
import HomepageSearch from '@/components/HomepageSearch';
import { getSession } from '@/lib/neo4j';

export const dynamic = 'force-dynamic';

async function getHomepageData() {
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

    const figuresResult = await session.run(`
      MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
      WITH f, count(r) AS portrayalCount
      ORDER BY portrayalCount DESC
      LIMIT 12
      RETURN f.canonical_id AS canonical_id, f.name AS name, f.era AS era,
             f.birth_year AS birth_year, f.death_year AS death_year,
             f.image_url AS image_url, f.historicity_status AS historicity_status,
             portrayalCount
    `);

    const worksResult = await session.run(`
      MATCH (m:MediaWork)<-[r:APPEARS_IN]-(:HistoricalFigure)
      WITH m, count(r) AS figureCount
      ORDER BY figureCount DESC
      LIMIT 8
      RETURN m.media_id AS media_id, m.title AS title, m.media_type AS media_type,
             m.release_year AS release_year, m.creator AS creator,
             m.director AS director, m.author AS author,
             m.image_url AS image_url, m.wikidata_id AS wikidata_id,
             figureCount
    `);

    const erasResult = await session.run(`
      MATCH (f:HistoricalFigure)
      WITH f.era AS era, count(f) AS figureCount
      WHERE era IS NOT NULL
      ORDER BY figureCount DESC
      LIMIT 12
      RETURN era, figureCount
    `);

    const statsResult = await session.run(`
      MATCH (f:HistoricalFigure) WITH count(f) AS figureCount
      MATCH (m:MediaWork) WITH figureCount, count(m) AS workCount
      MATCH ()-[r:APPEARS_IN]->() WITH figureCount, workCount, count(r) AS portrayalCount
      RETURN figureCount, workCount, portrayalCount
    `);

    const figures = figuresResult.records.map(r => ({
      canonical_id: r.get('canonical_id') as string,
      name: r.get('name') as string,
      era: r.get('era') as string | null,
      birth_year: toNum(r.get('birth_year')),
      death_year: toNum(r.get('death_year')),
      image_url: r.get('image_url') as string | null,
      historicity_status: (r.get('historicity_status') as string) || 'Historical',
      portrayalCount: toNum(r.get('portrayalCount')) || 0,
    }));

    const works = worksResult.records.map(r => ({
      media_id: r.get('media_id') as string,
      title: r.get('title') as string,
      media_type: r.get('media_type') as string | null,
      release_year: toNum(r.get('release_year')),
      creator: (r.get('creator') || r.get('director') || r.get('author')) as string | null,
      image_url: r.get('image_url') as string | null,
      wikidata_id: r.get('wikidata_id') as string | null,
      figureCount: toNum(r.get('figureCount')) || 0,
    }));

    const eras = erasResult.records.map(r => ({
      name: r.get('era') as string,
      figureCount: toNum(r.get('figureCount')) || 0,
    }));

    const statsRecord = statsResult.records[0];
    const stats = {
      figures: toNum(statsRecord.get('figureCount')) || 0,
      works: toNum(statsRecord.get('workCount')) || 0,
      portrayals: toNum(statsRecord.get('portrayalCount')) || 0,
    };

    return { figures, works, eras, stats };
  } catch (error) {
    console.error('Homepage data error:', error);
    return {
      figures: [] as { canonical_id: string; name: string; era: string | null; birth_year: number | null; death_year: number | null; image_url: string | null; historicity_status: string; portrayalCount: number }[],
      works: [] as { media_id: string; title: string; media_type: string | null; release_year: number | null; creator: string | null; image_url: string | null; wikidata_id: string | null; figureCount: number }[],
      eras: [] as { name: string; figureCount: number }[],
      stats: { figures: 0, works: 0, portrayals: 0 },
    };
  } finally {
    await session.close();
  }
}

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <section
        style={{
          padding: '80px 40px 60px',
          borderBottom: '1px solid var(--color-border)',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '56px',
            fontWeight: 300,
            lineHeight: 1.15,
            marginBottom: '16px',
          }}
        >
          Fictotum Archive
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            color: 'var(--color-gray)',
            fontStyle: 'italic',
            marginBottom: '32px',
            maxWidth: '600px',
          }}
        >
          How history becomes fiction. Explore {data.stats.portrayals.toLocaleString()} portrayals
          of {data.stats.figures.toLocaleString()} historical figures across{' '}
          {data.stats.works.toLocaleString()} media works.
        </p>

        <HomepageSearch />

        <Link
          href="/welcome"
          style={{
            display: 'inline-block',
            marginTop: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--color-accent)',
            textDecoration: 'none',
          }}
          className="hover:opacity-70 transition-opacity"
        >
          See how it works &rarr;
        </Link>
      </section>

      {/* ================================================================
          STATS BAR
          ================================================================ */}
      <div
        style={{
          display: 'flex',
          maxWidth: '1200px',
          margin: '0 auto',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {[
          { label: 'Figures', value: data.stats.figures },
          { label: 'Media Works', value: data.stats.works },
          { label: 'Portrayals', value: data.stats.portrayals },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              padding: '16px 40px',
              borderRight: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            <span style={{ color: 'var(--color-gray)' }}>{stat.label} </span>
            <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
              {stat.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* ================================================================
          MOST PORTRAYED FIGURES
          ================================================================ */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div className="fsg-section-header" style={{ flex: 1 }}>
            <span>Most Portrayed Figures</span>
            <span>({data.figures.length})</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
          }}
        >
          {data.figures.slice(0, 8).map((figure) => (
            <FigureCard
              key={figure.canonical_id}
              canonicalId={figure.canonical_id}
              name={figure.name}
              birthYear={figure.birth_year}
              deathYear={figure.death_year}
              era={figure.era || undefined}
              imageUrl={figure.image_url}
              portrayalCount={figure.portrayalCount}
              historicityStatus={
                (figure.historicity_status as 'Historical' | 'Fictional' | 'Disputed') || 'Historical'
              }
            />
          ))}
        </div>
      </section>

      {/* ================================================================
          BROWSE BY ERA
          ================================================================ */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px 0' }}>
        <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
          <span>Browse by Era</span>
          <Link
            href="/browse/eras"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textDecoration: 'none',
              color: 'var(--color-accent)',
            }}
            className="hover:opacity-70 transition-opacity"
          >
            View All
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '8px',
          }}
        >
          {data.eras.map((era) => (
            <Link
              key={era.name}
              href={`/search?era=${encodeURIComponent(era.name)}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '6px 14px',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                color: 'var(--color-text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              className="hover:border-[var(--color-border-bold)] hover:bg-[var(--color-section-bg)] transition-colors"
            >
              {era.name}
              <span style={{ color: 'var(--color-gray)', fontSize: '10px' }}>
                {era.figureCount}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ================================================================
          POPULAR WORKS
          ================================================================ */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px 0' }}>
        <div className="fsg-section-header" style={{ marginBottom: '24px' }}>
          <span>Popular Works</span>
          <span>({data.works.length})</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
          }}
        >
          {data.works.map((work) => (
            <WorkCard
              key={work.media_id}
              mediaId={work.media_id}
              title={work.title}
              releaseYear={work.release_year}
              mediaType={work.media_type || undefined}
              creator={work.creator || undefined}
              imageUrl={work.image_url}
              wikidataId={work.wikidata_id || undefined}
            />
          ))}
        </div>
      </section>

      {/* ================================================================
          EXPLORE NAVIGATION
          ================================================================ */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '48px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
        }}
      >
        {[
          { label: 'Browse by Era', sub: 'Ancient to Modern', href: '/browse/eras' },
          { label: 'Browse by Location', sub: 'Places in History', href: '/browse/locations' },
          { label: 'Coverage Map', sub: 'Temporal Gaps', href: '/explore/coverage' },
          { label: 'Network Graph', sub: 'Visual Connections', href: '/explore/graph' },
        ].map((btn) => (
          <Link
            key={btn.label}
            href={btn.href}
            style={{
              padding: '24px',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: 'var(--color-text)',
              display: 'block',
            }}
            className="hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors"
          >
            {btn.label}
            <span
              style={{
                display: 'block',
                marginTop: '6px',
                fontFamily: 'var(--font-serif)',
                fontSize: '14px',
                color: 'var(--color-gray)',
                textTransform: 'none',
                fontStyle: 'italic',
              }}
            >
              {btn.sub}
            </span>
          </Link>
        ))}
      </section>

      {/* ================================================================
          DEPARTMENTS
          ================================================================ */}
      <section
        style={{
          padding: '60px 40px',
          background: 'var(--color-dept-bg)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
          }}
        >
          {[
            {
              title: 'Contribute',
              desc: 'Submit new portrayals or historical data to the archive.',
              href: '/contribute',
            },
            {
              title: 'Pathfinder',
              desc: 'Discover connections between any two historical figures.',
              href: '/explore/pathfinder',
            },
          ].map((dept) => (
            <Link
              key={dept.title}
              href={dept.href}
              style={{
                padding: '28px',
                border: '1px solid var(--color-border)',
                background: '#fff',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
              className="hover:border-[#1A1A1A] transition-colors"
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '12px',
                  display: 'block',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '8px',
                }}
              >
                {dept.title}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '18px',
                  color: 'var(--color-gray)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                {dept.desc}
              </p>
            </Link>
          ))}
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
