export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { findConnectionCandidates } from '@/lib/connection-scoring';
import Anthropic from '@anthropic-ai/sdk';

/**
 * GET /api/figure/[id]/discover
 *
 * Discovery agent: finds and narrates interesting connections for a figure.
 * Pipeline: Cypher candidates → graph-only scoring → Claude Sonnet narration
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing figure ID' }, { status: 400 });
  }

  try {
    // Step 1: Find and score candidates using graph signals
    const { source, candidates } = await findConnectionCandidates(id, 5);

    if (candidates.length === 0) {
      return NextResponse.json({
        source: { name: source.name, canonicalId: source.canonicalId },
        connections: [],
        message: 'No interesting connections found in the graph.',
      });
    }

    // Step 2: Narrate with Claude (if API key available)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Return scored candidates without narration
      return NextResponse.json({
        source: { name: source.name, canonicalId: source.canonicalId },
        connections: candidates.map(c => ({
          targetId: c.targetId,
          targetName: c.targetName,
          targetEra: c.targetEra,
          score: c.score,
          hopDistance: c.hopDistance,
          sharedMedia: c.sharedMediaTitles,
          pathSummary: c.pathSummary,
          narration: null,
        })),
        narrated: false,
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Build narration prompt with graph evidence
    const connectionsContext = candidates.map((c, i) => {
      const parts: string[] = [
        `Connection ${i + 1}: ${source.name} ↔ ${c.targetName}`,
        `Score: ${c.score}/100`,
        `Graph distance: ${c.hopDistance} hops`,
      ];
      if (c.sharedMediaCount > 0) {
        parts.push(`Shared media: ${c.sharedMediaTitles.join(', ')}`);
      }
      if (c.crossEraSurprise > 0.3) {
        parts.push(`Cross-era: ${source.era || 'unknown'} ↔ ${c.targetEra || 'unknown'}`);
      }
      if (c.pathSummary) {
        parts.push(`Path: ${c.pathSummary}`);
      }
      if (c.targetDescription) {
        parts.push(`About ${c.targetName}: ${c.targetDescription}`);
      }
      return parts.join('\n');
    }).join('\n\n');

    const narrationResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a historian writing brief, engaging connection notes for a knowledge graph explorer called Fictotum. For each connection below, write 2-3 sentences explaining WHY this connection is historically interesting. Ground every claim in the graph data provided — cite specific media works, eras, or relationship types. Never fabricate facts not in the data.

Source figure: ${source.name}${source.era ? ` (${source.era})` : ''}${source.description ? ` — ${source.description}` : ''}

${connectionsContext}

For each connection, respond with a JSON array of objects: [{"targetId": "...", "narration": "..."}]
Only output the JSON array, no other text.`,
      }],
    });

    // Parse narrations
    const narrationText = narrationResponse.content[0]?.type === 'text'
      ? narrationResponse.content[0].text
      : '';

    let narrations: Array<{ targetId: string; narration: string }> = [];
    try {
      narrations = JSON.parse(narrationText);
    } catch {
      // If parsing fails, use raw text as single narration
      narrations = candidates.map(c => ({
        targetId: c.targetId,
        narration: c.pathSummary,
      }));
    }

    const narrationMap = new Map(narrations.map(n => [n.targetId, n.narration]));

    return NextResponse.json({
      source: { name: source.name, canonicalId: source.canonicalId },
      connections: candidates.map(c => ({
        targetId: c.targetId,
        targetName: c.targetName,
        targetEra: c.targetEra,
        score: c.score,
        hopDistance: c.hopDistance,
        sharedMedia: c.sharedMediaTitles,
        pathSummary: c.pathSummary,
        narration: narrationMap.get(c.targetId) || c.pathSummary,
      })),
      narrated: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Discovery agent error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
