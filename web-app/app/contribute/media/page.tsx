'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Plus, Loader2, MapPin, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { LocationWithStats, EraWithStats } from '@/lib/types';

export default function ContributeMediaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [eras, setEras] = useState<EraWithStats[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [showStorySettings, setShowStorySettings] = useState(false);
  const [showAdvancedMetadata, setShowAdvancedMetadata] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    mediaType: 'FILM',
    releaseYear: new Date().getFullYear(),
    creator: '',
    wikidataId: '',
    description: '',
    publisher: '',
    translator: '',
    channel: '',
    productionStudio: '',
    locationIds: [] as string[],
    eraIds: [] as string[],
  });

  // Load available locations and eras
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [locResponse, eraResponse] = await Promise.all([
          fetch('/api/browse/locations'),
          fetch('/api/browse/eras'),
        ]);

        if (locResponse.ok) {
          const locData = await locResponse.json();
          setLocations(locData.locations);
        }

        if (eraResponse.ok) {
          const eraData = await eraResponse.json();
          setEras(eraData.eras);
        }
      } catch (err) {
        console.error('Failed to load locations/eras:', err);
      } finally {
        setLoadingResources(false);
      }
    };

    loadResources();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'releaseYear' ? parseInt(value) : value,
    }));
  };

  const handleLocationToggle = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter(id => id !== locationId)
        : [...prev.locationIds, locationId],
    }));
  };

  const handleEraToggle = (eraId: string) => {
    setFormData(prev => ({
      ...prev,
      eraIds: prev.eraIds.includes(eraId)
        ? prev.eraIds.filter(id => id !== eraId)
        : [...prev.eraIds, eraId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!formData.title || !formData.releaseYear) {
        throw new Error('Title and release year are required');
      }

      const response = await fetch('/api/media/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create media');
      }

      // Success - redirect to media page
      router.push(`/media/${data.media_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create media');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-8 h-8 text-brand-accent" />
            <h1 className="text-3xl font-bold text-brand-primary">Add a Media Work</h1>
          </div>
          <p className="text-brand-text/70">
            Contribute a new film, book, game, or TV series to ChronosGraph
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-brand-primary/20 shadow-sm space-y-6">
          {error && (
            <div className="p-4 bg-brand-accent/10 border border-brand-accent/30 rounded-md text-brand-accent text-sm">
              {error}
            </div>
          )}

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/20 pb-2">
              Basic Information
            </h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Oppenheimer, The Crown, Red Dead Redemption"
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>

          {/* Media Type */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Media Type *
            </label>
            <select
              name="mediaType"
              value={formData.mediaType}
              onChange={handleChange}
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="FILM">Film</option>
              <option value="TV_SERIES">TV Series</option>
              <option value="BOOK">Book</option>
              <option value="GAME">Video Game</option>
              <option value="GAME_SERIES">Game Series</option>
            </select>
          </div>

          {/* Release Year */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Release Year *
            </label>
            <input
              type="number"
              name="releaseYear"
              value={formData.releaseYear}
              onChange={handleChange}
              min="1800"
              max={new Date().getFullYear()}
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>

          {/* Creator */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Creator / Director / Author
            </label>
            <input
              type="text"
              name="creator"
              value={formData.creator}
              onChange={handleChange}
              placeholder="e.g., Christopher Nolan, Peter Jackson, George R. R. Martin"
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Wikidata ID */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-brand-text">
                Wikidata Q-ID
              </label>
              <div className="group relative">
                <Info className="w-4 h-4 text-brand-primary/50 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-800 text-xs text-white rounded shadow-lg z-10">
                  <strong>What is a Wikidata Q-ID?</strong><br/>
                  Unique identifiers like Q1298971 for "Oppenheimer". Leave blank to auto-search.<br/>
                  <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline mt-1 inline-block">
                    Search Wikidata →
                  </a>
                </div>
              </div>
            </div>
            <input
              type="text"
              name="wikidataId"
              value={formData.wikidataId}
              onChange={handleChange}
              placeholder="e.g., Q1298971"
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the media work..."
              rows={4}
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          </div>

          {/* Story Settings Section - Collapsible */}
          <div className="border-t border-brand-primary/20 pt-4">
            <button
              type="button"
              onClick={() => setShowStorySettings(!showStorySettings)}
              className="w-full flex items-center justify-between text-left mb-4 hover:text-brand-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <Clock className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-brand-text">
                  Story Settings (Optional)
                </h3>
                <div className="group relative">
                  <Info className="w-3 h-3 text-brand-primary/50 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-xs text-white rounded shadow-lg z-10">
                    Where and when is the story set? Select locations and eras depicted in the work.
                  </div>
                </div>
              </div>
              {showStorySettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {showStorySettings && (
              <div className="space-y-6">

            {/* Locations */}
            {locations.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-brand-text mb-3">
                  Where is this work set?
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-brand-text/5 rounded-md border border-brand-primary/10">
                  {locations.map(loc => (
                    <label key={loc.location_id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.locationIds.includes(loc.location_id)}
                        onChange={() => handleLocationToggle(loc.location_id)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-brand-text">{loc.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Eras */}
            {eras.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-brand-text mb-3">
                  What time period is depicted?
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-brand-text/5 rounded-md border border-brand-primary/10">
                  {eras.map(era => (
                    <label key={era.era_id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.eraIds.includes(era.era_id)}
                        onChange={() => handleEraToggle(era.era_id)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-brand-text">{era.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
              </div>
            )}
          </div>

          {/* Advanced Metadata Section - Collapsible */}
          <div className="border-t border-brand-primary/20 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvancedMetadata(!showAdvancedMetadata)}
              className="w-full flex items-center justify-between text-left mb-4 hover:text-brand-accent transition-colors"
            >
              <h3 className="text-sm font-semibold text-brand-text">Advanced Metadata (Optional)</h3>
              {showAdvancedMetadata ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {showAdvancedMetadata && (
              <div className="space-y-4">

            {/* Book Fields */}
            {(formData.mediaType === 'BOOK' || formData.mediaType === 'GAME_SERIES') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">
                    Publisher
                  </label>
                  <input
                    type="text"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleChange}
                    placeholder="e.g., Penguin Books, Harper Voyager"
                    className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-brand-text mb-2">
                    Translator
                  </label>
                  <input
                    type="text"
                    name="translator"
                    value={formData.translator}
                    onChange={handleChange}
                    placeholder="e.g., John Smith (translated from French)"
                    className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </>
            )}

            {/* TV Series Fields */}
            {formData.mediaType === 'TV_SERIES' && (
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Channel / Network
                </label>
                <input
                  type="text"
                  name="channel"
                  value={formData.channel}
                  onChange={handleChange}
                  placeholder="e.g., HBO, BBC, Netflix"
                  className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            )}

            {/* Film & Game Fields */}
            {(formData.mediaType === 'FILM' || formData.mediaType === 'GAME') && (
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Production Studio
                </label>
                <input
                  type="text"
                  name="productionStudio"
                  value={formData.productionStudio}
                  onChange={handleChange}
                  placeholder="e.g., Universal Pictures, Rockstar Games"
                  className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-primary/30 text-white font-semibold py-3 rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Media Work
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-semibold rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
