# Utility Library Usage Examples

## Location Matcher (`locationMatcher.ts`)

### Basic Usage

```typescript
import { matchLocation, calculateSimilarity, calculateLevenshteinDistance } from '@/lib/locationMatcher';

// Example 1: Check for exact match
const result1 = await matchLocation('London', 'Q84');
// Returns: { matchType: 'exact', existingLocation: {...}, similarity: 1.0 }

// Example 2: High similarity with Q-ID match (auto-merge)
const result2 = await matchLocation('Londinium', 'Q84');
// Returns: { matchType: 'auto_merge', existingLocation: {...}, similarity: 0.96, qIdMatch: true }

// Example 3: Possible duplicate (medium similarity)
const result3 = await matchLocation('Londyn');
// Returns: { matchType: 'possible_duplicate', existingLocation: {...}, similarity: 0.83 }

// Example 4: Coordinate proximity match
const result4 = await matchLocation(
  'Greater London Area',
  undefined,
  { lat: 51.5074, lon: -0.1278 }
);
// Returns: { matchType: 'possible_duplicate', existingLocation: {...}, coordMatch: true }

// Example 5: No match found
const result5 = await matchLocation('Completely New City');
// Returns: { matchType: 'unmapped' }
```

### String Similarity Functions

```typescript
// Calculate raw Levenshtein distance
const distance = calculateLevenshteinDistance('kitten', 'sitting');
console.log(distance); // 3

// Calculate similarity ratio (0-1)
const similarity = calculateSimilarity('Paris', 'Pariis');
console.log(similarity); // 0.833... (83.3% similar)

// Case-insensitive matching
const similarity2 = calculateSimilarity('ROME', 'rome');
console.log(similarity2); // 1.0 (100% match)
```

### Integration in Create Flow

```typescript
// In your create location form submission handler
async function handleLocationSubmit(formData: LocationFormData) {
  // Step 1: Check for duplicates before creating
  const matchResult = await matchLocation(
    formData.name,
    formData.wikidata_id,
    formData.coordinates
  );

  // Step 2: Handle different match types
  switch (matchResult.matchType) {
    case 'exact':
      return {
        error: 'This location already exists',
        existingLocation: matchResult.existingLocation,
      };

    case 'auto_merge':
      // Automatically link to existing location
      return {
        action: 'merge',
        targetLocation: matchResult.existingLocation,
        message: `Merged with existing location (${matchResult.similarity * 100}% match + Q-ID verified)`,
      };

    case 'possible_duplicate':
      // Show user confirmation dialog
      return {
        action: 'confirm',
        suggestedLocation: matchResult.existingLocation,
        similarity: matchResult.similarity,
        message: 'Similar location found. Do you want to merge or create new?',
      };

    case 'unmapped':
      // Safe to create new location
      return createNewLocation(formData);
  }
}
```

---

## Era Validator (`eraValidator.ts`)

### Basic Usage

```typescript
import {
  validateEraTags,
  calculateEraConfidence,
  detectAnachronism,
  getMostConfidentEra,
  getHighConfidenceEras,
  getAnachronisticEras,
} from '@/lib/eraValidator';

// Example era definitions
const eras = [
  { name: 'Victorian Era', start_year: 1837, end_year: 1901 },
  { name: 'Medieval Period', start_year: 500, end_year: 1500 },
  { name: 'Renaissance', start_year: 1400, end_year: 1600 },
];

// Example 1: Validate era tags for a Victorian-set work
const validations = validateEraTags(1860, 1995, eras);
/*
Returns:
[
  {
    eraName: 'Victorian Era',
    confidence: 0.95,
    isAnachronistic: false,
    reasoning: 'Setting year (1860) falls within Victorian Era (1837-1901)'
  },
  {
    eraName: 'Medieval Period',
    confidence: 0.20,
    isAnachronistic: true,
    reasoning: 'Setting year (1860) is 360 years outside Medieval Period (500-1500) - ANACHRONISTIC'
  },
  {
    eraName: 'Renaissance',
    confidence: 0.20,
    isAnachronistic: true,
    reasoning: 'Setting year (1860) is 260 years outside Renaissance (1400-1600) - ANACHRONISTIC'
  }
]
*/

// Example 2: Get only high-confidence matches
const reliable = getHighConfidenceEras(validations, 0.70);
console.log(reliable.length); // 1 (only Victorian Era)

// Example 3: Get most confident era
const best = getMostConfidentEra(validations);
console.log(best.eraName); // 'Victorian Era'

// Example 4: Find anachronisms
const problems = getAnachronisticEras(validations);
console.log(problems.length); // 2 (Medieval Period, Renaissance)
```

### Individual Functions

```typescript
// Calculate confidence for a single era
const era = { name: 'Victorian Era', start_year: 1837, end_year: 1901 };
const confidence = calculateEraConfidence(era, 1860, 1995);
console.log(confidence); // 0.95

// Detect anachronism
const isAnachronistic = detectAnachronism(era, 1750);
console.log(isAnachronistic); // true (87 years before Victorian Era)

// No anachronism detected without setting year
const isAnachronistic2 = detectAnachronism(era, undefined);
console.log(isAnachronistic2); // false (can't verify without setting year)
```

### Integration in Create Flow

```typescript
// In your create media work form submission handler
async function handleMediaWorkSubmit(formData: MediaWorkFormData) {
  const { setting_year, release_year, era_tags } = formData;

  // Validate era tags
  const validations = validateEraTags(setting_year, release_year, era_tags);

  // Check for high-confidence matches
  const reliable = getHighConfidenceEras(validations, 0.70);

  if (reliable.length === 0) {
    // No reliable era matches - warn user
    return {
      warning: 'No era tags have high confidence. Please review selections.',
      validations,
    };
  }

  // Check for anachronisms
  const anachronisms = getAnachronisticEras(validations);

  if (anachronisms.length > 0) {
    // Flag for review
    return {
      flag: 'anachronism_detected',
      message: `${anachronisms.length} anachronistic era tag(s) detected`,
      problematicEras: anachronisms,
      recommendation: 'Consider removing or verifying these era assignments',
    };
  }

  // All validations passed - proceed with creation
  return createMediaWork({
    ...formData,
    era_validation_results: validations,
    high_confidence_eras: reliable.map(v => v.eraName),
  });
}
```

### UI Display Example

```typescript
// Display validation results in UI
function EraValidationDisplay({ validations }: { validations: EraValidation[] }) {
  return (
    <div className="era-validation-results">
      {validations.map(v => (
        <div
          key={v.eraName}
          className={`era-item ${v.isAnachronistic ? 'anachronistic' : ''}`}
        >
          <h4>{v.eraName}</h4>
          <div className="confidence-bar">
            <div style={{ width: `${v.confidence * 100}%` }} />
          </div>
          <p className="confidence-score">
            {(v.confidence * 100).toFixed(0)}% confidence
          </p>
          <p className="reasoning">{v.reasoning}</p>
          {v.isAnachronistic && (
            <span className="warning-badge">⚠️ ANACHRONISTIC</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Combined Usage in Unified Hub

```typescript
import { matchLocation } from '@/lib/locationMatcher';
import { validateEraTags } from '@/lib/eraValidator';

async function handleUnifiedContribution(formData: ContributionFormData) {
  const results = {
    locations: [],
    eras: [],
    warnings: [],
  };

  // Validate locations
  for (const location of formData.locations) {
    const match = await matchLocation(
      location.name,
      location.wikidata_id,
      location.coordinates
    );

    results.locations.push({
      input: location,
      matchResult: match,
      action: determineLocationAction(match),
    });
  }

  // Validate era tags
  const eraValidations = validateEraTags(
    formData.setting_year,
    formData.release_year,
    formData.era_tags
  );

  results.eras = eraValidations;

  // Add warnings for anachronisms
  const anachronisms = eraValidations.filter(v => v.isAnachronistic);
  if (anachronisms.length > 0) {
    results.warnings.push({
      type: 'anachronism',
      count: anachronisms.length,
      details: anachronisms,
    });
  }

  // Add warnings for duplicate locations
  const duplicates = results.locations.filter(
    l => l.matchResult.matchType === 'possible_duplicate'
  );
  if (duplicates.length > 0) {
    results.warnings.push({
      type: 'possible_duplicate_location',
      count: duplicates.length,
      details: duplicates,
    });
  }

  return results;
}
```
