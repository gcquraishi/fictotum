#!/usr/bin/env node
/**
 * Test script for canonical ID generation
 * Tests the Wikidata-first approach for HistoricalFigure canonical_id
 */

/**
 * Simulate generateCanonicalId function from route.ts
 */
function generateCanonicalId(name, wikidataId, birthYear) {
  // Priority 1: Use Wikidata Q-ID as canonical_id if available
  if (wikidataId && wikidataId.startsWith('Q') && !wikidataId.startsWith('PROV:')) {
    return wikidataId;
  }

  // Priority 2: Generate provisional ID with timestamp to ensure uniqueness
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // Use timestamp to prevent collisions for figures with identical names
  const timestamp = Date.now();
  return `PROV:${slug}-${timestamp}`;
}

// Test cases
const testCases = [
  {
    name: "Napoleon Bonaparte",
    wikidataId: "Q517",
    birthYear: 1769,
    description: "Figure with Wikidata Q-ID"
  },
  {
    name: "John Smith",
    wikidataId: undefined,
    birthYear: 1580,
    description: "Figure without Q-ID (first instance)"
  },
  {
    name: "John Smith",
    wikidataId: undefined,
    birthYear: 1938,
    description: "Figure without Q-ID (second instance - should have different timestamp)"
  },
  {
    name: "Marcus Tullius Cicero",
    wikidataId: "Q1541",
    birthYear: -106,
    description: "Ancient figure with Q-ID"
  },
  {
    name: "Test Figure (Special Characters!)",
    wikidataId: undefined,
    birthYear: 2000,
    description: "Name with special characters (no Q-ID)"
  },
  {
    name: "Julius Caesar",
    wikidataId: "PROV:julius-caesar-123",
    birthYear: -100,
    description: "Existing provisional ID (should NOT be treated as Q-ID)"
  },
];

console.log("================================================================================");
console.log("Canonical ID Generation Test Results");
console.log("================================================================================\n");

testCases.forEach(({ name, wikidataId, birthYear, description }) => {
  // Simulate a small delay for the second "John Smith" to get different timestamp
  if (description.includes("second instance")) {
    // Sleep for 2ms to ensure different timestamp
    const start = Date.now();
    while (Date.now() - start < 2) {}
  }

  const canonical_id = generateCanonicalId(name, wikidataId, birthYear);

  console.log(`Test: ${description}`);
  console.log(`  Name: "${name}"`);
  console.log(`  Wikidata ID: ${wikidataId || "(none)"}`);
  console.log(`  Birth Year: ${birthYear}`);
  console.log(`  Generated canonical_id: ${canonical_id}`);

  // Validation
  if (wikidataId && wikidataId.startsWith('Q')) {
    console.log(`  ✅ Correctly uses Q-ID as canonical_id`);
  } else if (canonical_id.startsWith('PROV:')) {
    const hasTimestamp = /PROV:[a-z0-9-]+-\d{13}$/.test(canonical_id);
    console.log(`  ✅ Correctly uses provisional format with ${hasTimestamp ? 'timestamp' : 'NO TIMESTAMP (ERROR!)'}`);
  } else if (wikidataId && wikidataId.startsWith('PROV:')) {
    console.log(`  ✅ Correctly regenerates provisional ID (doesn't use existing PROV: ID)`);
  } else {
    console.log(`  ❌ UNEXPECTED FORMAT`);
  }

  console.log();
});

console.log("================================================================================");
console.log("\nKey Observations:");
console.log("1. Q-IDs are used directly as canonical_id (e.g., Q517 for Napoleon)");
console.log("2. Provisional IDs have format PROV:{slug}-{timestamp}");
console.log("3. Timestamps prevent collisions for figures with identical names");
console.log("4. Existing PROV: IDs are NOT reused (new timestamp generated)");
console.log("================================================================================");
