'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, Plus, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';

interface WikidataWork {
  qid: string;
  title: string;
  year: number | null;
  type: string;
}

export default function CreatorContent() {
  const searchParams = useSearchParams();
  const creatorFromUrl = searchParams.get('name');

  const [creatorName, setCreatorName] = useState(creatorFromUrl || '');
  const [works, setWorks] = useState<WikidataWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'network' | 'no-results' | 'invalid' | null>(null);
  const [addedWorks, setAddedWorks] = useState<Set<string>>(new Set());
  const [existingWorks, setExistingWorks] = useState<Set<string>>(new Set());
  const [addingProgress, setAddingProgress] = useState<{total: number; current: number} | null>(null);

  useEffect(() => {
    if (creatorFromUrl) {
      handleSearch(creatorFromUrl);
    }
  }, [creatorFromUrl]);

  const handleSearch = async (name: string) => {
    if (!name || name.length < 2) {
      setError('Please enter a creator name (at least 2 characters)');
      setErrorType('invalid');
      return;
    }

    setLoading(true);
    setError(null);
    setErrorType(null);
    setWorks([]);
    setExistingWorks(new Set());
    setAddedWorks(new Set());

    try {
      // Fetch works from Wikidata
      const response = await fetch(`/api/wikidata/by-creator?name=${encodeURIComponent(name)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch works');
      }

      const fetchedWorks = data.works || [];
      setWorks(fetchedWorks);

      if (fetchedWorks.length === 0) {
        setError(`No works found for "${name}" in Wikidata.`);
        setErrorType('no-results');
        return;
      }

      // Check which works already exist in the database
      const checkResponse = await fetch('/api/media/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wikidataIds: fetchedWorks.map((w: WikidataWork) => w.qid),
        }),
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        const existing = new Set<string>();

        Object.entries(checkData.existingWorks).forEach(([qid, info]: [string, any]) => {
          if (info.exists) {
            existing.add(qid);
          }
        });

        setExistingWorks(existing);
      }
    } catch (err: any) {
      setError(err.message || 'Network error while fetching works from Wikidata');
      setErrorType('network');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async () => {
    const worksToAdd = works.filter(w => !existingWorks.has(w.qid) && !addedWorks.has(w.qid));
    if (worksToAdd.length === 0) return;

    if (!confirm(`Add ${worksToAdd.length} work(s) to ChronosGraph?`)) {
      return;
    }

    setAddingProgress({ total: worksToAdd.length, current: 0 });

    for (let i = 0; i < worksToAdd.length; i++) {
      await handleAddWork(worksToAdd[i]);
      setAddingProgress({ total: worksToAdd.length, current: i + 1 });
    }

    setAddingProgress(null);
  };

  const handleAddWork = async (work: WikidataWork) => {
    try {
      // Map Wikidata types to ChronosGraph media types
      const mediaTypeMap: Record<string, string> = {
        'film': 'FILM',
        'television series': 'TV_SERIES',
        'video game': 'GAME',
        'book': 'BOOK',
        'literary work': 'BOOK',
        'video game franchise': 'GAME_SERIES',
      };

      const mediaType = mediaTypeMap[work.type.toLowerCase()] || 'FILM';

      const response = await fetch('/api/media/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: work.title,
          mediaType,
          releaseYear: work.year,
          creator: creatorName,
          wikidataId: work.qid,
        }),
      });

      if (response.ok) {
        setAddedWorks(prev => new Set(prev).add(work.qid));
      } else {
        const data = await response.json();
        if (data.existingMedia) {
          // Already exists, mark as added
          setAddedWorks(prev => new Set(prev).add(work.qid));
        } else {
          alert(`Failed to add "${work.title}": ${data.error || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      alert(`Failed to add "${work.title}": ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-brand-primary">Add Works by Creator</h1>
          <p className="text-brand-text/70">
            Search for a creator (director, author, etc.) and bulk-import their works from Wikidata.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white p-6 rounded-lg border border-brand-primary/20 mb-6 shadow-sm">
          <div className="flex gap-3">
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(creatorName)}
              placeholder="e.g., Ridley Scott, J.K. Rowling, Hideo Kojima, Hilary Mantel"
              className="flex-1 bg-white border border-brand-primary/30 rounded-md py-2 px-4 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button
              onClick={() => handleSearch(creatorName)}
              disabled={loading}
              className="px-6 py-2 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-primary/30 text-white font-semibold rounded-md flex items-center gap-2 transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Wikidata
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-brand-accent/10 border border-brand-accent/30 rounded-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-brand-accent font-medium">{error}</p>
                  {errorType === 'network' && (
                    <div className="mt-2">
                      <button
                        onClick={() => handleSearch(creatorName)}
                        className="text-sm text-brand-accent hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    </div>
                  )}
                  {errorType === 'no-results' && (
                    <div className="mt-2 text-xs text-brand-accent/80">
                      <strong>Suggestions:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Check spelling of the creator's name</li>
                        <li>Try the creator's full name or alternate spellings</li>
                        <li>Ensure the creator has works in Wikidata</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {works.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-brand-primary/20 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-brand-primary">
                Found {works.length} works by {creatorName}
              </h2>
              {works.filter(w => !existingWorks.has(w.qid) && !addedWorks.has(w.qid)).length > 0 && (
                <button
                  onClick={handleBulkAdd}
                  disabled={addingProgress !== null}
                  className="px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-primary/30 text-white font-medium rounded-md text-sm flex items-center gap-2"
                >
                  {addingProgress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding {addingProgress.current} of {addingProgress.total}...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add All ({works.filter(w => !existingWorks.has(w.qid) && !addedWorks.has(w.qid)).length})
                    </>
                  )}
                </button>
              )}
            </div>

            {addingProgress && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding works: {addingProgress.current} of {addingProgress.total} complete
                </div>
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(addingProgress.current / addingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {works.map((work) => {
                const isExisting = existingWorks.has(work.qid);
                const isAdded = addedWorks.has(work.qid);
                const isDisabled = isExisting || isAdded;

                return (
                  <div
                    key={work.qid}
                    className="flex items-center justify-between p-4 bg-brand-bg border border-brand-primary/20 rounded-md hover:border-brand-primary/40 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-brand-text">
                        {work.title}
                        {work.year && <span className="text-brand-text/60 ml-2">({work.year})</span>}
                      </h3>
                      <p className="text-sm text-brand-text/60 mt-1">
                        {work.type} • Wikidata: {work.qid}
                      </p>
                    </div>

                    {isExisting ? (
                      <a
                        href={`/media/${work.qid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors shadow-sm bg-brand-primary/10 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/20"
                      >
                        View in Graph
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleAddWork(work)}
                        disabled={isAdded || (addingProgress !== null)}
                        className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors shadow-sm ${
                          isAdded
                            ? 'bg-green-600/10 text-green-700 border border-green-600/30 cursor-not-allowed'
                            : 'bg-brand-accent hover:bg-brand-accent/90 text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>✓ Added</>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add to Graph
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
