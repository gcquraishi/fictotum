export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { findConnectionCandidates } from '@/lib/connection-scoring';
import { withCache } from '@/lib/cache';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';
import Anthropic from '@anthropic-ai/sdk';

// Rate limit: 5 requests per 15-minute window per IP.
// This is a costly endpoint (Anthropic API call) so we keep it tight.
const limiter = new RateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 });

// Cache TTL: 1 hour. Discovery results are deterministic for a given figure
// until the graph changes, so caching is very safe here.
const DISCOVER_CACHE_TTL = 60 * 60 * 1000;

/**
 * GET /api/figure/[id]/discover
 *
 * Discovery agent: finds and narrates interesting connections for a figure.
 * Pipeline: Cypher candidates -> graph-only scoring -> Claude Sonnet narration
 *
 * Protections:
 *   - IP-based rate limiting (5 req / 15 min)
 *   - Response caching (1 hour TTL per figure)
 *   - Input validation (id length capped)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.length > 64) {
    return NextResponse.json({ error: 'Invalid figure ID' }, { status: 400 });
  }

  // Rate limiting
  const clientIp = getClientIp(request);
  const { allowed, remaining, resetAt } = limiter.check(clientIp);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  try {
    // Check cache first — this wraps the entire pipeline (graph scoring + narration)
    const cacheKey = `discover:${id}`;
    const result = await withCache(
      cacheKey,
      () => computeDiscovery(id),
      { ttl: DISCOVER_CACHE_TTL, cacheType: 'search' },
    );

    const response = NextResponse.json(result);
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Discovery agent error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Core discovery pipeline — separated so it can be cached.
 */
async function computeDiscovery(id: string) {
  // Step 1: Find and score candidates using graph signals
  const { source, candidates } = await findConnectionCandidates(id, 5);

  if (candidates.length === 0) {
    return {
      source: { name: source.name, canonicalId: source.canonicalId },
      connections: [],
      message: 'No interesting connections found in the graph.',
    };
  }

  // Step 2: Narrate with Claude (if API key available)
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    // Return scored candidates without narration (no-cost fallback)
    return {
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
    };
  }

  const anthropic = new Anthropic({ apiKey });

  // Build narration prompt with graph evidence
  const connectionsContext = candidates.map((c, i) => {
    const parts: string[] = [
      `Connection ${i + 1}: ${source.name} <-> ${c.targetName}`,
      `Score: ${c.score}/100`,
      `Graph distance: ${c.hopDistance} hops`,
    ];
    if (c.sharedMediaCount > 0) {
      parts.push(`Shared media: ${c.sharedMediaTitles.join(', ')}`);
    }
    if (c.crossEraSurprise > 0.3) {
      parts.push(`Cross-era: ${source.era || 'unknown'} <-> ${c.targetEra || 'unknown'}`);
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

  return {
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
  };
}
