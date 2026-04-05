/**
 * CHR-44: Privacy-First Analytics System
 *
 * Self-hosted analytics without third-party trackers.
 * GDPR/CCPA compliant - no personal data collection.
 * Tracks aggregate user behavior for product improvements.
 */

export type AnalyticsEvent =
  | { type: 'page_view'; path: string }
  | { type: 'search_query'; query: string; results_count: number }
  | { type: 'graph_interaction'; action: 'expand' | 'collapse' | 'navigate'; entity_type: 'figure' | 'work' }
  | { type: 'contribution_start'; contribution_type: 'figure' | 'work' | 'appearance' }
  | { type: 'contribution_complete'; contribution_type: 'figure' | 'work' | 'appearance' }
  | { type: 'wikidata_enrichment'; entity_type: 'figure' | 'work' }
  | { type: 'pathfinder_query'; from_type: string; to_type: string; path_found: boolean }
  | { type: 'browse_filter'; filter_type: 'era' | 'location' | 'media_type'; filter_value: string };

interface AnalyticsPayload {
  event: AnalyticsEvent;
  timestamp: string;
  session_id: string; // Anonymous session ID (generated client-side, no cookies)
  user_agent?: string;
  referrer?: string;
}

/**
 * Generate an anonymous session ID for analytics (stored in sessionStorage, not cookies)
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  try {
    let sessionId = sessionStorage.getItem('chronos_analytics_session');
    if (!sessionId) {
      // Generate a random session ID (no personal data)
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('chronos_analytics_session', sessionId);
    }
    return sessionId;
  } catch (e) {
    // Fallback if sessionStorage is disabled
    return `session_${Date.now()}`;
  }
}

/**
 * Track an analytics event
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  // Skip in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
    console.log('[Analytics - Dev Mode]', event);
    return;
  }

  const payload: AnalyticsPayload = {
    event,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  };

  try {
    // Send analytics event to our API (non-blocking)
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Use keepalive for page unload events
      keepalive: event.type === 'page_view',
    });
  } catch (error) {
    // Silent fail - analytics should never break the user experience
    console.debug('Analytics tracking failed:', error);
  }
}

/**
 * Track page view (call from layout or page components)
 */
export function trackPageView(path: string): void {
  trackEvent({ type: 'page_view', path });
}

/**
 * Track search query
 */
export function trackSearch(query: string, resultsCount: number): void {
  trackEvent({
    type: 'search_query',
    query: query.toLowerCase(), // Normalize for aggregation (no PII)
    results_count: resultsCount,
  });
}

/**
 * Track graph interaction
 */
export function trackGraphInteraction(
  action: 'expand' | 'collapse' | 'navigate',
  entityType: 'figure' | 'work'
): void {
  trackEvent({
    type: 'graph_interaction',
    action,
    entity_type: entityType,
  });
}

/**
 * Track contribution funnel
 */
export function trackContributionStart(contributionType: 'figure' | 'work' | 'appearance'): void {
  trackEvent({
    type: 'contribution_start',
    contribution_type: contributionType,
  });
}

export function trackContributionComplete(contributionType: 'figure' | 'work' | 'appearance'): void {
  trackEvent({
    type: 'contribution_complete',
    contribution_type: contributionType,
  });
}

/**
 * Track Wikidata enrichment usage
 */
export function trackWikidataEnrichment(entityType: 'figure' | 'work'): void {
  trackEvent({
    type: 'wikidata_enrichment',
    entity_type: entityType,
  });
}

/**
 * Track pathfinder queries
 */
export function trackPathfinderQuery(fromType: string, toType: string, pathFound: boolean): void {
  trackEvent({
    type: 'pathfinder_query',
    from_type: fromType,
    to_type: toType,
    path_found: pathFound,
  });
}

/**
 * Track browse filter usage
 */
export function trackBrowseFilter(
  filterType: 'era' | 'location' | 'media_type',
  filterValue: string
): void {
  trackEvent({
    type: 'browse_filter',
    filter_type: filterType,
    filter_value: filterValue,
  });
}
