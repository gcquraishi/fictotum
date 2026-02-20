export const dynamic = 'force-dynamic';
// file: web-app/app/api/ai/validate-location/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// AI LOCATION VALIDATION ENDPOINT
// ============================================================================
// This endpoint validates user-suggested locations using Gemini AI.
// It checks if the location is plausible for the given work context and
// attempts to find a Wikidata Q-ID if not provided.
//
// Use case: User contributes "A Place of Greater Safety" (French Revolution novel)
// and suggests "Paris" as a location. AI validates this is plausible and finds Q90.
// ============================================================================

interface ValidationRequest {
  name: string;
  wikidataId?: string;
  workTitle: string;
  workYear?: number;
  notes?: string;
}

interface ValidationResponse {
  valid: boolean;
  confidence: number;
  wikidataId?: string;
  suggestion?: string;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();
    const { name, wikidataId, workTitle, workYear, notes } = body;

    // Input validation
    if (!name || !workTitle) {
      return NextResponse.json(
        { error: 'Location name and work title are required' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[AI Validate Location] GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI validation service not configured' },
        { status: 503 }
      );
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Construct validation prompt
    const prompt = `You are validating a location suggestion for a historical media work database.

**Task:** Determine if "${name}" is a plausible location for the work "${workTitle}"${workYear ? ` (set around ${workYear})` : ''}.

**Context:**
- Location name: ${name}
${wikidataId ? `- Provided Wikidata Q-ID: ${wikidataId}` : '- No Wikidata Q-ID provided'}
${notes ? `- User notes: ${notes}` : ''}
- Work title: ${workTitle}
${workYear ? `- Work setting year: ${workYear}` : ''}

**Instructions:**
1. Evaluate if this location is:
   - A real historical or modern place
   - A plausible fictional location for this work
   - Related to the work's setting or narrative

2. Consider both historical and fictional locations as valid if they make sense for the work.

3. Assign a confidence score:
   - 1.0 = Definitely valid (famous real location or known fictional place)
   - 0.7-0.9 = Probably valid (less well-known but plausible)
   - 0.4-0.6 = Uncertain (could be valid but needs verification)
   - 0.0-0.3 = Probably invalid (unlikely or nonsensical)

4. If no Wikidata Q-ID was provided and this is a real location, try to suggest one.

**Respond with JSON only:**
{
  "valid": boolean,
  "confidence": number (0.0-1.0),
  "wikidataId": "Q12345" or null,
  "reasoning": "Brief explanation of why this location is or isn't plausible"
}

**Examples:**
- "Paris" for "A Place of Greater Safety" (French Revolution) → valid: true, confidence: 1.0, wikidataId: "Q90"
- "Narnia" for "The Lion, The Witch and the Wardrobe" → valid: true, confidence: 1.0, wikidataId: "Q483412"
- "XYZ123" for any work → valid: false, confidence: 0.0, wikidataId: null
- "London" for "Harry Potter" → valid: true, confidence: 1.0, wikidataId: "Q84"`;

    // Call Gemini AI
    console.log(`[AI Validate Location] Validating "${name}" for "${workTitle}"...`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let validationResult: ValidationResponse;
    try {
      // Extract JSON from response (sometimes wrapped in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      validationResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[AI Validate Location] Failed to parse AI response:', text);
      return NextResponse.json(
        {
          error: 'AI validation failed to return valid response',
          rawResponse: text
        },
        { status: 500 }
      );
    }

    // Ensure confidence is within bounds
    validationResult.confidence = Math.max(0, Math.min(1, validationResult.confidence));

    // Log result
    console.log(`[AI Validate Location] Result: valid=${validationResult.valid}, confidence=${validationResult.confidence}, wikidataId=${validationResult.wikidataId}`);

    return NextResponse.json(validationResult, { status: 200 });

  } catch (error) {
    console.error('[AI Validate Location] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during validation' },
      { status: 500 }
    );
  }
}
