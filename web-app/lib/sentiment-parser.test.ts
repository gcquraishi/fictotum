/**
 * Sentiment Parser Test Cases
 * Run with: npx ts-node sentiment-parser.test.ts
 *
 * After FIC-100 normalization, DB has 5 canonical values:
 * Heroic, Villainous, Complex, Neutral, Tragic
 */

import { parseSentiment, getSentimentScore, getCanonicalSentiment } from './sentiment-parser';

console.log('=== Sentiment Parser Test Cases ===\n');

// Test Case 1: Canonical sentiments (the only values in the DB now)
console.log('Test Case 1: Canonical Sentiments');
console.log('----------------------------------');
const canonical = ['Heroic', 'Villainous', 'Complex', 'Neutral', 'Tragic'];
canonical.forEach(s => {
  const result = parseSentiment(s);
  console.log(`"${s}" → ${result.canonical} (${result.numericScore}/100)`);
});

// Test Case 2: Edge cases (nulls, empty, unknown)
console.log('\nTest Case 2: Edge Cases');
console.log('-----------------------');
const edge = [null, undefined, '', 'unknown'];
edge.forEach(s => {
  const result = parseSentiment(s);
  console.log(`"${s}" → ${result.canonical} (${result.numericScore}/100)`);
});

// Test Case 3: Score ordering
console.log('\nTest Case 3: Score Ordering');
console.log('---------------------------');
console.log('Expected: Heroic(85) > Neutral(50) = Complex(50) > Tragic(30) > Villainous(15)');
canonical.sort((a, b) => getSentimentScore(b) - getSentimentScore(a));
canonical.forEach(s => {
  console.log(`  ${s}: ${getSentimentScore(s)}`);
});

// Test Case 4: getCanonicalSentiment helper
console.log('\nTest Case 4: getCanonicalSentiment');
console.log('-----------------------------------');
console.log(`"Heroic" → ${getCanonicalSentiment('Heroic')}`);
console.log(`null → ${getCanonicalSentiment(null)}`);
console.log(`"garbage" → ${getCanonicalSentiment('garbage')}`);

console.log('\n=== All Tests Complete ===');
