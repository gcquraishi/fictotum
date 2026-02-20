export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

/**
 * CHR-44: Analytics Statistics API
 *
 * Aggregates analytics data for dashboard display.
 * Provides insights into user behavior and usage patterns.
 */

interface AnalyticsStats {
  timestamp: string;
  time_range: string;
  overview: {
    total_events: number;
    unique_sessions: number;
    page_views: number;
    search_queries: number;
    contributions: number;
  };
  top_pages: Array<{ path: string; views: number }>;
  top_searches: Array<{ query: string; count: number; avg_results: number }>;
  graph_interactions: {
    expand: number;
    collapse: number;
    navigate: number;
  };
  contribution_funnel: {
    started: number;
    completed: number;
    completion_rate: number;
  };
  popular_eras: Array<{ era: string; count: number }>;
  popular_media_types: Array<{ media_type: string; count: number }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '7d'; // 1d, 7d, 30d

    // Calculate date threshold
    const now = new Date();
    let daysAgo = 7;
    if (timeRange === '1d') daysAgo = 1;
    else if (timeRange === '30d') daysAgo = 30;

    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - daysAgo);

    const neo4j = require('neo4j-driver');
    const driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    );

    const session = driver.session({ database: 'neo4j' });

    try {
      // 1. Overview Statistics
      const overviewResult = await session.run(
        `
        MATCH (e:AnalyticsEvent)
        WHERE e.timestamp >= datetime($threshold)
        WITH e.event_type as event_type, e.session_id as session_id
        RETURN
          count(*) as total_events,
          count(DISTINCT session_id) as unique_sessions,
          sum(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as page_views,
          sum(CASE WHEN event_type = 'search_query' THEN 1 ELSE 0 END) as search_queries,
          sum(CASE WHEN event_type IN ['contribution_start', 'contribution_complete'] THEN 1 ELSE 0 END) as contributions
        `,
        { threshold: threshold.toISOString() }
      );

      const overviewData = overviewResult.records[0] || null;
      const overview = {
        total_events: overviewData ? overviewData.get('total_events').toNumber() : 0,
        unique_sessions: overviewData ? overviewData.get('unique_sessions').toNumber() : 0,
        page_views: overviewData ? overviewData.get('page_views').toNumber() : 0,
        search_queries: overviewData ? overviewData.get('search_queries').toNumber() : 0,
        contributions: overviewData ? overviewData.get('contributions').toNumber() : 0,
      };

      // 2. Top Pages
      const topPagesResult = await session.run(
        `
        MATCH (e:AnalyticsEvent)
        WHERE e.timestamp >= datetime($threshold)
          AND e.event_type = 'page_view'
        WITH e.event_data as data
        UNWIND split(data, '"path":"') as part
        WITH split(part, '"')[0] as path
        WHERE path <> data AND path <> ''
        RETURN path, count(*) as views
        ORDER BY views DESC
        LIMIT 10
        `,
        { threshold: threshold.toISOString() }
      );

      const top_pages = topPagesResult.records.map((record: any) => ({
        path: record.get('path'),
        views: record.get('views').toNumber(),
      }));

      // 3. Top Searches
      const topSearchesResult = await session.run(
        `
        MATCH (e:AnalyticsEvent)
        WHERE e.timestamp >= datetime($threshold)
          AND e.event_type = 'search_query'
        WITH e.event_data as data
        UNWIND split(data, '"query":"') as part
        WITH split(part, '"')[0] as query,
             toInteger(split(split(data, '"results_count":')[1], ',')[0]) as results
        WHERE query <> data AND query <> ''
        RETURN query, count(*) as count, avg(results) as avg_results
        ORDER BY count DESC
        LIMIT 10
        `,
        { threshold: threshold.toISOString() }
      );

      const top_searches = topSearchesResult.records.map((record: any) => ({
        query: record.get('query'),
        count: record.get('count').toNumber(),
        avg_results: record.get('avg_results') ? Math.round(record.get('avg_results')) : 0,
      }));

      // 4. Graph Interactions
      const graphInteractionsResult = await session.run(
        `
        MATCH (e:AnalyticsEvent)
        WHERE e.timestamp >= datetime($threshold)
          AND e.event_type = 'graph_interaction'
        WITH e.event_data as data
        RETURN
          sum(CASE WHEN data CONTAINS '"action":"expand"' THEN 1 ELSE 0 END) as expand,
          sum(CASE WHEN data CONTAINS '"action":"collapse"' THEN 1 ELSE 0 END) as collapse,
          sum(CASE WHEN data CONTAINS '"action":"navigate"' THEN 1 ELSE 0 END) as navigate
        `,
        { threshold: threshold.toISOString() }
      );

      const graphData = graphInteractionsResult.records[0];
      const graph_interactions = {
        expand: graphData ? graphData.get('expand').toNumber() : 0,
        collapse: graphData ? graphData.get('collapse').toNumber() : 0,
        navigate: graphData ? graphData.get('navigate').toNumber() : 0,
      };

      // 5. Contribution Funnel
      const contributionFunnelResult = await session.run(
        `
        MATCH (e:AnalyticsEvent)
        WHERE e.timestamp >= datetime($threshold)
          AND e.event_type IN ['contribution_start', 'contribution_complete']
        WITH e.event_type as event_type
        RETURN
          sum(CASE WHEN event_type = 'contribution_start' THEN 1 ELSE 0 END) as started,
          sum(CASE WHEN event_type = 'contribution_complete' THEN 1 ELSE 0 END) as completed
        `,
        { threshold: threshold.toISOString() }
      );

      const funnelData = contributionFunnelResult.records[0];
      const started = funnelData ? funnelData.get('started').toNumber() : 0;
      const completed = funnelData ? funnelData.get('completed').toNumber() : 0;
      const contribution_funnel = {
        started,
        completed,
        completion_rate: started > 0 ? Math.round((completed / started) * 100) : 0,
      };

      // 6. Popular Eras (from browse filters)
      const popularErasResult = await session.run(
        `
        MATCH (e:AnalyticsEvent)
        WHERE e.timestamp >= datetime($threshold)
          AND e.event_type = 'browse_filter'
          AND e.event_data CONTAINS '"filter_type":"era"'
        WITH e.event_data as data
        UNWIND split(data, '"filter_value":"') as part
        WITH split(part, '"')[0] as era
        WHERE era <> data AND era <> ''
        RETURN era, count(*) as count
        ORDER BY count DESC
        LIMIT 10
        `,
        { threshold: threshold.toISOString() }
      );

      const popular_eras = popularErasResult.records.map((record: any) => ({
        era: record.get('era'),
        count: record.get('count').toNumber(),
      }));

      // 7. Popular Media Types
      const popularMediaResult = await session.run(
        `
        MATCH (e:AnalyticsEvent)
        WHERE e.timestamp >= datetime($threshold)
          AND e.event_type = 'browse_filter'
          AND e.event_data CONTAINS '"filter_type":"media_type"'
        WITH e.event_data as data
        UNWIND split(data, '"filter_value":"') as part
        WITH split(part, '"')[0] as media_type
        WHERE media_type <> data AND media_type <> ''
        RETURN media_type, count(*) as count
        ORDER BY count DESC
        LIMIT 10
        `,
        { threshold: threshold.toISOString() }
      );

      const popular_media_types = popularMediaResult.records.map((record: any) => ({
        media_type: record.get('media_type'),
        count: record.get('count').toNumber(),
      }));

      const stats: AnalyticsStats = {
        timestamp: new Date().toISOString(),
        time_range: timeRange,
        overview,
        top_pages,
        top_searches,
        graph_interactions,
        contribution_funnel,
        popular_eras,
        popular_media_types,
      };

      return NextResponse.json(stats);
    } finally {
      await session.close();
      await driver.close();
    }
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
