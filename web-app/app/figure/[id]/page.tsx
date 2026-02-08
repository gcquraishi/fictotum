import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFigureById, calculateSentimentDistribution } from '@/lib/db';

export default async function FigurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const figure = await getFigureById(id);

  if (!figure) {
    notFound();
  }

  const sentimentDistribution = calculateSentimentDistribution(figure.portrayals);

  // Sort portrayals by release year for timeline
  const sortedPortrayals = [...figure.portrayals].sort(
    (a, b) => Number(a.media.release_year) - Number(b.media.release_year)
  );

  const earliestYear = sortedPortrayals.length > 0 ? Number(sortedPortrayals[0].media.release_year) : null;
  const latestYear = sortedPortrayals.length > 0 ? Number(sortedPortrayals[sortedPortrayals.length - 1].media.release_year) : null;

  // Determine primary medium
  const mediaTypeCounts: Record<string, number> = {};
  figure.portrayals.forEach(p => {
    const type = p.media.media_type || 'Unknown';
    mediaTypeCounts[type] = (mediaTypeCounts[type] || 0) + 1;
  });
  const primaryMedium = Object.entries(mediaTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Breadcrumb Header */}
      <div
        style={{
          padding: '20px 40px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            color: 'var(--color-text)',
          }}
          className="hover:opacity-70 transition-opacity"
        >
          Fictotum Archive
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-gray)',
            textTransform: 'uppercase',
          }}
        >
          Index / Historical Figures / {figure.canonical_id}
        </span>
      </div>

      {/* Split Container */}
      <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 65px)' }}>
        {/* LEFT PANE: Visual Timeline */}
        <div
          style={{
            width: '50%',
            background: '#fafafa',
            borderRight: '1px solid var(--color-border)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* View Controls */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 20,
              display: 'flex',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                padding: '6px 12px',
                border: '1px solid var(--color-border-bold)',
                background: 'var(--color-text)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Chronology
            </span>
            <Link
              href={`/explore/graph`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                padding: '6px 12px',
                border: '1px solid var(--color-border-bold)',
                background: '#fff',
                color: 'var(--color-text)',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Network Graph
            </Link>
          </div>

          {/* Timeline Visualization */}
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              padding: '40px 60px',
            }}
          >
            {/* Vertical Axis */}
            <div
              style={{
                position: 'absolute',
                top: '60px',
                bottom: '60px',
                left: '60px',
                width: '2px',
                background: 'var(--color-border)',
              }}
            />

            {/* Timeline Nodes */}
            {sortedPortrayals.map((portrayal, index) => {
              const totalNodes = sortedPortrayals.length;
              const topPercent = totalNodes > 1
                ? 10 + (index / (totalNodes - 1)) * 70
                : 40;

              // Determine sentiment color
              let nodeColor = 'var(--color-text)';
              if (portrayal.sentiment === 'Heroic') nodeColor = '#D4AF37';
              else if (portrayal.sentiment === 'Villainous') nodeColor = 'var(--color-accent)';

              return (
                <div
                  key={`${portrayal.media.title}-${portrayal.media.release_year}`}
                  style={{
                    position: 'absolute',
                    top: `${topPercent}%`,
                    left: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  className="group"
                >
                  {/* Connector Line */}
                  <div
                    style={{
                      height: '1px',
                      width: '30px',
                      background: 'var(--color-border)',
                      marginRight: '10px',
                    }}
                  />

                  {/* Node Circle */}
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: nodeColor,
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}
                  />

                  {/* Label */}
                  <span
                    style={{
                      marginLeft: '10px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-gray)',
                      opacity: 0.7,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {portrayal.media.release_year}: {portrayal.media.title}
                  </span>
                </div>
              );
            })}

            {/* Legend */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '80px',
                width: '200px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-gray)',
                lineHeight: 1.4,
              }}
            >
              <div>&uarr; OLDEST</div>
              <div>&darr; NEWEST</div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Content (Dossier Style) */}
        <div
          style={{
            width: '50%',
            padding: '60px',
            overflowY: 'auto',
            background: '#fff',
          }}
        >
          {/* Document Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '40px',
              borderBottom: '2px solid var(--color-border-bold)',
              paddingBottom: '24px',
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '64px',
                  fontWeight: 300,
                  lineHeight: 1,
                  marginBottom: '8px',
                }}
              >
                {figure.name}
              </h1>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  color: 'var(--color-accent)',
                }}
              >
                {figure.era || 'Historical Figure'}
              </span>
            </div>

            {/* Canonical Badge */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                border: '1px solid var(--color-gray)',
                padding: '4px 8px',
                color: 'var(--color-gray)',
                whiteSpace: 'nowrap',
              }}
            >
              Verified {figure.canonical_id}
            </span>
          </div>

          {/* Biographical Summary */}
          <div className="fsg-section-header" style={{ marginTop: '0' }}>
            <span>Biographical Summary</span>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              lineHeight: 1.7,
              color: 'var(--color-text)',
              marginBottom: '24px',
              textAlign: 'justify',
              marginTop: '20px',
            }}
          >
            {figure.name} is documented in the Fictotum archive with{' '}
            {figure.portrayals.length} recorded media portrayal{figure.portrayals.length !== 1 ? 's' : ''}.
            {figure.era && ` Active during the ${figure.era} era.`}
            {earliestYear && latestYear && earliestYear !== latestYear
              ? ` Portrayals span from ${earliestYear} to ${latestYear}.`
              : earliestYear
              ? ` First recorded portrayal in ${earliestYear}.`
              : ''}
          </p>

          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '30px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
            }}
          >
            <div className="fsg-meta-row">
              <span style={{ color: 'var(--color-gray)' }}>Total Portrayals</span>
              <span>{figure.portrayals.length}</span>
            </div>
            <div className="fsg-meta-row">
              <span style={{ color: 'var(--color-gray)' }}>First Appearance</span>
              <span>{earliestYear || 'N/A'}</span>
            </div>
            <div className="fsg-meta-row">
              <span style={{ color: 'var(--color-gray)' }}>Most Recent</span>
              <span>{latestYear || 'N/A'}</span>
            </div>
            <div className="fsg-meta-row">
              <span style={{ color: 'var(--color-gray)' }}>Primary Medium</span>
              <span>{primaryMedium}</span>
            </div>
          </div>

          {/* Documented Appearances */}
          <div className="fsg-section-header">
            <span>Documented Appearances</span>
            <span>({figure.portrayals.length} Records)</span>
          </div>

          <ul style={{ listStyle: 'none', marginTop: '20px' }}>
            {sortedPortrayals.map((portrayal, idx) => (
              <li
                key={`${portrayal.media.title}-${idx}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  padding: '20px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    color: 'var(--color-accent)',
                    fontWeight: 500,
                  }}
                >
                  {portrayal.media.release_year}
                </span>
                <div>
                  <h4
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '18px',
                      fontWeight: 400,
                      fontStyle: 'italic',
                      marginBottom: '4px',
                    }}
                  >
                    {portrayal.media.title}
                  </h4>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: 'var(--color-gray)',
                      marginBottom: '8px',
                      display: 'block',
                    }}
                  >
                    {portrayal.media.media_type || 'Media'} / Sentiment: {portrayal.sentiment}
                  </span>
                  {portrayal.sentiment_tags && portrayal.sentiment_tags.length > 0 && (
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '14px',
                        color: '#444',
                        lineHeight: 1.4,
                      }}
                    >
                      Tags: {portrayal.sentiment_tags.join(', ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Network Analysis */}
          <div className="fsg-section-header">
            <span>Network Analysis</span>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'var(--color-text)',
              marginTop: '20px',
              marginBottom: '40px',
            }}
          >
            {figure.name} connects to multiple other historical figures within the database.
            The portrayal history is characterized by{' '}
            {sentimentDistribution.Heroic > sentimentDistribution.Villainous
              ? 'predominantly heroic'
              : sentimentDistribution.Villainous > sentimentDistribution.Heroic
              ? 'predominantly villainous'
              : 'complex and nuanced'}{' '}
            representations across {Object.keys(mediaTypeCounts).length} media type{Object.keys(mediaTypeCounts).length !== 1 ? 's' : ''}.
          </p>

          {/* Explore Full Graph CTA */}
          <Link
            href={`/explore/graph`}
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '12px 24px',
              background: 'var(--color-text)',
              color: '#fff',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            className="hover:opacity-80"
          >
            Explore Full Network Graph
          </Link>
        </div>
      </div>
    </div>
  );
}
