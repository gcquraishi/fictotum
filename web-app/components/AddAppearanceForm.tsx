// file: web-app/components/AddAppearanceForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

interface MediaSearchResult {
  media_id: string;
  title: string;
  year: number;
}

export default function AddAppearanceForm({ figureId }: { figureId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState<MediaSearchResult[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaSearchResult | null>(null);

  const [showCreateMedia, setShowCreateMedia] = useState(false);
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaType, setNewMediaType] = useState('FILM');
  const [newMediaYear, setNewMediaYear] = useState('');
  const [newMediaCreator, setNewMediaCreator] = useState('');
  const [newMediaWikidataId, setNewMediaWikidataId] = useState('');

  const [sentiment, setSentiment] = useState('Complex');
  const [roleDescription, setRoleDescription] = useState('');
  const [isProtagonist, setIsProtagonist] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateMedia = async () => {
    setError(null);
    if (!newMediaTitle || !newMediaYear) {
      setError("Title and year are required for new media.");
      return;
    }

    const response = await fetch('/api/media/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newMediaTitle,
        mediaType: newMediaType,
        releaseYear: parseInt(newMediaYear),
        creator: newMediaCreator || null,
        wikidataId: newMediaWikidataId || null,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setSelectedMedia(data.media);
      setMediaQuery(data.media.title);
      setShowCreateMedia(false);
      // Reset create form
      setNewMediaTitle('');
      setNewMediaType('FILM');
      setNewMediaYear('');
      setNewMediaCreator('');
      setNewMediaWikidataId('');
    } else {
      const data = await response.json();
      // If media already exists, automatically select it
      if (data.existingMedia) {
        setSelectedMedia(data.existingMedia);
        setMediaQuery(data.existingMedia.title);
        setShowCreateMedia(false);
        setError(`Found existing work: "${data.existingMedia.title}" (${data.existingMedia.year}). It has been selected.`);
        // Clear error after a few seconds
        setTimeout(() => setError(null), 5000);
      } else {
        setError(data.error || "Failed to create media work.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedMedia) {
        setError("Please search for and select a media work.");
        return;
    }

    startTransition(async () => {
        const response = await fetch('/api/contribution/appearance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                figureId,
                mediaId: selectedMedia.media_id,
                sentiment,
                roleDescription,
                isProtagonist,
            }),
        });

        if (response.ok) {
            // Refresh the page to show the new data
            router.refresh();
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
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-gray-800 border border-gray-700 rounded-lg">
      <h3 className="text-xl font-semibold">Add Media Appearance</h3>

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
          <div className="mt-2 text-sm text-green-400">
            ✓ Selected: {selectedMedia.title} ({selectedMedia.year})
          </div>
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
        <div className="space-y-3 p-4 bg-gray-900 border border-gray-600 rounded-lg">
          <h4 className="font-semibold text-sm text-gray-300">Create New Media Work</h4>

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
            <label htmlFor="new-wikidata" className="block text-xs font-medium text-gray-400">Wikidata ID (optional)</label>
            <input
              id="new-wikidata"
              type="text"
              value={newMediaWikidataId}
              onChange={e => setNewMediaWikidataId(e.target.value)}
              className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white text-sm"
              placeholder="e.g., Q28842191"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateMedia}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Create Media
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

      <div>
        <label htmlFor="sentiment" className="block text-sm font-medium text-gray-300">Sentiment</label>
        <select id="sentiment" value={sentiment} onChange={e => setSentiment(e.target.value)}
          className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white">
            <option>Complex</option>
            <option>Heroic</option>
            <option>Villainous</option>
            <option>Neutral</option>
        </select>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-300">Role Description</label>
        <textarea id="role" value={roleDescription} onChange={e => setRoleDescription(e.target.value)}
          className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white"
          rows={3} placeholder="Describe the figure's role in this work..."/>
      </div>

      <div className="flex items-center">
        <input id="is-protagonist" type="checkbox" checked={isProtagonist} onChange={e => setIsProtagonist(e.target.checked)}
          className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"/>
        <label htmlFor="is-protagonist" className="ml-2 block text-sm text-gray-300">Is Protagonist</label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button type="submit" disabled={isSubmitting || !selectedMedia}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors">
          {isSubmitting ? 'Submitting...' : 'Add Appearance'}
      </button>
    </form>
  );
}
