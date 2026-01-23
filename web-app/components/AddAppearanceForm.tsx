// file: web-app/components/AddAppearanceForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Info, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import SentimentTagSelector from './SentimentTagSelector';

interface MediaSearchResult {
  media_id: string;
  wikidata_id?: string;
  title: string;
  year: number;
  media_type?: string;
}

export default function AddAppearanceForm({ figureId }: { figureId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);

  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState<MediaSearchResult[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaSearchResult | null>(null);

  const [showCreateMedia, setShowCreateMedia] = useState(false);
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaType, setNewMediaType] = useState('FILM');
  const [newMediaYear, setNewMediaYear] = useState('');
  const [newMediaCreator, setNewMediaCreator] = useState('');
  const [newMediaWikidataId, setNewMediaWikidataId] = useState('');

  const [sentimentTags, setSentimentTags] = useState<string[]>(['complex']); // Default to 'complex'
  const [roleDescription, setRoleDescription] = useState('');
  const [isProtagonist, setIsProtagonist] = useState(false);
  const [actorName, setActorName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreatingMedia, setIsCreatingMedia] = useState(false);
  const [showAdvancedSeries, setShowAdvancedSeries] = useState(false);

  // Series support state
  const [parentSeriesQuery, setParentSeriesQuery] = useState('');
  const [parentSeriesResults, setParentSeriesResults] = useState<MediaSearchResult[]>([]);
  const [parentSeries, setParentSeries] = useState<MediaSearchResult | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState('');
  const [seasonNumber, setSeasonNumber] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [relationshipType, setRelationshipType] = useState('part');
  const [linkToParentSeries, setLinkToParentSeries] = useState(false);

  const handleMediaSearch = async (query: string) => {
    setMediaQuery(query);
    setSelectedMedia(null);
    if (query.length < 2) {
      setMediaResults([]);
      return;
    }
    const response = await fetch(`/api/media/search?q=${query}`);
    const data = await response.json();
    setMediaResults(data.works || []);
  };

  const handleParentSeriesSearch = async (query: string) => {
    setParentSeriesQuery(query);
    setParentSeries(null);
    if (query.length < 2) {
      setParentSeriesResults([]);
      return;
    }
    // Search only for series types
    const response = await fetch(`/api/media/search?q=${query}&type=BookSeries,FilmSeries,TVSeriesCollection,GameSeries,BoardGameSeries`);
    const data = await response.json();
    setParentSeriesResults(data.works || []);
  };

  const handleCreateMedia = async () => {
    setError(null);
    setSuccess(null);
    if (!newMediaTitle || !newMediaYear) {
      setError("Title and year are required for new media.");
      return;
    }

    setIsCreatingMedia(true);
    const response = await fetch('/api/media/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newMediaTitle,
        mediaType: newMediaType,
        releaseYear: parseInt(newMediaYear),
        creator: newMediaCreator || null,
        wikidataId: newMediaWikidataId || null,
        parentSeriesId: parentSeries?.media_id || parentSeries?.wikidata_id || null,
        sequenceNumber: sequenceNumber ? parseInt(sequenceNumber) : null,
        seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
        episodeNumber: episodeNumber ? parseInt(episodeNumber) : null,
        relationshipType: relationshipType || null,
        isMainSeries: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setSelectedMedia(data.media);
      setMediaQuery(data.media.title);
      setShowCreateMedia(false);
      setSuccess(`✓ Successfully created "${data.media.title}" (${data.media.year})`);
      // Reset create form
      setNewMediaTitle('');
      setNewMediaType('FILM');
      setNewMediaYear('');
      setNewMediaCreator('');
      setNewMediaWikidataId('');
      setParentSeries(null);
      setParentSeriesQuery('');
      setSequenceNumber('');
      setSeasonNumber('');
      setEpisodeNumber('');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } else {
      const data = await response.json();
      // If media already exists, automatically select it
      if (data.existingMedia) {
        setSelectedMedia(data.existingMedia);
        setMediaQuery(data.existingMedia.title);
        setShowCreateMedia(false);
        setSuccess(`✓ Found existing work: "${data.existingMedia.title}" (${data.existingMedia.year}). It has been selected.`);
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || "Failed to create media work.");
      }
    }
    setIsCreatingMedia(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedMedia) {
        setError("Please search for and select a media work.");
        return;
    }

    // Accept either media_id or wikidata_id
    const mediaIdentifier = selectedMedia.media_id || selectedMedia.wikidata_id;
    if (!mediaIdentifier) {
        setError("Selected media is missing ID. Please try selecting again.");
        console.error("Selected media object:", selectedMedia);
        return;
    }

    if (!figureId) {
        setError("Figure ID is missing. Please refresh the page.");
        console.error("Missing figureId prop");
        return;
    }

    // Validate sentiment tags
    if (!sentimentTags || sentimentTags.length === 0) {
        setError("At least 1 sentiment tag is required.");
        return;
    }

    if (sentimentTags.length > 5) {
        setError("Maximum 5 sentiment tags allowed.");
        return;
    }

    startTransition(async () => {
        const payload = {
            figureId,
            mediaId: mediaIdentifier, // Use either media_id or wikidata_id
            sentimentTags, // New: array of tags
            roleDescription,
            isProtagonist,
            actorName: actorName || null,
        };

        console.log("Submitting appearance:", payload);

        const response = await fetch('/api/contribution/appearance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            // Show success message
            setSuccess(`✓ Appearance added successfully! "${selectedMedia.title}" (${selectedMedia.year})`);
            // Clear form
            setSelectedMedia(null);
            setMediaQuery('');
            setMediaResults([]);
            setSentimentTags(['complex']);
            setRoleDescription('');
            setIsProtagonist(false);
            setActorName('');
            // Clear success message after 5 seconds
            setTimeout(() => {
                setSuccess(null);
                router.refresh();
            }, 5000);
        } else {
            const data = await response.json();
            setError(data.error || "Failed to add appearance.");
        }
    });
  };

  if (!session) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg text-center text-gray-400">
        You must be signed in to contribute.
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      {/* Collapsible Header Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-700/50 transition-colors rounded-lg"
      >
        <h3 className="text-xl font-semibold text-white">Add Media Appearance</h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Collapsible Form Content */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 border-t border-gray-700 pt-4">

      <div>
        <label htmlFor="media-search" className="block text-sm font-medium text-gray-300">Search for Media Work</label>
        <input
          id="media-search"
          type="text"
          value={mediaQuery}
          onChange={(e) => handleMediaSearch(e.target.value)}
          className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white"
          placeholder="e.g., The Tudors"
          disabled={showCreateMedia}
        />
        {mediaResults.length > 0 && !selectedMedia && !showCreateMedia && (
            <ul className="bg-gray-900 border border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto">
                {mediaResults.map(work => (
                    <li key={work.media_id} onClick={() => { setSelectedMedia(work); setMediaQuery(work.title); setMediaResults([]); }}
                        className="px-3 py-2 hover:bg-blue-600 cursor-pointer">
                        {work.title} ({work.year})
                    </li>
                ))}
            </ul>
        )}
        {selectedMedia && !showCreateMedia && (
          <>
            <div className="mt-2 text-sm text-green-400">
              ✓ Selected: {selectedMedia.title} ({selectedMedia.year})
            </div>
            {/* TODO: Add checkbox to link to parent series if selected media has one */}
          </>
        )}
      </div>

      {!selectedMedia && !showCreateMedia && (
        <button
          type="button"
          onClick={() => setShowCreateMedia(true)}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Media Work
        </button>
      )}

      {showCreateMedia && (
        <div className="space-y-3 p-4 bg-gray-900 border-2 border-blue-500/30 rounded-lg shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
            <h4 className="font-semibold text-base text-blue-400">Create New Media Work</h4>
            <button
              type="button"
              onClick={() => setShowCreateMedia(false)}
              className="text-gray-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          <div>
            <label htmlFor="new-title" className="block text-xs font-medium text-gray-400">Title *</label>
            <input
              id="new-title"
              type="text"
              value={newMediaTitle}
              onChange={e => setNewMediaTitle(e.target.value)}
              className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white text-sm"
              placeholder="e.g., The Crown"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-type" className="block text-xs font-medium text-gray-400">Type *</label>
              <select
                id="new-type"
                value={newMediaType}
                onChange={e => setNewMediaType(e.target.value)}
                className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white text-sm"
              >
                <option value="FILM">Film</option>
                <option value="TV_SERIES">TV Series</option>
                <option value="BOOK">Book</option>
                <option value="GAME">Game</option>
                <option value="BOOK_SERIES">Book Series</option>
                <option value="FILM_SERIES">Film Series</option>
                <option value="TV_SERIES_COLLECTION">TV Series Collection</option>
                <option value="GAME_SERIES">Game Series</option>
                <option value="BOARD_GAME_SERIES">Board Game Series</option>
              </select>
            </div>

            <div>
              <label htmlFor="new-year" className="block text-xs font-medium text-gray-400">Year *</label>
              <input
                id="new-year"
                type="number"
                value={newMediaYear}
                onChange={e => setNewMediaYear(e.target.value)}
                className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white text-sm"
                placeholder="2023"
              />
            </div>
          </div>

          <div>
            <label htmlFor="new-creator" className="block text-xs font-medium text-gray-400">Creator (optional)</label>
            <input
              id="new-creator"
              type="text"
              value={newMediaCreator}
              onChange={e => setNewMediaCreator(e.target.value)}
              className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white text-sm"
              placeholder="e.g., Peter Morgan"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="new-wikidata" className="block text-xs font-medium text-gray-400">Wikidata Q-ID (optional)</label>
              <div className="group relative">
                <Info className="w-3 h-3 text-gray-500 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-700 text-xs text-white rounded shadow-lg z-10">
                  Wikidata Q-IDs are unique identifiers (e.g., Q28842191 for "The Crown"). Leave blank to auto-search.
                </div>
              </div>
            </div>
            <input
              id="new-wikidata"
              type="text"
              value={newMediaWikidataId}
              onChange={e => setNewMediaWikidataId(e.target.value)}
              className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white text-sm"
              placeholder="e.g., Q28842191"
            />
          </div>

          {/* Advanced Series Options - collapsible */}
          {!['BOOK_SERIES', 'FILM_SERIES', 'TV_SERIES_COLLECTION', 'GAME_SERIES', 'BOARD_GAME_SERIES'].includes(newMediaType) && (
            <div className="border-t border-gray-700 pt-3">
              <button
                type="button"
                onClick={() => setShowAdvancedSeries(!showAdvancedSeries)}
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 mb-2"
              >
                <span>{showAdvancedSeries ? '▼' : '▶'}</span>
                Advanced: Link to Series
              </button>
              {showAdvancedSeries && (
                <div>
              <label htmlFor="parent-series-search" className="block text-xs font-medium text-gray-400">Part of Series (optional)</label>
              <input
                id="parent-series-search"
                type="text"
                value={parentSeriesQuery}
                onChange={(e) => handleParentSeriesSearch(e.target.value)}
                className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white text-sm"
                placeholder="Search for parent series..."
              />
              {parentSeriesResults.length > 0 && !parentSeries && (
                <ul className="bg-gray-700 border border-gray-500 rounded-md mt-1 max-h-40 overflow-y-auto">
                  {parentSeriesResults.map(work => (
                    <li
                      key={work.media_id}
                      onClick={() => {
                        setParentSeries(work);
                        setParentSeriesQuery(work.title);
                        setParentSeriesResults([]);
                      }}
                      className="px-3 py-2 hover:bg-blue-600 cursor-pointer text-sm"
                    >
                      {work.title} ({work.year}) - {work.media_type}
                    </li>
                  ))}
                </ul>
              )}
              {parentSeries && (
                <div className="mt-2 text-xs text-green-400">
                  ✓ Series: {parentSeries.title} ({parentSeries.year})
                </div>
              )}
            </div>
          )}

          {/* Sequence Metadata - only show when parent series is selected */}
          {showAdvancedSeries && parentSeries && (
            <div className="space-y-2 p-3 bg-gray-800 border-2 border-blue-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-semibold text-gray-300">Series Position</h5>
                <div className="group relative">
                  <Info className="w-3 h-3 text-gray-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-gray-700 text-xs text-white rounded shadow-lg z-10">
                    {newMediaType === 'TV_SERIES' || parentSeries.media_type?.includes('TV')
                      ? 'For TV episodes, use sequence # for overall order and season/episode for broadcast order.'
                      : 'Use sequence # for the position in the series (e.g., Book 2, Film 3).'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="sequence-number" className="block text-xs font-medium text-gray-400">Sequence #</label>
                  <input
                    id="sequence-number"
                    type="number"
                    value={sequenceNumber}
                    onChange={e => setSequenceNumber(e.target.value)}
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white text-sm"
                    placeholder="1, 2, 3..."
                  />
                </div>

                <div>
                  <label htmlFor="relationship-type" className="block text-xs font-medium text-gray-400">Type</label>
                  <select
                    id="relationship-type"
                    value={relationshipType}
                    onChange={e => setRelationshipType(e.target.value)}
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white text-sm"
                  >
                    <option value="part">Part</option>
                    <option value="sequel">Sequel</option>
                    <option value="prequel">Prequel</option>
                    <option value="expansion">Expansion</option>
                    <option value="episode">Episode</option>
                    <option value="season">Season</option>
                  </select>
                </div>
              </div>

              {/* Season/Episode for TV series */}
              {(newMediaType === 'TV_SERIES' || parentSeries.media_type?.includes('TV')) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="season-number" className="block text-xs font-medium text-gray-400">Season #</label>
                    <input
                      id="season-number"
                      type="number"
                      value={seasonNumber}
                      onChange={e => setSeasonNumber(e.target.value)}
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white text-sm"
                      placeholder="1, 2, 3..."
                    />
                  </div>

                  <div>
                    <label htmlFor="episode-number" className="block text-xs font-medium text-gray-400">Episode #</label>
                    <input
                      id="episode-number"
                      type="number"
                      value={episodeNumber}
                      onChange={e => setEpisodeNumber(e.target.value)}
                      className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-white text-sm"
                      placeholder="1, 2, 3..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateMedia}
              disabled={isCreatingMedia}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isCreatingMedia ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Media'
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateMedia(false)}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sentiment Tags Selector */}
      <div>
        <SentimentTagSelector
          value={sentimentTags}
          onChange={setSentimentTags}
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-300">
          {selectedMedia
            ? `Add notes on the figure's portrayal in "${selectedMedia.title}" (optional)`
            : "Add notes on the figure's portrayal (optional)"}
        </label>
        <textarea id="role" value={roleDescription} onChange={e => setRoleDescription(e.target.value)}
          className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white"
          rows={3} placeholder="Optional notes about this portrayal..."/>
      </div>

      {/* Only show Actor Name for films, TV series, and plays */}
      {selectedMedia && ['FILM', 'TV_SERIES', 'TV_SERIES_COLLECTION', 'PLAY'].includes(selectedMedia.media_type || '') && (
        <div>
          <label htmlFor="actor-name" className="block text-sm font-medium text-gray-300">Actor Name (optional)</label>
          <input
            id="actor-name"
            type="text"
            value={actorName}
            onChange={e => setActorName(e.target.value)}
            className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white"
            placeholder="e.g., Jonathan Rhys Meyers"
          />
        </div>
      )}

      <div className="flex items-center">
        <input id="is-protagonist" type="checkbox" checked={isProtagonist} onChange={e => setIsProtagonist(e.target.checked)}
          className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"/>
        <label htmlFor="is-protagonist" className="ml-2 block text-sm text-gray-300">Is Protagonist</label>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-md text-green-400 text-sm">
          {success}
        </div>
      )}

      <button type="submit" disabled={isSubmitting || !selectedMedia}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors">
          {isSubmitting ? 'Submitting...' : 'Add Appearance'}
      </button>
        </form>
      )}
    </div>
  );
}
