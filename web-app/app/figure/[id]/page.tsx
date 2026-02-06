import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFigureById, calculateSentimentDistribution } from '@/lib/db';
import ConflictRadar from '@/components/ConflictRadar';
import MediaTimeline from '@/components/MediaTimeline';
import GraphExplorer from '@/components/GraphExplorer';
import HistoricityBadge from '@/components/HistoricityBadge';
import AddAppearanceForm from '@/components/AddAppearanceForm';
import ExploreGraphButton from '@/components/ExploreGraphButton';
import SentimentTrendChart from '@/components/SentimentTrendChart';
import CulturalImpactScore from '@/components/CulturalImpactScore';
import ReputationVolatilityIndex from '@/components/ReputationVolatilityIndex';
import CharacterProfileMatrix from '@/components/CharacterProfileMatrix';
import { User, FileText } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-stone-100 text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Link */}
          <Link href="/" className="text-amber-600 hover:text-amber-700 mb-6 inline-block font-mono text-sm uppercase tracking-wide font-bold">
            ← Back to Dashboard
          </Link>

          {/* Header - CLASSIFIED DOSSIER */}
          <div className="bg-white border-t-8 border-amber-600 shadow-2xl p-8 mb-8 relative overflow-hidden">
            {/* Classification Banner */}
            <div className="absolute top-0 left-0 right-0 bg-amber-600 text-white text-center py-1">
              <div className="text-[10px] font-black uppercase tracking-[0.4em]">
                CLASSIFIED DOSSIER
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                <FileText className="w-3 h-3" />
                Subject File // {figure.canonical_id}
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-amber-50 border-4 border-amber-600 flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 text-amber-600" />
                  </div>
                  {/* Security Stamp */}
                  <div className="mt-2 text-center">
                    <div className="inline-block px-2 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase tracking-wider transform -rotate-12">
                      EVIDENCE
                    </div>
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h1 className="text-4xl md:text-6xl font-bold text-stone-900 tracking-tighter uppercase leading-none">{figure.name}</h1>
                    <HistoricityBadge status={figure.historicity_status} isFictional={figure.is_fictional} />
                  </div>
                  {figure.era && (
                    <p className="text-lg text-stone-600 mb-4 font-mono">{figure.era}</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-amber-50 border-amber-600 text-amber-900">
                      Portrayals: {figure.portrayals.length}
                    </span>

                    {/* Explore in Graph Button - Client Component for interactivity */}
                    <ExploreGraphButton />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Graph Explorer - Priority visualization */}
          <div id="graph-explorer-section" className="mb-8 scroll-mt-8">
            <GraphExplorer canonicalId={id} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Stats Card - Source Verification */}
            <div className="bg-stone-100 border-2 border-stone-200 p-6">
              <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-amber-600">■</span> Source Verification
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white border-2 border-stone-300">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest font-black">Total Portrayals</span>
                  <span className="text-2xl font-bold text-amber-600 font-mono">{figure.portrayals.length}</span>
                </div>
                {figure.portrayals.length > 0 && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-white border-2 border-stone-300">
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-black">Earliest Appearance</span>
                      <span className="text-xl font-bold text-stone-900 font-mono">
                        {Math.min(...figure.portrayals.map(p => Number(p.media.release_year)))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white border-2 border-stone-300">
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-black">Latest Appearance</span>
                      <span className="text-xl font-bold text-stone-900 font-mono">
                        {Math.max(...figure.portrayals.map(p => Number(p.media.release_year)))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Conflict Radar */}
            <ConflictRadar distribution={sentimentDistribution} />
          </div>

          {/* Sentiment Timeline - Full Width */}
          <div className="mb-8">
            <SentimentTrendChart portrayals={figure.portrayals} />
          </div>

          {/* Advanced Analytics Section - Detective Case File Features */}
          <div className="mb-8">
            <div className="bg-amber-600 text-white px-4 py-2 mb-0">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
                <span>■</span> Advanced Case Analysis
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-stone-50 border-2 border-amber-600 border-t-0 p-6">
              <CulturalImpactScore
                portrayalCount={figure.portrayals.length}
                mediaTypes={figure.portrayals.length > 0 ? Array.from(new Set(figure.portrayals.map(p => p.media.media_type).filter(Boolean))) as string[] : []}
                firstAppearance={figure.portrayals.length > 0 ? Math.min(...figure.portrayals.map(p => Number(p.media.release_year))) : new Date().getFullYear()}
                mostRecentAppearance={figure.portrayals.length > 0 ? Math.max(...figure.portrayals.map(p => Number(p.media.release_year))) : new Date().getFullYear()}
              />
              <ReputationVolatilityIndex
                canonicalId={figure.canonical_id}
                figureName={figure.name}
              />
              <CharacterProfileMatrix
                canonicalId={figure.canonical_id}
                figureName={figure.name}
              />
            </div>
          </div>

          {/* Contribution Form */}
          <div className="mb-8">
            <AddAppearanceForm figureId={figure.canonical_id} />
          </div>

          {/* Media Timeline */}
          <MediaTimeline portrayals={figure.portrayals} />
        </div>
      </div>
    </div>
  );
}
