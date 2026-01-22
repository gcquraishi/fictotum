'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Plus, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

export default function ContributeFigurePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    birthYear: '',
    deathYear: '',
    description: '',
    era: '',
    wikidataId: '',
    historicity: 'Historical',
  });

  /**
   * Duplicate Detection Logic
   * Searches for existing figures with similar names to prevent duplicate entries.
   * Uses fuzzy search via /api/figures/search with 500ms debounce to avoid excessive queries.
   * Displays warning banner with links to existing figures and requires user confirmation to proceed.
   */
  const checkForDuplicates = useCallback(async (name: string) => {
    if (!name || name.length < 3) {
      setDuplicateWarnings([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/figures/search?q=${encodeURIComponent(name)}`);
      const data = await response.json();

      if (response.ok && data.figures && data.figures.length > 0) {
        setDuplicateWarnings(data.figures);
      } else {
        setDuplicateWarnings([]);
      }
    } catch (err) {
      console.error('Duplicate check failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce the duplicate check (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForDuplicates(formData.name);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name, checkForDuplicates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Reset override confirmation when name changes
    if (name === 'name') {
      setConfirmOverride(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if there are duplicate warnings and user hasn't confirmed override
    if (duplicateWarnings.length > 0 && !confirmOverride) {
      setError('Please confirm this is a distinct figure, or check the existing figures below.');
      return;
    }

    setIsLoading(true);

    try {
      if (!formData.name) {
        throw new Error('Name is required');
      }

      // Create figure in database
      const response = await fetch('/api/figures/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create figure');
      }

      // Success - redirect to figure page
      router.push(`/figure/${data.canonical_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create figure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-8 h-8 text-brand-accent" />
            <h1 className="text-3xl font-bold text-brand-primary">Add a Historical Figure</h1>
          </div>
          <p className="text-brand-text/70">
            Contribute a new historical figure to ChronosGraph
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-brand-primary/20 shadow-sm space-y-6">
          {error && (
            <div className="p-4 bg-brand-accent/10 border border-brand-accent/30 rounded-md text-brand-accent text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Napoleon Bonaparte, Cleopatra, Albert Einstein"
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
            {isSearching && formData.name.length >= 3 && (
              <p className="text-xs text-brand-text/60 mt-1">
                <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                Checking for duplicates...
              </p>
            )}
          </div>

          {/* Duplicate Warning Banner */}
          {duplicateWarnings.length > 0 && (
            <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    Potential Duplicate Found
                  </h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    The following figure(s) already exist with similar names. Are you sure this is a different person?
                  </p>
                  <div className="space-y-2">
                    {duplicateWarnings.map((figure: any) => (
                      <a
                        key={figure.canonical_id}
                        href={`/figure/${figure.canonical_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 bg-white rounded border border-yellow-300 hover:border-yellow-500 transition-colors text-sm"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{figure.name}</div>
                          {(figure.birth_year || figure.death_year) && (
                            <div className="text-gray-600">
                              {figure.birth_year && `b. ${figure.birth_year}`}
                              {figure.birth_year && figure.death_year && ' - '}
                              {figure.death_year && `d. ${figure.death_year}`}
                            </div>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                      </a>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="confirm-override"
                      checked={confirmOverride}
                      onChange={(e) => setConfirmOverride(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
                    />
                    <label htmlFor="confirm-override" className="text-sm font-medium text-yellow-900">
                      I confirm this is a distinct figure not listed above
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Birth Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2">
                Birth Year
              </label>
              <input
                type="number"
                name="birthYear"
                value={formData.birthYear}
                onChange={handleChange}
                placeholder="e.g., 1769"
                className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            {/* Death Year */}
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2">
                Death Year
              </label>
              <input
                type="number"
                name="deathYear"
                value={formData.deathYear}
                onChange={handleChange}
                placeholder="e.g., 1821"
                className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Era */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Era / Period
            </label>
            <input
              type="text"
              name="era"
              value={formData.era}
              onChange={handleChange}
              placeholder="e.g., Napoleonic Era, Ancient Egypt, 20th Century"
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Historicity */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Historicity
            </label>
            <select
              name="historicity"
              value={formData.historicity}
              onChange={handleChange}
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="Historical">Historical (verified historical figure)</option>
              <option value="Semi-Historical">Semi-Historical (based on real person)</option>
              <option value="Mythological">Mythological (from legend or myth)</option>
              <option value="Fictional">Fictional (entirely fictional character)</option>
            </select>
          </div>

          {/* Wikidata ID */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Wikidata Q-ID
            </label>
            <input
              type="text"
              name="wikidataId"
              value={formData.wikidataId}
              onChange={handleChange}
              placeholder="e.g., Q517"
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <p className="text-xs text-brand-text/60 mt-1">
              Optional - helps link to external sources
            </p>
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
              placeholder="Brief biography or background information..."
              rows={4}
              className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
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
                  Add Figure
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

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Make sure the figure you're adding doesn't already exist in ChronosGraph.
            Use the search to check first!
          </p>
        </div>
      </div>
    </div>
  );
}
