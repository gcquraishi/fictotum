import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFigureById, calculateSentimentDistribution } from '@/lib/db';
import ConflictRadar from '@/components/ConflictRadar';
import MediaTimeline from '@/components/MediaTimeline';
import GraphExplorer from '@/components/GraphExplorer';
import HistoricityBadge from '@/components/HistoricityBadge';
import AddAppearanceForm from '@/components/AddAppearanceForm';
import { User } from 'lucide-react';

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

          {/* Header - Subject Dossier */}
          <div className="bg-white border-t-4 border-amber-600 shadow-xl p-8 mb-8">
            <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2">
              Subject Dossier // {figure.canonical_id}
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-amber-50 border-2 border-amber-600 flex items-center justify-center">
                  <User className="w-10 h-10 text-amber-600" />
                </div>
              </div>
              <div className="flex-grow">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h1 className="text-4xl md:text-6xl font-bold text-stone-900 tracking-tighter uppercase">{figure.name}</h1>
                  <HistoricityBadge status={figure.historicity_status} isFictional={figure.is_fictional} />
                </div>
                {figure.era && (
                  <p className="text-lg text-stone-600 mb-4">{figure.era}</p>
                )}
                <div className="flex gap-3">
                  <span className="inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-amber-50 border-amber-600 text-amber-900">
                    Portrayals: {figure.portrayals.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Graph Explorer - Priority visualization */}
          <div className="mb-8">
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
