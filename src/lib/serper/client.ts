/**
 * Serper.dev API Client
 *
 * HTTP client for interacting with the Serper.dev Google Search API.
 * Provides type-safe search functionality with error handling.
 */

import type {
  SerperSearchParams,
  SerperSearchResponse,
  MarketCheckResult,
} from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SERPER_API_URL = 'https://google.serper.dev/search';
const DEFAULT_GL = 'us';
const DEFAULT_NUM = 10;

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Execute a search query against Serper.dev API
 */
export async function search(params: SerperSearchParams): Promise<SerperSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    throw new Error('SERPER_API_KEY environment variable is not set');
  }

  const response = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: params.q,
      gl: params.gl || DEFAULT_GL,
      location: params.location,
      num: params.num || DEFAULT_NUM,
      page: params.page,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Serper API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// =============================================================================
// MARKET CHECK HELPER
// =============================================================================

/**
 * Check if a target domain ranks for a specific query.
 * Returns processed results with ranking position and competitors.
 */
export function processMarketCheck(
  response: SerperSearchResponse,
  targetDomain: string
): MarketCheckResult {
  const normalizedTarget = normalizeDomain(targetDomain);

  // Find target domain in results
  let targetResult: { position: number; url: string } | null = null;
  const competitors: MarketCheckResult['results']['topCompetitors'] = [];

  for (const result of response.organic) {
    const resultDomain = normalizeDomain(extractDomain(result.link));

    if (resultDomain === normalizedTarget && !targetResult) {
      targetResult = {
        position: result.position,
        url: result.link,
      };
    } else {
      competitors.push({
        domain: resultDomain,
        position: result.position,
        url: result.link,
        title: result.title,
      });
    }
  }

  // Detect SERP features
  const serpFeatures: string[] = [];
  if (response.knowledgeGraph) serpFeatures.push('knowledgeGraph');
  if (response.peopleAlsoAsk?.length) serpFeatures.push('peopleAlsoAsk');
  if (response.places?.length) serpFeatures.push('localPack');
  if (response.relatedSearches?.length) serpFeatures.push('relatedSearches');

  // Check for featured snippets (position 0 or special formatting)
  const hasFeatureSnippet = response.organic.some(
    (r) => r.snippet && r.snippet.length > 300
  );
  if (hasFeatureSnippet) serpFeatures.push('featuredSnippet');

  return {
    query: response.searchParameters.q,
    location: response.searchParameters.location || null,
    targetDomain,
    results: {
      isRanking: targetResult !== null,
      position: targetResult?.position || null,
      rankingUrl: targetResult?.url || null,
      topCompetitors: competitors.slice(0, 10), // Top 10 competitors
      serpFeatures,
    },
    timestamp: new Date().toISOString(),
    cached: false,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/^(?:https?:\/\/)?([^\/]+)/);
    return match ? match[1] : url;
  }
}

/**
 * Normalize domain for comparison (remove www, lowercase)
 */
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

/**
 * Check if Serper API is configured
 */
export function isSerperConfigured(): boolean {
  return !!process.env.SERPER_API_KEY;
}
