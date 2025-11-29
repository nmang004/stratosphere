/**
 * Cannibalization Detector Module
 *
 * Detects keyword cannibalization - when multiple URLs from the same domain
 * compete for the same queries, causing ranking instability.
 */

import type {
  CannibalizationResult,
  CannibalizedQuery,
  RankingChange,
  DateRange,
} from './types';
import { CANNIBALIZATION_THRESHOLDS } from './constants';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Detect cannibalization by analyzing ranking URL changes over time.
 */
export async function detectCannibalization(
  domain: string,
  period: DateRange,
  minChanges: number = CANNIBALIZATION_THRESHOLDS.MIN_URL_CHANGES
): Promise<CannibalizationResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get cached rankings from the period
  const { data: cacheData } = await supabase
    .from('serper_cache')
    .select('query, response, created_at')
    .gte('created_at', period.start.toISOString())
    .lte('created_at', period.end.toISOString())
    .order('created_at', { ascending: true });

  if (!cacheData || cacheData.length === 0) {
    return {
      cannibalizedQueries: [],
      summary: {
        totalAffectedQueries: 0,
        severity: 'NONE',
        primaryIssue: null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Group rankings by query
  const queryRankings = groupRankingsByQuery(cacheData, domain);

  // Find queries with URL changes
  const cannibalizedQueries = findCannibalizedQueries(queryRankings, minChanges);

  // Calculate summary
  const severity = calculateSeverity(cannibalizedQueries.length);
  const primaryIssue = identifyPrimaryIssue(cannibalizedQueries);

  return {
    cannibalizedQueries,
    summary: {
      totalAffectedQueries: cannibalizedQueries.length,
      severity,
      primaryIssue,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if a specific query has cannibalization issues.
 */
export async function checkQueryCannibalization(
  domain: string,
  query: string
): Promise<{
  hasCannibalization: boolean;
  rankingUrls: string[];
  recommendation: string;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get cached rankings for this query
  const { data } = await supabase
    .from('serper_cache')
    .select('response, created_at')
    .eq('query', query.toLowerCase())
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) {
    return {
      hasCannibalization: false,
      rankingUrls: [],
      recommendation: 'No data available for this query.',
    };
  }

  const normalizedDomain = normalizeDomain(domain);
  const rankingUrls = new Set<string>();

  for (const entry of data) {
    const response = entry.response as {
      organic?: Array<{ link: string; position: number }>;
    };

    if (!response?.organic) continue;

    for (const result of response.organic) {
      if (normalizeDomain(extractDomain(result.link)) === normalizedDomain) {
        rankingUrls.add(result.link);
      }
    }
  }

  const uniqueUrls = Array.from(rankingUrls);
  const hasCannibalization = uniqueUrls.length > 1;

  let recommendation = '';
  if (hasCannibalization) {
    recommendation = `Found ${uniqueUrls.length} URLs competing for "${query}". ` +
      'Consider consolidating content or implementing canonical tags.';
  } else if (uniqueUrls.length === 1) {
    recommendation = 'No cannibalization detected. Single URL ranking consistently.';
  } else {
    recommendation = 'Domain not ranking for this query.';
  }

  return {
    hasCannibalization,
    rankingUrls: uniqueUrls,
    recommendation,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface QueryRankingHistory {
  query: string;
  rankings: Array<{
    url: string;
    position: number;
    date: string;
  }>;
}

/**
 * Group cached rankings by query for a specific domain.
 */
function groupRankingsByQuery(
  cacheData: Array<{ query: string; response: unknown; created_at: string }>,
  domain: string
): Map<string, QueryRankingHistory> {
  const normalizedDomain = normalizeDomain(domain);
  const queryMap = new Map<string, QueryRankingHistory>();

  for (const entry of cacheData) {
    const response = entry.response as {
      organic?: Array<{ link: string; position: number }>;
    };

    if (!response?.organic) continue;

    // Find domain's ranking for this query
    for (const result of response.organic) {
      if (normalizeDomain(extractDomain(result.link)) === normalizedDomain) {
        const normalizedQuery = entry.query.toLowerCase();

        if (!queryMap.has(normalizedQuery)) {
          queryMap.set(normalizedQuery, {
            query: entry.query,
            rankings: [],
          });
        }

        queryMap.get(normalizedQuery)!.rankings.push({
          url: result.link,
          position: result.position,
          date: entry.created_at,
        });

        break; // Only take first result for domain per query
      }
    }
  }

  return queryMap;
}

/**
 * Find queries where the ranking URL changes frequently.
 */
function findCannibalizedQueries(
  queryRankings: Map<string, QueryRankingHistory>,
  minChanges: number
): CannibalizedQuery[] {
  const cannibalized: CannibalizedQuery[] = [];

  for (const [, history] of queryRankings) {
    if (history.rankings.length < 2) continue;

    // Count URL changes
    const urlChanges: RankingChange[] = [];
    let previousUrl = '';

    for (const ranking of history.rankings) {
      const normalizedUrl = normalizeUrl(ranking.url);

      if (previousUrl && normalizedUrl !== previousUrl) {
        urlChanges.push({
          date: ranking.date,
          url: ranking.url,
          position: ranking.position,
        });
      }

      previousUrl = normalizedUrl;
    }

    if (urlChanges.length >= minChanges) {
      const currentRanking = history.rankings[history.rankings.length - 1];

      cannibalized.push({
        query: history.query,
        urlChanges,
        changeCount: urlChanges.length,
        currentUrl: currentRanking.url,
        suggestedAction: generateSuggestedAction(history, urlChanges),
      });
    }
  }

  // Sort by change count (most volatile first)
  return cannibalized.sort((a, b) => b.changeCount - a.changeCount);
}

/**
 * Calculate severity based on number of affected queries.
 */
function calculateSeverity(
  affectedCount: number
): CannibalizationResult['summary']['severity'] {
  if (affectedCount >= CANNIBALIZATION_THRESHOLDS.HIGH_SEVERITY_COUNT) {
    return 'HIGH';
  }
  if (affectedCount >= CANNIBALIZATION_THRESHOLDS.MEDIUM_SEVERITY_COUNT) {
    return 'MEDIUM';
  }
  if (affectedCount > 0) {
    return 'LOW';
  }
  return 'NONE';
}

/**
 * Identify the primary cannibalization issue.
 */
function identifyPrimaryIssue(queries: CannibalizedQuery[]): string | null {
  if (queries.length === 0) return null;

  // Find most common competing URLs
  const urlCounts = new Map<string, number>();
  for (const query of queries) {
    const urls = new Set(query.urlChanges.map(c => normalizeUrl(c.url)));
    for (const url of urls) {
      urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
    }
  }

  const topUrls = Array.from(urlCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (topUrls.length >= 2) {
    return `Pages "${topUrls[0][0]}" and "${topUrls[1][0]}" are competing for similar queries.`;
  }

  return `Multiple pages competing for ${queries.length} queries.`;
}

/**
 * Generate suggested action for a cannibalized query.
 */
function generateSuggestedAction(
  history: QueryRankingHistory,
  changes: RankingChange[]
): string {
  // Identify which URL had the best average position
  const urlPositions = new Map<string, number[]>();

  for (const ranking of history.rankings) {
    const normalizedUrl = normalizeUrl(ranking.url);
    if (!urlPositions.has(normalizedUrl)) {
      urlPositions.set(normalizedUrl, []);
    }
    urlPositions.get(normalizedUrl)!.push(ranking.position);
  }

  let bestUrl = '';
  let bestAvg = Infinity;

  for (const [url, positions] of urlPositions) {
    const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestUrl = url;
    }
  }

  if (urlPositions.size === 2) {
    return `Consolidate to "${bestUrl}" (avg position: ${bestAvg.toFixed(1)}). ` +
      'Consider 301 redirect or content merge.';
  }

  return `${urlPositions.size} URLs competing. Focus on "${bestUrl}" ` +
    `(avg position: ${bestAvg.toFixed(1)}).`;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    const match = url.match(/^(?:https?:\/\/)?([^\/]+)/);
    return match ? match[1] : url;
  }
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase().replace(/\/$/, '');
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

// =============================================================================
// SUMMARY UTILITIES
// =============================================================================

/**
 * Generate human-readable summary of cannibalization results.
 */
export function summarizeCannibalization(result: CannibalizationResult): string {
  if (result.summary.severity === 'NONE') {
    return 'No keyword cannibalization detected.';
  }

  const severity = {
    HIGH: '🔴 HIGH',
    MEDIUM: '🟡 MEDIUM',
    LOW: '🟢 LOW',
    NONE: '✅ NONE',
  }[result.summary.severity];

  return `${severity}: ${result.summary.totalAffectedQueries} queries affected by cannibalization. ` +
    (result.summary.primaryIssue || '');
}
