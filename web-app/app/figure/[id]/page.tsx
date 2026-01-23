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
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Link */}
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
            ← Back to Dashboard
          </Link>

          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500/30">
                  <User className="w-10 h-10 text-blue-400" />
                </div>
              </div>
              <div className="flex-grow">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h1 className="text-4xl font-bold text-white">{figure.name}</h1>
                  <HistoricityBadge status={figure.historicity_status} isFictional={figure.is_fictional} />
                </div>
                {figure.era && (
                  <p className="text-lg text-gray-300 mb-4">{figure.era}</p>
                )}
                <div className="flex gap-4 text-sm text-gray-400">
                  <div>
                    <span className="font-semibold">{figure.portrayals.length}</span> media appearances
                  </div>
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
            {/* Stats Card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
                  <span className="text-gray-400">Total Portrayals</span>
                  <span className="text-xl font-bold text-white">{figure.portrayals.length}</span>
                </div>
                {figure.portrayals.length > 0 && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
                      <span className="text-gray-400">Earliest Appearance</span>
                      <span className="text-white font-semibold">
                        {Math.min(...figure.portrayals.map(p => Number(p.media.release_year)))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
                      <span className="text-gray-400">Latest Appearance</span>
                      <span className="text-white font-semibold">
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
