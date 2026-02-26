'use client';

import { useState, KeyboardEvent, ChangeEvent } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { SUGGESTED_TAGS, TAG_CONSTRAINTS, findSuggestedMatch } from '@/lib/utils/tagNormalizer';

interface SentimentTagSelectorProps {
  value: string[]; // Current selected tags
  onChange: (tags: string[]) => void; // Callback when tags change
  maxTags?: number; // Max tags allowed (default from TAG_CONSTRAINTS)
  minTags?: number; // Min tags required (default from TAG_CONSTRAINTS)
}

/**
 * Multi-select sentiment tag selector with suggested tags and custom input.
 *
 * Features:
 * - Suggested tags as clickable chips (prominent)
 * - Custom tag input (secondary)
 * - Fuzzy matching with suggestions
 * - Visual tag count (X/5)
 * - Validation feedback
 */
export default function SentimentTagSelector({
  value,
  onChange,
  maxTags = TAG_CONSTRAINTS.MAX_TAGS,
  minTags = TAG_CONSTRAINTS.MIN_TAGS,
}: SentimentTagSelectorProps) {
  const [customInput, setCustomInput] = useState('');
  const [fuzzyMatch, setFuzzyMatch] = useState<string | null>(null);

  // Normalize value to lowercase for consistency
  const selectedTags = value.map(tag => tag.toLowerCase());

  // Check if tag is selected
  const isSelected = (tag: string) => selectedTags.includes(tag.toLowerCase());

  // Check if at max capacity
  const isAtMaxCapacity = selectedTags.length >= maxTags;

  /**
   * Toggle suggested tag selection
   */
  const handleSuggestedTagClick = (tag: string) => {
    const normalizedTag = tag.toLowerCase();

    if (isSelected(tag)) {
      // Remove tag
      onChange(selectedTags.filter(t => t !== normalizedTag));
    } else {
      // Add tag (if not at max)
      if (!isAtMaxCapacity) {
        onChange([...selectedTags, normalizedTag]);
      }
    }
  };

  /**
   * Remove a selected tag (from chips)
   */
  const handleRemoveTag = (tagToRemove: string) => {
    onChange(selectedTags.filter(t => t !== tagToRemove.toLowerCase()));
  };

  /**
   * Handle custom tag input change with fuzzy matching
   */
  const handleCustomInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setCustomInput(input);

    // Check for fuzzy match with suggested tags
    if (input.trim().length >= 3) {
      const match = findSuggestedMatch(input.trim().toLowerCase());
      setFuzzyMatch(match);
    } else {
      setFuzzyMatch(null);
    }
  };

  /**
   * Add custom tag on Enter or blur
   */
  const handleAddCustomTag = () => {
    const trimmed = customInput.trim().toLowerCase();

    // Validation checks
    if (!trimmed) return;
    if (trimmed.length < TAG_CONSTRAINTS.MIN_LENGTH) return;
    if (trimmed.length > TAG_CONSTRAINTS.MAX_LENGTH) return;
    if (isSelected(trimmed)) return; // Already selected
    if (isAtMaxCapacity) return;

    // Add the tag
    onChange([...selectedTags, trimmed]);
    setCustomInput('');
    setFuzzyMatch(null);
  };

  /**
   * Handle Enter key in custom input
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomTag();
    }
  };

  /**
   * Accept fuzzy match suggestion
   */
  const handleAcceptFuzzyMatch = () => {
    if (fuzzyMatch && !isSelected(fuzzyMatch) && !isAtMaxCapacity) {
      onChange([...selectedTags, fuzzyMatch]);
      setCustomInput('');
      setFuzzyMatch(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-900 border border-gray-700 rounded-md">
          {selectedTags.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tag Count Display */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          Selected: <span className="font-semibold text-white">{selectedTags.length}/{maxTags}</span> tags
        </span>
        {selectedTags.length < minTags && (
          <span className="flex items-center gap-1 text-yellow-500">
            <AlertCircle className="w-4 h-4" />
            At least {minTags} tag required
          </span>
        )}
        {isAtMaxCapacity && (
          <span className="flex items-center gap-1 text-yellow-500">
            <AlertCircle className="w-4 h-4" />
            Max {maxTags} tags reached
          </span>
        )}
      </div>

      {/* Suggested Tags Grid */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Suggested Tags
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SUGGESTED_TAGS.map((tag) => {
            const selected = isSelected(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleSuggestedTagClick(tag)}
                disabled={!selected && isAtMaxCapacity}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg border transition-all
                  ${selected
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                  }
                  ${!selected && isAtMaxCapacity ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Tag Input */}
      <div>
        <label htmlFor="custom-tag" className="block text-sm font-medium text-gray-300 mb-2">
          Add Custom Tag
        </label>
        <div className="space-y-2">
          <input
            id="custom-tag"
            type="text"
            value={customInput}
            onChange={handleCustomInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleAddCustomTag}
            disabled={isAtMaxCapacity}
            placeholder={isAtMaxCapacity ? 'Remove a tag to add custom' : 'Type and press Enter...'}
            className={`
              w-full bg-gray-900 border rounded-md shadow-sm py-2 px-3 text-white
              placeholder-gray-500 focus:outline-none focus:ring-2
              ${isAtMaxCapacity
                ? 'border-gray-700 cursor-not-allowed opacity-50'
                : 'border-gray-600 focus:ring-blue-500'
              }
            `}
          />

          {/* Fuzzy Match Suggestion */}
          {fuzzyMatch && !isSelected(fuzzyMatch) && (
            <div className="flex items-center gap-2 p-2 bg-blue-900/30 border border-blue-500/50 rounded-md text-sm">
              <span className="text-gray-300">
                Did you mean: <span className="font-semibold text-blue-400">{fuzzyMatch}</span>?
              </span>
              <button
                type="button"
                onClick={handleAcceptFuzzyMatch}
                className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
              >
                Use this
              </button>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Custom tags must be {TAG_CONSTRAINTS.MIN_LENGTH}-{TAG_CONSTRAINTS.MAX_LENGTH} characters
          </p>
        </div>
      </div>
    </div>
  );
}
