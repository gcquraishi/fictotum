/**
 * Test script for duplicate detection API
 * Usage: node scripts/test-duplicate-api.js
 */

async function testDuplicateAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/duplicates/detect?min_similarity=0.75&limit=10');

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response body:', text);
      return;
    }

    const data = await response.json();

    console.log('=== Duplicate Detection API Test ===\n');
    console.log(`Total duplicates found: ${data.stats.total}`);
    console.log(`  High confidence: ${data.stats.high_confidence}`);
    console.log(`  Medium confidence: ${data.stats.medium_confidence}`);
    console.log(`  Low confidence: ${data.stats.low_confidence}`);
    console.log('\n=== Top 5 Duplicate Pairs ===\n');

    data.duplicates.slice(0, 5).forEach((pair, i) => {
      console.log(`${i + 1}. ${pair.figure1.name} vs ${pair.figure2.name}`);
      console.log(`   Similarity: ${(pair.similarity_score * 100).toFixed(1)}% (${pair.confidence} confidence)`);
      console.log(`   IDs: ${pair.figure1.canonical_id} / ${pair.figure2.canonical_id}`);
      console.log(`   Appearances: ${pair.figure1.appearance_count} / ${pair.figure2.appearance_count}`);
      console.log(`   Relationship overlap: ${pair.relationship_overlap}\n`);
    });

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDuplicateAPI();
