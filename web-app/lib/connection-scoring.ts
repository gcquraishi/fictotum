import 'server-only';
import { getSession } from './neo4j';

/**
 * Connection scoring — graph-only signals for the discovery agent.
 *
 * Scores candidate connections between a source figure and other figures
 * using purely graph-structural signals (no embeddings, no LLM calls).
 *
 * Signals:
 *   - hopDistance: shortest path length (fewer = stronger, but 1 is trivial)
 *   - crossEraSurprise: figures from different eras connected through shared media
 *   - sentimentDivergence: same figure portrayed with different sentiments across works
 *   - sharedMediaCount: number of media works where both figures appear
 *   - propertyCompleteness: how well-documented the figure is (0-1)
 *   - relationshipDiversity: variety of relationship types in the path
 */

export interface ConnectionCandidate {
  /** The other figure's canonical_id */
  targetId: string;
  targetName: string;
  targetEra?: string;
  targetBirthYear?: number;
  targetDeathYear?: number;
  targetDescription?: string;

  /** Graph signals */
  hopDistance: number;
  sharedMediaCount: number;
  sharedMediaTitles: string[];
  crossEraSurprise: number;
  sentimentDivergence: number;
  propertyCompleteness: number;
  relationshipTypes: string[];

  /** Composite score (0-100) */
  score: number;

  /** Path summary for narration context */
  pathSummary: string;
}

export interface SourceFigureContext {
  canonicalId: string;
  name: string;
  era?: string;
  birthYear?: number;
  deathYear?: number;
  description?: string;
  portrayalCount: number;
  sentiments: Record<string, number>;
}

/**
 * Find and score connection candidates for a given figure.
 * Returns the top N candidates sorted by composite score.
 */
export async function findConnectionCandidates(
  canonicalId: string,
  limit: number = 5,
): Promise<{ source: SourceFigureContext; candidates: ConnectionCandidate[] }> {
  const session = await getSession();

  try {
    // Step 1: Get source figure context
    const sourceResult = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $canonicalId})
       OPTIONAL MATCH (f)-[r:APPEARS_IN]->(m:MediaWork)
       WITH f, count(m) as portrayalCount,
            [s IN collect(r.sentiment) WHERE s IS NOT NULL] as sentiments
       RETURN f.canonical_id AS canonical_id,
              f.name AS name,
              f.era AS era,
              f.birth_year AS birth_year,
              f.death_year AS death_year,
              f.description AS description,
              portrayalCount,
              sentiments`,
      { canonicalId },
    );

    if (sourceResult.records.length === 0) {
      throw new Error(`Figure not found: ${canonicalId}`);
    }

    const sr = sourceResult.records[0];
    const sentimentList: string[] = sr.get('sentiments') || [];
    const sentimentCounts: Record<string, number> = {};
    for (const s of sentimentList) {
      sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
    }

    const source: SourceFigureContext = {
      canonicalId: sr.get('canonical_id'),
      name: sr.get('name'),
      era: sr.get('era') || undefined,
      birthYear: sr.get('birth_year') ?? undefined,
      deathYear: sr.get('death_year') ?? undefined,
      description: sr.get('description') || undefined,
      portrayalCount: sr.get('portrayalCount')?.toNumber?.() ?? Number(sr.get('portrayalCount')),
      sentiments: sentimentCounts,
    };

    // Step 2: Find candidates via shared media (2-hop connections through MediaWork)
    const candidateResult = await session.run(
      `MATCH (source:HistoricalFigure {canonical_id: $canonicalId})-[:APPEARS_IN]->(m:MediaWork)<-[:APPEARS_IN]-(target:HistoricalFigure)
       WHERE target.canonical_id <> $canonicalId
       WITH target, collect(DISTINCT m.title) AS sharedTitles, count(DISTINCT m) AS sharedCount
       ORDER BY sharedCount DESC
       LIMIT 30
       OPTIONAL MATCH (target)-[tr:APPEARS_IN]->(tm:MediaWork)
       WITH target, sharedTitles, sharedCount,
            collect(tr.sentiment) AS targetSentiments,
            count(tm) AS targetPortrayalCount
       RETURN target.canonical_id AS target_id,
              target.name AS target_name,
              target.era AS target_era,
              target.birth_year AS target_birth_year,
              target.death_year AS target_death_year,
              target.description AS target_description,
              target.wikidata_id AS target_wikidata_id,
              target.title AS target_title,
              target.image_url AS target_image_url,
              sharedTitles,
              sharedCount,
              targetSentiments,
              targetPortrayalCount`,
      { canonicalId },
    );

    // Step 3: Also find figures connected via INTERACTED_WITH (direct links)
    const interactionResult = await session.run(
      `MATCH (source:HistoricalFigure {canonical_id: $canonicalId})-[r:INTERACTED_WITH]-(target:HistoricalFigure)
       RETURN target.canonical_id AS target_id,
              target.name AS target_name,
              target.era AS target_era,
              r.relationship_type AS rel_type,
              r.context AS context`,
      { canonicalId },
    );

    const directInteractions = new Map<string, { relType: string; context?: string }>();
    for (const rec of interactionResult.records) {
      directInteractions.set(rec.get('target_id'), {
        relType: rec.get('rel_type') || 'INTERACTED_WITH',
        context: rec.get('context') || undefined,
      });
    }

    // Step 4: Find 3+ hop connections for surprise factor
    // Neo4j shortestPath requires min length 0 or 1, so we filter by length after
    const distantResult = await session.run(
      `MATCH (source:HistoricalFigure {canonical_id: $canonicalId})
       MATCH path = shortestPath((source)-[*..6]-(target:HistoricalFigure))
       WHERE target.canonical_id <> $canonicalId
         AND ALL(rel IN relationships(path) WHERE type(rel) IN ['APPEARS_IN', 'INTERACTED_WITH', 'CONTEMPORARY', 'NEMESIS_OF'])
         AND length(path) >= 3
       WITH target, length(path) AS hops,
            [n IN nodes(path) | labels(n)[0] + ':' + coalesce(n.name, n.title, '')] AS pathNodes,
            [r IN relationships(path) | type(r)] AS pathRels
       ORDER BY hops ASC
       LIMIT 20
       OPTIONAL MATCH (target)-[tr:APPEARS_IN]->(tm:MediaWork)
       WITH target, hops, pathNodes, pathRels,
            collect(tr.sentiment) AS targetSentiments
       RETURN target.canonical_id AS target_id,
              target.name AS target_name,
              target.era AS target_era,
              target.birth_year AS target_birth_year,
              target.death_year AS target_death_year,
              target.description AS target_description,
              hops,
              pathNodes,
              pathRels,
              targetSentiments`,
      { canonicalId },
    );

    // Step 5: Score all candidates
    const candidateMap = new Map<string, ConnectionCandidate>();

    // Process shared-media candidates (hop distance = 2)
    for (const rec of candidateResult.records) {
      const targetId = rec.get('target_id');
      const sharedTitles: string[] = rec.get('sharedTitles') || [];
      const sharedCount = rec.get('sharedCount')?.toNumber?.() ?? Number(rec.get('sharedCount'));
      const targetSentiments: string[] = rec.get('targetSentiments') || [];

      const candidate: ConnectionCandidate = {
        targetId,
        targetName: rec.get('target_name'),
        targetEra: rec.get('target_era') || undefined,
        targetBirthYear: rec.get('target_birth_year') ?? undefined,
        targetDeathYear: rec.get('target_death_year') ?? undefined,
        targetDescription: rec.get('target_description') || undefined,
        hopDistance: directInteractions.has(targetId) ? 1 : 2,
        sharedMediaCount: sharedCount,
        sharedMediaTitles: sharedTitles,
        crossEraSurprise: computeCrossEraSurprise(source.era, rec.get('target_era')),
        sentimentDivergence: computeSentimentDivergence(sentimentList, targetSentiments),
        propertyCompleteness: computePropertyCompleteness(rec),
        relationshipTypes: directInteractions.has(targetId)
          ? ['INTERACTED_WITH', 'APPEARS_IN']
          : ['APPEARS_IN'],
        score: 0,
        pathSummary: `Both appear in: ${sharedTitles.slice(0, 3).join(', ')}${sharedTitles.length > 3 ? ` (+${sharedTitles.length - 3} more)` : ''}`,
      };

      candidate.score = computeCompositeScore(candidate, source);
      candidateMap.set(targetId, candidate);
    }

    // Process distant candidates (hop distance 3+)
    for (const rec of distantResult.records) {
      const targetId = rec.get('target_id');
      if (candidateMap.has(targetId)) continue; // Already found via shared media

      const hops = rec.get('hops')?.toNumber?.() ?? Number(rec.get('hops'));
      const pathNodes: string[] = rec.get('pathNodes') || [];
      const pathRels: string[] = rec.get('pathRels') || [];
      const targetSentiments: string[] = rec.get('targetSentiments') || [];

      const pathSummary = buildPathSummary(pathNodes, pathRels);

      const candidate: ConnectionCandidate = {
        targetId,
        targetName: rec.get('target_name'),
        targetEra: rec.get('target_era') || undefined,
        targetBirthYear: rec.get('target_birth_year') ?? undefined,
        targetDeathYear: rec.get('target_death_year') ?? undefined,
        targetDescription: rec.get('target_description') || undefined,
        hopDistance: hops,
        sharedMediaCount: 0,
        sharedMediaTitles: [],
        crossEraSurprise: computeCrossEraSurprise(source.era, rec.get('target_era')),
        sentimentDivergence: computeSentimentDivergence(sentimentList, targetSentiments),
        propertyCompleteness: computePropertyCompleteness(rec),
        relationshipTypes: [...new Set(pathRels)],
        score: 0,
        pathSummary,
      };

      candidate.score = computeCompositeScore(candidate, source);
      candidateMap.set(targetId, candidate);
    }

    // Sort by score and return top N
    const candidates = Array.from(candidateMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { source, candidates };
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------
// Signal computation
// ---------------------------------------------------------------------------

function computeCrossEraSurprise(sourceEra?: string, targetEra?: string): number {
  if (!sourceEra || !targetEra) return 0.3; // Unknown eras get mild surprise
  if (sourceEra === targetEra) return 0; // Same era, no surprise

  const eraOrder = [
    'Ancient', 'Ancient Egypt', 'Ancient Greece', 'Classical Antiquity', 'Ancient Rome',
    'Medieval', 'Middle Ages', 'Renaissance', 'Tudor', 'Early Modern',
    'Enlightenment', 'Napoleonic', 'Victorian Era', 'World War', 'Modern', 'Contemporary',
  ];

  const sourceIdx = eraOrder.findIndex(e => sourceEra.toLowerCase().includes(e.toLowerCase()));
  const targetIdx = eraOrder.findIndex(e => targetEra.toLowerCase().includes(e.toLowerCase()));

  if (sourceIdx === -1 || targetIdx === -1) return 0.5; // Unknown era mapping
  const distance = Math.abs(sourceIdx - targetIdx);
  return Math.min(1, distance / 8); // Normalize to 0-1, max at 8 eras apart
}

function computeSentimentDivergence(
  sourceSentiments: string[],
  targetSentiments: string[],
): number {
  if (sourceSentiments.length === 0 || targetSentiments.length === 0) return 0;

  const sentimentValues: Record<string, number> = {
    heroic: 1,
    complex: 0,
    villainous: -1,
  };

  const sourceAvg = average(sourceSentiments.map(s => sentimentValues[s.toLowerCase()] ?? 0));
  const targetAvg = average(targetSentiments.map(s => sentimentValues[s.toLowerCase()] ?? 0));

  return Math.abs(sourceAvg - targetAvg) / 2; // Normalize to 0-1
}

function computePropertyCompleteness(record: any): number {
  let score = 0;
  let max = 5;
  if (record.get('target_name')) score++;
  if (record.get('target_era')) score++;
  if (record.get('target_birth_year') != null) score++;
  if (record.get('target_death_year') != null) score++;
  if (record.get('target_description')) score++;
  return score / max;
}

function computeCompositeScore(
  candidate: ConnectionCandidate,
  source: SourceFigureContext,
): number {
  // Weights tuned for "interesting, non-obvious" connections
  const weights = {
    hopDistance: 20,       // Prefer 2-3 hops (not 1, not 6+)
    crossEraSurprise: 30, // Cross-era connections are the "wow" factor
    sharedMedia: 15,      // More shared media = stronger connection
    sentimentDiv: 15,     // Divergent portrayals are interesting
    completeness: 10,     // Better-documented figures make better stories
    diversity: 10,        // Diverse relationship types are more interesting
  };

  // Hop distance: sweet spot is 2-3 hops
  let hopScore: number;
  if (candidate.hopDistance === 1) hopScore = 0.4; // Direct interaction, interesting but obvious
  else if (candidate.hopDistance === 2) hopScore = 0.8; // Shared media, good
  else if (candidate.hopDistance === 3) hopScore = 1.0; // Sweet spot — non-obvious
  else if (candidate.hopDistance === 4) hopScore = 0.7;
  else hopScore = Math.max(0.2, 1 - (candidate.hopDistance - 3) * 0.2);

  // Shared media: logarithmic — 1 shared work is OK, 5+ is great
  const mediaScore = candidate.sharedMediaCount > 0
    ? Math.min(1, Math.log2(candidate.sharedMediaCount + 1) / 3)
    : 0;

  // Relationship diversity
  const diversityScore = Math.min(1, candidate.relationshipTypes.length / 3);

  const raw =
    weights.hopDistance * hopScore +
    weights.crossEraSurprise * candidate.crossEraSurprise +
    weights.sharedMedia * mediaScore +
    weights.sentimentDiv * candidate.sentimentDivergence +
    weights.completeness * candidate.propertyCompleteness +
    weights.diversity * diversityScore;

  return Math.round(raw);
}

function buildPathSummary(pathNodes: string[], pathRels: string[]): string {
  if (pathNodes.length < 2) return '';

  const steps: string[] = [];
  for (let i = 0; i < pathRels.length; i++) {
    const fromLabel = pathNodes[i]?.split(':')[0] || '';
    const fromName = pathNodes[i]?.split(':').slice(1).join(':') || '';
    const rel = pathRels[i];
    const toName = pathNodes[i + 1]?.split(':').slice(1).join(':') || '';

    if (rel === 'APPEARS_IN') {
      if (fromLabel === 'HistoricalFigure') {
        steps.push(`${fromName} appears in ${toName}`);
      } else {
        steps.push(`${toName} appears in ${fromName}`);
      }
    } else if (rel === 'INTERACTED_WITH') {
      steps.push(`${fromName} interacted with ${toName}`);
    } else {
      steps.push(`${fromName} → ${toName}`);
    }
  }

  return steps.join(' → ');
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
