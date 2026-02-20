export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { UserCircle, BookOpen, TrendingUp } from 'lucide-react';
import TemporalObsessionMap from '@/components/TemporalObsessionMap';
import CastRepertoryCompany from '@/components/CastRepertoryCompany';
import SentimentSignature from '@/components/SentimentSignature';

interface CreatorWork {
  wikidata_id: string;
  title: string;
  release_year: number;
  media_type: string;
  portrayal_count: number;
}

interface CreatorProfile {
  name: string;
  works: CreatorWork[];
  total_portrayals: number;
  unique_figures: number;
  media_types: string[];
  first_work_year: number;
  latest_work_year: number;
}

async function getCreatorProfile(name: string): Promise<CreatorProfile | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/creator/${encodeURIComponent(name)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching creator profile:', error);
    return null;
  }
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const creator = await getCreatorProfile(decodedName);

  if (!creator) {
    notFound();
  }

  const timespan = creator.latest_work_year - creator.first_work_year;

  return (
    <div className="min-h-screen bg-stone-100 text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Link */}
          <Link
            href="/"
            className="text-amber-600 hover:text-amber-700 mb-6 inline-block font-mono text-sm uppercase tracking-wide font-bold"
          >
            ← Back to Dashboard
          </Link>

          {/* Header - HISTORIOGRAPHER ARCHIVE */}
          <div className="bg-white border-t-8 border-amber-600 shadow-2xl p-8 mb-8 relative overflow-hidden">
            {/* Classification Banner */}
            <div className="absolute top-0 left-0 right-0 bg-amber-600 text-white text-center py-1">
              <div className="text-[10px] font-black uppercase tracking-[0.4em]">
                HISTORIOGRAPHER ARCHIVE
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Creator Profile // Active Research
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-amber-50 border-4 border-amber-600 flex items-center justify-center shadow-lg">
                    <UserCircle className="w-12 h-12 text-amber-600" />
                  </div>
                  {/* Research Stamp */}
                  <div className="mt-2 text-center">
                    <div className="inline-block px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider transform rotate-12">
                      RESEARCHER
                    </div>
                  </div>
                </div>
                <div className="flex-grow">
                  <h1 className="text-4xl md:text-6xl font-bold text-stone-900 tracking-tighter uppercase mb-4 leading-none">
                    {creator.name}
                  </h1>
                  <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-amber-50 border-amber-600 text-amber-900">
                      Works: {creator.works.length}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-green-50 border-green-600 text-green-900">
                      Figures: {creator.unique_figures}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-blue-50 border-blue-600 text-blue-900">
                      Portrayals: {creator.total_portrayals}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-purple-50 border-purple-600 text-purple-900">
                      Span: {timespan} years
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historiographical Analysis Section */}
          <div className="mb-8">
            <div className="bg-amber-600 text-white px-4 py-2 mb-0">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
                <span>■</span> Historiographical Analysis
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-stone-50 border-2 border-amber-600 border-t-0 p-6">
              <TemporalObsessionMap creatorName={creator.name} />
              <CastRepertoryCompany creatorName={creator.name} />
              <SentimentSignature creatorName={creator.name} />
            </div>
          </div>

          {/* Works Catalog */}
          <div className="bg-stone-100 border-2 border-stone-200 p-6 mb-8">
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="text-amber-600">■</span> Works Catalog
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creator.works
                .sort((a, b) => b.release_year - a.release_year)
                .map((work) => (
                  <Link
                    key={work.wikidata_id}
                    href={`/media/${work.wikidata_id}`}
                    className="block bg-white border-2 border-stone-300 hover:border-amber-600 transition-all p-4"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <BookOpen className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                      <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-stone-900 uppercase text-sm leading-tight mb-1">
                          {work.title}
                        </h3>
                        <p className="text-xs text-stone-500 font-mono">
                          {work.release_year} · {work.media_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-200">
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                        Figures:
                      </span>
                      <span className="text-sm font-bold text-amber-600 font-mono">
                        {work.portrayal_count}
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
