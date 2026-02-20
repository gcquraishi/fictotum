export const dynamic = 'force-dynamic';
// file: web-app/app/api/ai/suggest-eras/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Era Suggestion Endpoint
 *
 * Uses Gemini AI to suggest additional era tags for media works based on:
 * - Work title
 * - Setting year (if available)
 * - Wikidata-derived era tags (if available)
 *
 * Returns 3-5 suggested era tags with confidence scores.
 * Graceful degradation if API key missing or request fails.
 */

interface EraSuggestion {
  name: string;
  confidence: number; // 0.0 - 1.0
}

interface SuggestErasResponse {
  suggestedTags: EraSuggestion[];
  aiAvailable: boolean;
  fallbackUsed?: boolean;
}

/**
 * Fallback era suggestions based on simple heuristics
 */
function getFallbackSuggestions(
  workTitle: string,
  settingYear?: number
): EraSuggestion[] {
  const suggestions: EraSuggestion[] = [];

  // Year-based heuristics
  if (settingYear) {
    if (settingYear >= 1837 && settingYear <= 1901) {
      suggestions.push({ name: 'Victorian Era', confidence: 0.85 });
    } else if (settingYear >= 1500 && settingYear <= 1800) {
      suggestions.push({ name: 'Early Modern Period', confidence: 0.75 });
    } else if (settingYear >= 500 && settingYear <= 1500) {
      suggestions.push({ name: 'Medieval Period', confidence: 0.75 });
    } else if (settingYear >= 1914 && settingYear <= 1918) {
      suggestions.push({ name: 'World War I Era', confidence: 0.90 });
    } else if (settingYear >= 1939 && settingYear <= 1945) {
      suggestions.push({ name: 'World War II Era', confidence: 0.90 });
    } else if (settingYear >= 1960 && settingYear <= 1990) {
      suggestions.push({ name: 'Cold War Era', confidence: 0.80 });
    } else if (settingYear >= 2000) {
      suggestions.push({ name: 'Contemporary Era', confidence: 0.70 });
    }
  }

  // Title-based keyword matching
  const titleLower = workTitle.toLowerCase();

  if (titleLower.includes('war') || titleLower.includes('battle')) {
    if (!suggestions.find(s => s.name.includes('War'))) {
      suggestions.push({ name: 'Military Era', confidence: 0.60 });
    }
  }

  if (titleLower.includes('renaissance')) {
    suggestions.push({ name: 'Renaissance', confidence: 0.85 });
  }

  if (titleLower.includes('medieval') || titleLower.includes('knight')) {
    if (!suggestions.find(s => s.name.includes('Medieval'))) {
      suggestions.push({ name: 'Medieval Period', confidence: 0.80 });
    }
  }

  if (titleLower.includes('victorian')) {
    if (!suggestions.find(s => s.name.includes('Victorian'))) {
      suggestions.push({ name: 'Victorian Era', confidence: 0.85 });
    }
  }

  if (titleLower.includes('modern') || titleLower.includes('contemporary')) {
    if (!suggestions.find(s => s.name.includes('Contemporary'))) {
      suggestions.push({ name: 'Contemporary Era', confidence: 0.65 });
    }
  }

  // Ensure we have at least some suggestions
  if (suggestions.length === 0) {
    suggestions.push({ name: 'Historical Period (unspecified)', confidence: 0.40 });
  }

  // Sort by confidence and return top 5
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * Use Gemini AI to suggest era tags
 */
async function getAISuggestions(
  workTitle: string,
  settingYear?: number,
  wikidataEras?: string[]
): Promise<EraSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[AI Era Suggest] GEMINI_API_KEY not configured, using fallback');
    return getFallbackSuggestions(workTitle, settingYear);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build context-aware prompt
    let prompt = `You are a historical era classification expert. Given a media work, suggest 3-5 relevant historical era tags.

Work Title: "${workTitle}"`;

    if (settingYear !== undefined) {
      prompt += `\nSetting Year: ${settingYear}`;
    }

    if (wikidataEras && wikidataEras.length > 0) {
      prompt += `\nWikidata Era Tags: ${wikidataEras.join(', ')}`;
    }

    prompt += `

Suggest 3-5 era tags that would be historically accurate and useful for categorization.
For each tag, provide a confidence score between 0.0 and 1.0.

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):
{
  "suggestions": [
    {"name": "Era Name", "confidence": 0.85},
    {"name": "Another Era", "confidence": 0.75}
  ]
}

Guidelines:
- Use standard era names (e.g., "Victorian Era", "Medieval Period", "Cold War Era")
- Higher confidence for eras that directly align with the setting year
- Include broader period tags when specific eras aren't clear
- Avoid overly specific tags unless highly confident
- Consider cultural/literary periods if relevant (e.g., "Romantic Period", "Modernist Era")`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    try {
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);

      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions
          .filter((s: any) => s.name && typeof s.confidence === 'number')
          .map((s: any) => ({
            name: s.name,
            confidence: Math.max(0, Math.min(1, s.confidence)), // Clamp to 0-1
          }))
          .slice(0, 5); // Limit to 5 suggestions
      }
    } catch (parseError) {
      console.error('[AI Era Suggest] Failed to parse AI response:', parseError);
      console.error('[AI Era Suggest] Raw response:', text);
    }

    // If parsing failed, fall back to heuristics
    return getFallbackSuggestions(workTitle, settingYear);
  } catch (error) {
    console.error('[AI Era Suggest] Gemini API error:', error);
    // Graceful degradation to fallback
    return getFallbackSuggestions(workTitle, settingYear);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { workTitle, settingYear, wikidataEras } = body;

    // Validate required fields
    if (!workTitle) {
      return NextResponse.json(
        { error: 'workTitle is required' },
        { status: 400 }
      );
    }

    const aiAvailable = !!process.env.GEMINI_API_KEY;
    let suggestedTags: EraSuggestion[] = [];
    let fallbackUsed = false;

    try {
      suggestedTags = await getAISuggestions(
        workTitle,
        settingYear,
        wikidataEras
      );

      // Check if we fell back to heuristics (AI unavailable or failed)
      if (!aiAvailable) {
        fallbackUsed = true;
      }
    } catch (error) {
      console.error('[AI Era Suggest] Error getting suggestions:', error);
      // Use fallback on any error
      suggestedTags = getFallbackSuggestions(workTitle, settingYear);
      fallbackUsed = true;
    }

    const response: SuggestErasResponse = {
      suggestedTags,
      aiAvailable,
    };

    if (fallbackUsed) {
      response.fallbackUsed = true;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[AI Era Suggest] Endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Example curl test:
 *
 * # Basic request with just title
 * curl -X POST http://localhost:3000/api/ai/suggest-eras \
 *   -H "Content-Type: application/json" \
 *   -d '{"workTitle": "Pride and Prejudice"}'
 *
 * # Request with setting year
 * curl -X POST http://localhost:3000/api/ai/suggest-eras \
 *   -H "Content-Type: application/json" \
 *   -d '{"workTitle": "War and Peace", "settingYear": 1812}'
 *
 * # Request with Wikidata eras
 * curl -X POST http://localhost:3000/api/ai/suggest-eras \
 *   -H "Content-Type: application/json" \
 *   -d '{"workTitle": "1984", "settingYear": 1984, "wikidataEras": ["Dystopian Fiction Period"]}'
 */
