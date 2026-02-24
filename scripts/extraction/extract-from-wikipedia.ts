#!/usr/bin/env npx tsx
/**
 * Gemini Extraction Pipeline — Wikipedia → Batch Import JSON
 *
 * Takes a Wikipedia article URL or topic, extracts structured historical data
 * using Gemini, resolves entities against the existing Neo4j graph, and outputs
 * valid batch-import JSON ready for human review and dry-run import.
 *
 * Pipeline:
 *   1. Fetch Wikipedia article (via REST API for clean text)
 *   2. Gemini extracts figures, works, portrayals, relationships
 *   3. Entity resolution against Neo4j (Wikidata Q-ID matching)
 *   4. Output valid batch-import JSON
 *
 * Usage (from web-app/):
 *   npx tsx ../scripts/extraction/extract-from-wikipedia.ts --topic "Medieval Europe"
 *   npx tsx ../scripts/extraction/extract-from-wikipedia.ts --url "https://en.wikipedia.org/wiki/Hundred_Years%27_War"
 *   npx tsx ../scripts/extraction/extract-from-wikipedia.ts --topic "Wars of the Roses" --dry-run
 *   npx tsx ../scripts/extraction/extract-from-wikipedia.ts --topic "Crusades" --output data/crusades_extraction.json
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import neo4j from 'neo4j-driver';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedFigure {
  name: string;
  wikidata_id?: string;
  birth_year?: number;
  death_year?: number;
  title?: string;
  era?: string;
  description?: string;
  historicity_status?: 'Historical' | 'Fictional' | 'Legendary';
}

interface ExtractedWork {
  title: string;
  wikidata_id?: string;
  media_type?: string;
  release_year?: number;
  creator?: string;
  description?: string;
  setting?: string;
}

interface ExtractedRelationship {
  from_id: string;
  from_type: 'HistoricalFigure' | 'MediaWork';
  to_id: string;
  to_type: 'HistoricalFigure' | 'MediaWork';
  rel_type: string;
  properties?: Record<string, unknown>;
}

interface ExtractionResult {
  figures: ExtractedFigure[];
  works: ExtractedWork[];
  relationships: ExtractedRelationship[];
}

interface BatchImportJSON {
  metadata: {
    source: string;
    curator: string;
    date: string;
    description: string;
  };
  figures: ExtractedFigure[];
  works: ExtractedWork[];
  relationships: ExtractedRelationship[];
}

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  topic?: string;
  url?: string;
  output?: string;
  dryRun: boolean;
  maxArticles: number;
} {
  const args = process.argv.slice(2);
  const result = {
    topic: undefined as string | undefined,
    url: undefined as string | undefined,
    output: undefined as string | undefined,
    dryRun: false,
    maxArticles: 5,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--topic':
        result.topic = args[++i];
        break;
      case '--url':
        result.url = args[++i];
        break;
      case '--output':
        result.output = args[++i];
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--max-articles':
        result.maxArticles = parseInt(args[++i], 10);
        break;
    }
  }

  if (!result.topic && !result.url) {
    console.error('Usage: npx tsx extract-from-wikipedia.ts --topic "Topic" [--url URL] [--output file.json] [--dry-run] [--max-articles N]');
    process.exit(1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Wikipedia Fetching
// ---------------------------------------------------------------------------

async function fetchWikipediaArticle(titleOrUrl: string): Promise<{ title: string; extract: string; url: string }> {
  let articleTitle: string;

  if (titleOrUrl.startsWith('http')) {
    // Extract title from URL
    const match = titleOrUrl.match(/\/wiki\/(.+?)(?:#|$|\?)/);
    if (!match) throw new Error(`Cannot parse Wikipedia URL: ${titleOrUrl}`);
    articleTitle = decodeURIComponent(match[1].replace(/_/g, ' '));
  } else {
    articleTitle = titleOrUrl;
  }

  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext=true&titles=${encodeURIComponent(articleTitle)}&format=json&exlimit=1&exsectionformat=plain`;

  const response = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Fictotum/1.0 (extraction-pipeline)' },
  });

  if (!response.ok) throw new Error(`Wikipedia API error: ${response.status}`);

  const data = await response.json();
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  const page = pages[pageId];

  if (pageId === '-1') throw new Error(`Wikipedia article not found: ${articleTitle}`);

  // Truncate to ~8000 chars to stay within Gemini context
  const extract = (page.extract || '').slice(0, 8000);

  return {
    title: page.title,
    extract,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
  };
}

async function findRelatedArticles(topic: string, maxArticles: number): Promise<string[]> {
  // Use Wikipedia search to find related articles
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=${maxArticles}`;

  const response = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Fictotum/1.0 (extraction-pipeline)' },
  });

  if (!response.ok) return [topic];
  const data = await response.json();

  return data.query.search.map((r: { title: string }) => r.title);
}

// ---------------------------------------------------------------------------
// Wikidata Resolution
// ---------------------------------------------------------------------------

async function resolveWikidataId(name: string, type: 'person' | 'work'): Promise<string | undefined> {
  const apiUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&limit=3&format=json&type=item`;

  try {
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Fictotum/1.0 (extraction-pipeline)' },
    });

    if (!response.ok) return undefined;
    const data = await response.json();

    if (!data.search || data.search.length === 0) return undefined;

    // Return the first result's Q-ID — Gemini's output is usually precise enough
    return data.search[0].id;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Neo4j Entity Resolution
// ---------------------------------------------------------------------------

async function resolveAgainstGraph(
  figures: ExtractedFigure[],
  works: ExtractedWork[],
  driver: neo4j.Driver,
): Promise<{ existingFigureIds: Set<string>; existingWorkIds: Set<string> }> {
  const session = driver.session();
  const existingFigureIds = new Set<string>();
  const existingWorkIds = new Set<string>();

  try {
    // Check which figures already exist
    const figureQids = figures
      .map(f => f.wikidata_id)
      .filter((q): q is string => !!q);

    if (figureQids.length > 0) {
      const result = await session.run(
        `MATCH (f:HistoricalFigure)
         WHERE f.wikidata_id IN $qids OR f.canonical_id IN $qids
         RETURN f.wikidata_id AS wid, f.canonical_id AS cid`,
        { qids: figureQids },
      );
      for (const record of result.records) {
        const wid = record.get('wid');
        const cid = record.get('cid');
        if (wid) existingFigureIds.add(wid);
        if (cid) existingFigureIds.add(cid);
      }
    }

    // Check which works already exist
    const workQids = works
      .map(w => w.wikidata_id)
      .filter((q): q is string => !!q);

    if (workQids.length > 0) {
      const result = await session.run(
        `MATCH (m:MediaWork)
         WHERE m.wikidata_id IN $qids
         RETURN m.wikidata_id AS wid`,
        { qids: workQids },
      );
      for (const record of result.records) {
        const wid = record.get('wid');
        if (wid) existingWorkIds.add(wid);
      }
    }
  } finally {
    await session.close();
  }

  return { existingFigureIds, existingWorkIds };
}

// ---------------------------------------------------------------------------
// Gemini Extraction
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 30000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`      Rate limited. Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  throw new Error('Unreachable');
}

async function extractFromArticle(
  genai: GoogleGenerativeAI,
  article: { title: string; extract: string },
): Promise<ExtractionResult> {
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a historian extracting structured data from a Wikipedia article for a knowledge graph database called Fictotum. Extract historical figures, media works that portray them, and their relationships.

ARTICLE TITLE: ${article.title}

ARTICLE TEXT:
${article.extract}

Extract the following and return as JSON:

1. **figures**: Historical figures mentioned in the article. For each:
   - name: Full name as commonly known
   - wikidata_id: Wikidata Q-ID if you know it (e.g., "Q517" for Napoleon). Leave empty if unsure.
   - birth_year: Integer (negative for BCE)
   - death_year: Integer (negative for BCE)
   - title: Primary title/role (e.g., "King of England")
   - era: Historical era (e.g., "Medieval", "Renaissance", "Victorian Era")
   - description: 1-2 sentence description
   - historicity_status: "Historical", "Fictional", or "Legendary"

2. **works**: Media works (films, books, TV series, plays, games) that portray these figures. For each:
   - title: Official title
   - wikidata_id: Wikidata Q-ID if you know it
   - media_type: One of: BOOK, FILM, TV_SERIES, GAME, PLAY, COMIC
   - release_year: Year of release/publication
   - creator: Director/author name
   - description: 1 sentence description
   - setting: Historical period/location

3. **relationships**: Connections between figures and works. For each:
   - from_id: The figure's wikidata_id (or name if no Q-ID)
   - from_type: "HistoricalFigure"
   - to_id: The work's wikidata_id (or title if no Q-ID)
   - to_type: "MediaWork"
   - rel_type: "APPEARS_IN"
   - properties: { sentiment: "heroic"|"villainous"|"complex"|"neutral", role: "description of role" }

Also include INTERACTED_WITH relationships between figures who had significant historical connections:
   - from_id: figure 1 wikidata_id
   - from_type: "HistoricalFigure"
   - to_id: figure 2 wikidata_id
   - to_type: "HistoricalFigure"
   - rel_type: "INTERACTED_WITH"
   - properties: { relationship_type: "ally"|"rival"|"family"|"mentor"|"successor", context: "brief description" }

IMPORTANT RULES:
- Only include figures and works actually mentioned or clearly relevant to the article
- Prefer well-known media works (major films, classic novels, popular TV series)
- Always try to provide Wikidata Q-IDs — they are critical for entity resolution
- For INTERACTED_WITH relationships, only include historically documented interactions
- Return ONLY valid JSON, no markdown formatting

Return a JSON object with keys: figures, works, relationships`;

  const result = await callGeminiWithRetry(() =>
    model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for factual extraction
      },
    }),
  );

  const text = result.response.text();
  try {
    return JSON.parse(text) as ExtractionResult;
  } catch {
    console.error('  Failed to parse Gemini response, attempting cleanup...');
    // Try to extract JSON from markdown code block
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[1] || match[0]) as ExtractionResult;
    }
    throw new Error('Failed to parse Gemini extraction response');
  }
}

// ---------------------------------------------------------------------------
// Post-Processing
// ---------------------------------------------------------------------------

async function resolveAndDeduplicate(
  rawResults: ExtractionResult[],
  driver: neo4j.Driver,
): Promise<ExtractionResult> {
  // Merge all results
  const allFigures = new Map<string, ExtractedFigure>();
  const allWorks = new Map<string, ExtractedWork>();
  const allRelationships: ExtractedRelationship[] = [];

  for (const result of rawResults) {
    for (const figure of result.figures || []) {
      const key = figure.wikidata_id || figure.name.toLowerCase();
      if (!allFigures.has(key)) {
        allFigures.set(key, figure);
      }
    }
    for (const work of result.works || []) {
      const key = work.wikidata_id || work.title.toLowerCase();
      if (!allWorks.has(key)) {
        allWorks.set(key, work);
      }
    }
    allRelationships.push(...(result.relationships || []));
  }

  const figures = Array.from(allFigures.values());
  const works = Array.from(allWorks.values());

  // Resolve missing Wikidata IDs
  console.log('\n  Resolving Wikidata IDs for figures without Q-IDs...');
  let resolved = 0;
  for (const figure of figures) {
    if (!figure.wikidata_id) {
      const qid = await resolveWikidataId(figure.name, 'person');
      if (qid) {
        figure.wikidata_id = qid;
        resolved++;
        // Rate limit Wikidata API
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }
  if (resolved > 0) console.log(`    Resolved ${resolved} figure Q-IDs via Wikidata`);

  console.log('  Resolving Wikidata IDs for works without Q-IDs...');
  resolved = 0;
  for (const work of works) {
    if (!work.wikidata_id) {
      const qid = await resolveWikidataId(work.title, 'work');
      if (qid) {
        work.wikidata_id = qid;
        resolved++;
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }
  if (resolved > 0) console.log(`    Resolved ${resolved} work Q-IDs via Wikidata`);

  // Check against existing graph
  console.log('  Checking against existing Neo4j graph...');
  const { existingFigureIds, existingWorkIds } = await resolveAgainstGraph(figures, works, driver);

  // Mark existing entities
  const newFigures = figures.filter(f => {
    const id = f.wikidata_id || f.name;
    const exists = existingFigureIds.has(id);
    if (exists) console.log(`    [EXISTS] Figure: ${f.name} (${f.wikidata_id})`);
    return true; // Keep all for relationships — batch_import handles dedup via MERGE
  });

  const newWorks = works.filter(w => {
    const exists = w.wikidata_id ? existingWorkIds.has(w.wikidata_id) : false;
    if (exists) console.log(`    [EXISTS] Work: ${w.title} (${w.wikidata_id})`);
    return true; // Keep all — batch_import handles dedup
  });

  // Ensure all figures have canonical_id (wikidata_id preferred)
  for (const figure of newFigures) {
    if (!figure.wikidata_id) {
      // Generate provisional ID
      const slug = figure.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      (figure as Record<string, unknown>).canonical_id = `PROV:${slug}`;
    }
  }

  // Deduplicate relationships
  const relKeys = new Set<string>();
  const dedupedRels = allRelationships.filter(r => {
    const key = `${r.from_id}:${r.rel_type}:${r.to_id}`;
    if (relKeys.has(key)) return false;
    relKeys.add(key);
    return true;
  });

  return {
    figures: newFigures,
    works: newWorks,
    relationships: dedupedRels,
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function buildBatchImportJSON(
  topic: string,
  result: ExtractionResult,
): BatchImportJSON {
  const today = new Date().toISOString().split('T')[0];

  return {
    metadata: {
      source: 'Wikipedia (Gemini extraction)',
      curator: 'gemini-extraction-pipeline',
      date: today,
      description: `Extracted from Wikipedia articles related to: ${topic}`,
    },
    figures: result.figures,
    works: result.works,
    relationships: result.relationships,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const topic = args.topic || 'Unknown Topic';

  console.log(`\n  Fictotum Gemini Extraction Pipeline`);
  console.log(`  ====================================`);
  console.log(`  Topic: ${topic}`);
  if (args.url) console.log(`  URL: ${args.url}`);
  console.log(`  Max articles: ${args.maxArticles}`);
  if (args.dryRun) console.log(`  Mode: DRY RUN (no output file)`);

  // Check environment
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('\n  ERROR: GEMINI_API_KEY not set');
    process.exit(1);
  }

  const neo4jUri = process.env.NEO4J_URI;
  const neo4jUser = process.env.NEO4J_USERNAME;
  const neo4jPassword = process.env.NEO4J_PASSWORD;
  if (!neo4jUri || !neo4jUser || !neo4jPassword) {
    console.error('\n  ERROR: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD must be set');
    process.exit(1);
  }

  const genai = new GoogleGenerativeAI(geminiKey);
  const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));

  try {
    // Step 1: Find articles
    let articleTitles: string[];
    if (args.url) {
      const article = await fetchWikipediaArticle(args.url);
      articleTitles = [article.title];
    } else {
      console.log(`\n  Step 1: Finding related Wikipedia articles...`);
      articleTitles = await findRelatedArticles(topic, args.maxArticles);
      console.log(`    Found ${articleTitles.length} articles: ${articleTitles.join(', ')}`);
    }

    // Step 2: Fetch and extract from each article
    console.log(`\n  Step 2: Extracting data from articles via Gemini...`);
    const rawResults: ExtractionResult[] = [];

    for (const title of articleTitles) {
      console.log(`\n    Processing: ${title}`);
      try {
        const article = await fetchWikipediaArticle(title);
        console.log(`      Fetched ${article.extract.length} chars`);

        const extraction = await extractFromArticle(genai, article);
        console.log(`      Extracted: ${extraction.figures?.length || 0} figures, ${extraction.works?.length || 0} works, ${extraction.relationships?.length || 0} relationships`);

        rawResults.push(extraction);

        // Rate limit Gemini
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`      ERROR: ${err instanceof Error ? err.message : err}`);
      }
    }

    if (rawResults.length === 0) {
      console.error('\n  ERROR: No data extracted from any article');
      process.exit(1);
    }

    // Step 3: Resolve and deduplicate
    console.log(`\n  Step 3: Entity resolution and deduplication...`);
    const merged = await resolveAndDeduplicate(rawResults, driver);

    console.log(`\n  Results:`);
    console.log(`    Figures: ${merged.figures.length}`);
    console.log(`    Works: ${merged.works.length}`);
    console.log(`    Relationships: ${merged.relationships.length}`);

    // Step 4: Build and output batch-import JSON
    const batchJSON = buildBatchImportJSON(topic, merged);

    if (args.dryRun) {
      console.log(`\n  DRY RUN — Preview:`);
      console.log(JSON.stringify(batchJSON, null, 2));
    } else {
      const outputPath = args.output || `data/${topic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_extraction.json`;
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), '..', outputPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, JSON.stringify(batchJSON, null, 2));
      console.log(`\n  Output saved to: ${outputPath}`);
      console.log(`\n  Next steps:`);
      console.log(`    1. Review the JSON for accuracy`);
      console.log(`    2. python3 scripts/import/validate_batch_json.py ${outputPath}`);
      console.log(`    3. python3 scripts/import/batch_import.py ${outputPath} --dry-run`);
      console.log(`    4. python3 scripts/import/batch_import.py ${outputPath} --execute`);
    }
  } finally {
    await driver.close();
  }
}

main().catch(err => {
  console.error(`\n  FATAL: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
