export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession as getNeo4jSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';

/**
 * CHR-44: Analytics Event Tracking API
 *
 * Receives and stores analytics events in Neo4j.
 * Privacy-first: No PII collection, GDPR/CCPA compliant.
 * Requires authentication to prevent abuse.
 */

interface AnalyticsEvent {
  type: string;
  [key: string]: any;
}

interface AnalyticsPayload {
  event: AnalyticsEvent;
  timestamp: string;
  session_id: string;
  user_agent?: string;
  referrer?: string;
}

export async function POST(request: Request) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: AnalyticsPayload = await request.json();

    // Validation
    if (!payload.event || !payload.event.type || !payload.timestamp || !payload.session_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const dbSession = await getNeo4jSession();

    try {
      await dbSession.run(
        `
        CREATE (e:AnalyticsEvent {
          event_id: randomUUID(),
          event_type: $event_type,
          timestamp: datetime($timestamp),
          session_id: $session_id,
          event_data: $event_data,
          user_agent: $user_agent,
          referrer: $referrer
        })
        `,
        {
          event_type: payload.event.type,
          timestamp: payload.timestamp,
          session_id: payload.session_id,
          event_data: JSON.stringify(payload.event),
          user_agent: payload.user_agent || null,
          referrer: payload.referrer || null,
        }
      );

      return NextResponse.json({ success: true });
    } finally {
      await dbSession.close();
    }
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ success: true });
  }
}
