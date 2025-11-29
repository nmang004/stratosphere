/**
 * Nuke Detector Module
 *
 * Detects pages that have been "nuked" from search results.
 * A "nuked" page is one that previously ranked well but now has zero visibility.
 *
 * Note: Without GSC integration, this module works with cached Serper data
 * to detect ranking losses over time.
 */

import type { NukeCheckResult, NukedPage, DateRange } from './types';
import { NUKE_THRESHOLDS } from './constants';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

interface CachedRankingData {
  url: string;
  query: string;
  position: number;
  cachedAt: string;
}

interface RankingSnapshot {
  url: string;
  queries: string[];
  avgPosition: number;
  totalRankings: number;
  timestamp: string;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Detect nuked pages by comparing ranking snapshots.
 * Looks for URLs that were ranking in period A but not in period B.
 */
export async function detectNukedPages(
  domain: string,
  periodA: DateRange,
  periodB: DateRange
): Promise<NukeCheckResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get cached rankings from period A
  const { data: periodAData } = await supabase
    .from('serper_cache')
    .select('query, response, created_at')
    .gte('created_at', periodA.start.toISOString())
    .lte('created_at', periodA.end.toISOString());

  // Get cached rankings from period B
  const { data: periodBData } = await supabase
    .from('serper_cache')
    .select('query, response, created_at')
    .gte('created_at', periodB.start.toISOString())
    .lte('created_at', periodB.end.toISOString());

  // Extract domain rankings from each period
  const periodARankings = extractDomainRankings(periodAData || [], domain);
  const periodBRankings = extractDomainRankings(periodBData || [], domain);

  // Find nuked pages (present in A, absent in B)
  const nukedPages = findNukedPages(periodARankings, periodBRankings);

  // Calculate summary
  const totalPagesA = periodARankings.length;
  const percentageAffected = totalPagesA > 0
    ? (nukedPages.length / totalPagesA) * 100
    : 0;

  const severity = calculateSeverity(percentageAffected);

  return {
    nukedPages,
    summary: {
      totalNuked: nukedPages.length,
      percentageAffected: Math.round(percentageAffected * 10) / 10,
      severity,
    },
    periodA,
    periodB,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick check for a specific URL - is it still ranking?
 */
export async function checkUrlRanking(
  url: string,
  domain: string
): Promise<{
  isRanking: boolean;
  currentQueries: string[];
  lastSeenQueries: string[];
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get recent cache entries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentData } = await supabase
    .from('serper_cache')
    .select('query, response, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  const rankings = extractDomainRankings(recentData || [], domain);
  const urlRankings = rankings.filter(r =>
    normalizeUrl(r.url) === normalizeUrl(url)
  );

  // Split into recent (last 7 days) and older
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const currentQueries = new Set<string>();
  const lastSeenQueries = new Set<string>();

  for (const ranking of urlRankings) {
    const rankingDate = new Date(ranking.timestamp);
    if (rankingDate >= sevenDaysAgo) {
      ranking.queries.forEach(q => currentQueries.add(q));
    } else {
      ranking.queries.forEach(q => lastSeenQueries.add(q));
    }
  }

  return {
    isRanking: currentQueries.size > 0,
    currentQueries: Array.from(currentQueries),
    lastSeenQueries: Array.from(lastSeenQueries).filter(q => !currentQueries.has(q)),
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract rankings for a specific domain from cached Serper responses.
 */
function extractDomainRankings(
  cacheEntries: Array<{ query: string; response: unknown; created_at: string }>,
  domain: string
): RankingSnapshot[] {
  const normalizedDomain = normalizeDomain(domain);
  const urlMap = new Map<string, RankingSnapshot>();

  for (const entry of cacheEntries) {
    const response = entry.response as {
      organic?: Array<{ link: string; position: number }>;
    };

    if (!response?.organic) continue;

    for (const result of response.organic) {
      const resultDomain = normalizeDomain(extractDomain(result.link));

      if (resultDomain === normalizedDomain) {
        const normalizedUrl = normalizeUrl(result.link);

        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, {
            url: result.link,
            queries: [],
            avgPosition: 0,
            totalRankings: 0,
            timestamp: entry.created_at,
          });
        }

        const snapshot = urlMap.get(normalizedUrl)!;
        snapshot.queries.push(entry.query);
        snapshot.totalRankings++;
        // Running average
        snapshot.avgPosition =
          (snapshot.avgPosition * (snapshot.totalRankings - 1) + result.position) /
          snapshot.totalRankings;
      }
    }
  }

  return Array.from(urlMap.values());
}

/**
 * Find pages that were in period A but not in period B.
 */
function findNukedPages(
  periodA: RankingSnapshot[],
  periodB: RankingSnapshot[]
): NukedPage[] {
  const periodBUrls = new Set(periodB.map(r => normalizeUrl(r.url)));
  const nuked: NukedPage[] = [];

  for (const ranking of periodA) {
    // Only consider pages with significant visibility in period A
    if (ranking.totalRankings < 2) continue;

    const normalizedUrl = normalizeUrl(ranking.url);

    if (!periodBUrls.has(normalizedUrl)) {
      nuked.push({
        url: ranking.url,
        previousClicks: 0, // Not available without GSC
        previousImpressions: ranking.totalRankings * 100, // Estimate
        currentImpressions: 0,
        dropDate: ranking.timestamp,
      });
    }
  }

  // Sort by previous visibility (most impactful first)
  return nuked.sort((a, b) => b.previousImpressions - a.previousImpressions);
}

/**
 * Calculate severity based on percentage affected.
 */
function calculateSeverity(
  percentageAffected: number
): NukeCheckResult['summary']['severity'] {
  if (percentageAffected >= NUKE_THRESHOLDS.CRITICAL_PERCENTAGE) {
    return 'CRITICAL';
  }
  if (percentageAffected >= NUKE_THRESHOLDS.WARNING_PERCENTAGE) {
    return 'WARNING';
  }
  return 'NONE';
}

/**
 * Extract domain from URL.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    const match = url.match(/^(?:https?:\/\/)?([^\/]+)/);
    return match ? match[1] : url;
  }
}

/**
 * Normalize domain for comparison.
 */
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

/**
 * Normalize URL for comparison (remove trailing slashes, query params).
 */
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
 * Generate human-readable summary of nuke check results.
 */
export function summarizeNukeCheck(result: NukeCheckResult): string {
  if (result.summary.severity === 'NONE') {
    return 'No significant ranking losses detected.';
  }

  const severity = result.summary.severity === 'CRITICAL' ? '🔴 CRITICAL' : '🟡 WARNING';

  return `${severity}: ${result.summary.totalNuked} pages lost rankings ` +
    `(${result.summary.percentageAffected}% of tracked pages). ` +
    `Top affected: ${result.nukedPages.slice(0, 3).map(p => p.url).join(', ')}`;
}
