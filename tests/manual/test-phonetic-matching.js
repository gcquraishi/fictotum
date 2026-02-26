#!/usr/bin/env node
/**
 * Test script for phonetic name matching functionality
 * Tests the Double Metaphone implementation in wikidata.ts
 */

const { doubleMetaphone } = require('double-metaphone');

/**
 * Calculate phonetic similarity between two strings using Double Metaphone
 * (Copied from wikidata.ts for standalone testing)
 */
function calculatePhoneticSimilarity(str1, str2) {
  if (!str1 || !str2) return 0.0;

  const tokens1 = str1.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  const tokens2 = str2.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);

  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  const phonetics1 = tokens1.map(token => doubleMetaphone(token));
  const phonetics2 = tokens2.map(token => doubleMetaphone(token));

  let bestMatch = 0.0;

  for (const [primary1, secondary1] of phonetics1) {
    for (const [primary2, secondary2] of phonetics2) {
      if (primary1 && primary2 && primary1 === primary2) {
        bestMatch = Math.max(bestMatch, 1.0);
      } else if (
        (primary1 && secondary2 && primary1 === secondary2) ||
        (secondary1 && primary2 && secondary1 === primary2) ||
        (secondary1 && secondary2 && secondary1 === secondary2)
      ) {
        bestMatch = Math.max(bestMatch, 0.5);
      }
    }
  }

  return bestMatch;
}

/**
 * Calculate Levenshtein distance (simplified version)
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1.0 : 1.0 - (distance / maxLength);
}

function enhancedNameSimilarity(name1, name2) {
  const lexicalScore = calculateSimilarity(name1, name2);
  const phoneticScore = calculatePhoneticSimilarity(name1, name2);
  return (lexicalScore * 0.7) + (phoneticScore * 0.3);
}

// Test cases
const testCases = [
  // Name variants
  { name1: "Steven Spielberg", name2: "Stephen Spielberg", description: "Steven vs Stephen" },
  { name1: "Smyth", name2: "Smith", description: "Smyth vs Smith" },
  { name1: "Katherine", name2: "Catherine", description: "Katherine vs Catherine" },
  { name1: "Jon", name2: "John", description: "Jon vs John" },

  // Historical figures with potential variants
  { name1: "Marc Antony", name2: "Mark Antony", description: "Marc vs Mark Antony" },
  { name1: "Cicero", name2: "Cicero", description: "Exact match (Cicero)" },
  { name1: "Julius Caesar", name2: "Gaius Julius Caesar", description: "Partial match (Caesar)" },

  // Edge cases
  { name1: "Napoleon Bonaparte", name2: "Napoleon Bonaparte", description: "Exact match (Napoleon)" },
  { name1: "", name2: "Test", description: "Empty string" },
  { name1: "Test", name2: "", description: "Empty string (reversed)" },
  { name1: "François", name2: "Francois", description: "Accented characters" },
  { name1: "O'Brien", name2: "OBrien", description: "Special characters" },
];

console.log("================================================================================");
console.log("Phonetic Matching Test Results");
console.log("================================================================================\n");

testCases.forEach(({ name1, name2, description }) => {
  const lexical = calculateSimilarity(name1, name2);
  const phonetic = calculatePhoneticSimilarity(name1, name2);
  const enhanced = enhancedNameSimilarity(name1, name2);

  console.log(`Test: ${description}`);
  console.log(`  "${name1}" vs "${name2}"`);
  console.log(`  Lexical:  ${lexical.toFixed(3)}`);
  console.log(`  Phonetic: ${phonetic.toFixed(3)}`);
  console.log(`  Enhanced: ${enhanced.toFixed(3)} (70% lexical + 30% phonetic)`);
  console.log(`  ${enhanced >= 0.9 ? '✅ HIGH confidence' : enhanced >= 0.7 ? '⚠️ MEDIUM confidence' : '❌ LOW confidence'}`);
  console.log();
});

console.log("================================================================================");
