'use client';

import React, { useEffect, useState } from 'react';
import { PenTool, Loader2 } from 'lucide-react';

interface SentimentData {
  sentiment: string;
  count: number;
  sampleFigures: string[];
}

interface SentimentSignatureProps {
  creatorName: string;
}

const SENTIMENT_COLORS: Record<string, string> = {
  Heroic: '#2D7D46',
  Complex: '#B8860B',
  Villainous: '#8B0000',
  Sympathetic: '#4682B4',
  Tragic: '#6A5ACD',
  Neutral: '#8B7355',
  Comedic: '#D4A017',
};

function getSentimentColor(sentiment: string): string {
  for (const [key, color] of Object.entries(SENTIMENT_COLORS)) {
    if (sentiment.toLowerCase().includes(key.toLowerCase())) return color;
  }
  // Deterministic hash for unknown sentiments
  let hash = 0;
  for (let i = 0; i < sentiment.length; i++) {
    hash = sentiment.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 30%, 42%)`;
}

export default function SentimentSignature({
  creatorName
}: SentimentSignatureProps) {
  const [sentiments, setSentiments] = useState<SentimentData[]>([]);
  const [total, setTotal] = useState(0);
  const [withSentiment, setWithSentiment] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const response = await fetch(`/api/creator/sentiment-signature?creator=${encodeURIComponent(creatorName)}`);
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setSentiments(data.sentiments || []);
            setTotal(data.total || 0);
            setWithSentiment(data.withSentiment || 0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sentiment signature:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [creatorName]);

  if (loading) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Sentiment Signature
        </h2>
        <div className="bg-white border-2 border-stone-300 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (sentiments.length === 0) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Sentiment Signature
        </h2>
        <div className="bg-white border-2 border-stone-300 p-6 text-center">
          <PenTool className="w-12 h-12 text-stone-400 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-stone-600">
            No sentiment data available for this creator
          </p>
        </div>
      </div>
    );
  }

  const dominant = sentiments[0];

  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Sentiment Signature
      </h2>

      <div className="bg-white border-2 border-stone-300 p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">
          Portrayal Tone Distribution
        </div>

        {/* Stacked bar */}
        <div className="h-6 flex mb-4 border border-stone-300">
          {sentiments.map((s) => {
            const pct = withSentiment > 0 ? (s.count / withSentiment) * 100 : 0;
            if (pct < 1) return null;
            return (
              <div
                key={s.sentiment}
                title={`${s.sentiment}: ${s.count} (${Math.round(pct)}%)`}
                style={{
                  width: `${pct}%`,
                  backgroundColor: getSentimentColor(s.sentiment),
                  minWidth: pct > 0 ? '2px' : '0',
                }}
              />
            );
          })}
        </div>

        {/* Sentiment breakdown */}
        <div className="space-y-3 mb-6">
          {sentiments.map((s) => {
            const pct = withSentiment > 0 ? (s.count / withSentiment) * 100 : 0;
            const color = getSentimentColor(s.sentiment);

            return (
              <div key={s.sentiment}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold text-stone-900 uppercase tracking-tight text-sm">
                      {s.sentiment}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-stone-500">
                    {s.count} ({Math.round(pct)}%)
                  </span>
                </div>

                {s.sampleFigures.length > 0 && (
                  <div className="ml-5 text-xs text-stone-500 font-mono truncate">
                    {s.sampleFigures.slice(0, 3).join(', ')}
                    {s.sampleFigures.length > 3 && ` +${s.sampleFigures.length - 3} more`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="border-t-2 border-stone-200 pt-4">
          <div className="bg-stone-100 border-2 border-stone-300 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">
                Dominant Tone
              </div>
              <div
                className="text-lg font-black font-mono uppercase"
                style={{ color: getSentimentColor(dominant.sentiment) }}
              >
                {dominant.sentiment}
              </div>
            </div>
            <div className="text-xs text-stone-600 mt-2 font-mono">
              {withSentiment} of {total} portrayals have sentiment data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
