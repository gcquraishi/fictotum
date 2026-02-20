export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

/**
 * CHR-44: Analytics Event Tracking API
 *
 * Receives and stores analytics events in Neo4j.
 * Privacy-first: No PII collection, GDPR/CCPA compliant.
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
    const payload: AnalyticsPayload = await request.json();

    // Validation
    if (!payload.event || !payload.event.type || !payload.timestamp || !payload.session_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Import Neo4j driver
    const neo4j = require('neo4j-driver');
    const driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    );

    const session = driver.session({ database: 'neo4j' });

    try {
      // Store analytics event in Neo4j
      // Using a simple AnalyticsEvent node with properties
      await session.run(
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
      await session.close();
      await driver.close();
    }
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Return success even on error to avoid breaking client
    return NextResponse.json({ success: true });
  }
}
