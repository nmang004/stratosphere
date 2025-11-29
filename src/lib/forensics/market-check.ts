/**
 * Market Check Module
 *
 * Live SERP verification using Serper.dev API.
 * Used to verify/debunk "I'm not ranking" claims from clients.
 */

import type { MarketCheckResult } from '../serper/types';
import { marketCheckWithCache, batchMarketCheck } from '../serper';

// =============================================================================
// TYPES
// =============================================================================

export interface MarketVerificationResult {
  domain: string;
  query: string;
  location?: string;
  verification: {
    claimVerified: boolean;
    actualPosition: number | null;
    explanation: string;
  };
  marketAnalysis: {
    competitorCount: number;
    topCompetitor: string | null;
    serpFeatures: string[];
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  };
  rawResult: MarketCheckResult;
  timestamp: string;
}

export interface BulkVerificationResult {
  domain: string;
  queries: MarketVerificationResult[];
  summary: {
    totalQueries: number;
    ranking: number;
    notRanking: number;
    avgPosition: number | null;
  };
  timestamp: string;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Verify if a domain is ranking for a specific query.
 * Returns detailed analysis with competitor context.
 */
export async function verifyRanking(
  domain: string,
  query: string,
  options: {
    location?: string;
    gl?: string;
    expectedRanking?: boolean; // Client's claim: true = "I should be ranking"
  } = {}
): Promise<MarketVerificationResult> {
  const result = await marketCheckWithCache(query, domain, {
    location: options.location,
    gl: options.gl,
    ttlHours: 1, // Short cache for verification
  });

  // Analyze the claim
  const claimVerified = options.expectedRanking !== undefined
    ? options.expectedRanking === result.results.isRanking
    : true; // No claim to verify

  // Generate explanation
  let explanation: string;
  if (result.results.isRanking) {
    explanation = `Domain is ranking at position ${result.results.position} ` +
      `for "${query}"${options.location ? ` in ${options.location}` : ''}.`;
  } else {
    const topCompetitor = result.results.topCompetitors[0];
    explanation = `Domain is NOT ranking in top ${result.results.topCompetitors.length + 1} ` +
      `for "${query}". Top result: ${topCompetitor?.domain || 'Unknown'}.`;
  }

  // Assess difficulty
  const difficulty = assessDifficulty(result);

  return {
    domain,
    query,
    location: options.location,
    verification: {
      claimVerified,
      actualPosition: result.results.position,
      explanation,
    },
    marketAnalysis: {
      competitorCount: result.results.topCompetitors.length,
      topCompetitor: result.results.topCompetitors[0]?.domain || null,
      serpFeatures: result.results.serpFeatures,
      difficulty,
    },
    rawResult: result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Bulk verify rankings for multiple queries.
 */
export async function bulkVerifyRankings(
  domain: string,
  queries: string[],
  options: {
    location?: string;
    gl?: string;
  } = {}
): Promise<BulkVerificationResult> {
  const results = await batchMarketCheck(queries, domain, {
    location: options.location,
    gl: options.gl,
    ttlHours: 1,
    concurrency: 3,
  });

  const verificationResults = results.map((result) => {
    const difficulty = assessDifficulty(result);

    return {
      domain,
      query: result.query,
      location: options.location,
      verification: {
        claimVerified: true,
        actualPosition: result.results.position,
        explanation: result.results.isRanking
          ? `Ranking at position ${result.results.position}`
          : 'Not ranking in top results',
      },
      marketAnalysis: {
        competitorCount: result.results.topCompetitors.length,
        topCompetitor: result.results.topCompetitors[0]?.domain || null,
        serpFeatures: result.results.serpFeatures,
        difficulty,
      },
      rawResult: result,
      timestamp: new Date().toISOString(),
    } satisfies MarketVerificationResult;
  });

  // Calculate summary
  const ranking = verificationResults.filter(r => r.rawResult.results.isRanking).length;
  const positions = verificationResults
    .filter(r => r.rawResult.results.position !== null)
    .map(r => r.rawResult.results.position!);

  const avgPosition = positions.length > 0
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : null;

  return {
    domain,
    queries: verificationResults,
    summary: {
      totalQueries: queries.length,
      ranking,
      notRanking: queries.length - ranking,
      avgPosition: avgPosition !== null ? Math.round(avgPosition * 10) / 10 : null,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Compare a domain's ranking against specific competitors.
 */
export async function compareWithCompetitors(
  domain: string,
  competitors: string[],
  query: string,
  options: {
    location?: string;
    gl?: string;
  } = {}
): Promise<{
  query: string;
  rankings: Array<{
    domain: string;
    position: number | null;
    isTarget: boolean;
  }>;
  winner: string | null;
  targetPosition: number | null;
}> {
  const result = await marketCheckWithCache(query, domain, {
    location: options.location,
    gl: options.gl,
  });

  const allDomains = [domain, ...competitors];
  const rankings: Array<{
    domain: string;
    position: number | null;
    isTarget: boolean;
  }> = [];

  // Find position for target domain
  rankings.push({
    domain,
    position: result.results.position,
    isTarget: true,
  });

  // Find positions for competitors
  for (const competitor of competitors) {
    const normalizedCompetitor = competitor.toLowerCase().replace(/^www\./, '');
    const competitorResult = result.results.topCompetitors.find(
      (c) => c.domain.toLowerCase().replace(/^www\./, '') === normalizedCompetitor
    );

    rankings.push({
      domain: competitor,
      position: competitorResult?.position || null,
      isTarget: false,
    });
  }

  // Sort by position (nulls last)
  rankings.sort((a, b) => {
    if (a.position === null) return 1;
    if (b.position === null) return -1;
    return a.position - b.position;
  });

  const winner = rankings[0]?.position !== null ? rankings[0].domain : null;

  return {
    query,
    rankings,
    winner,
    targetPosition: result.results.position,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Assess ranking difficulty based on SERP features and competition.
 */
function assessDifficulty(
  result: MarketCheckResult
): 'EASY' | 'MEDIUM' | 'HARD' {
  let score = 0;

  // SERP features increase difficulty
  if (result.results.serpFeatures.includes('knowledgeGraph')) score += 2;
  if (result.results.serpFeatures.includes('localPack')) score += 2;
  if (result.results.serpFeatures.includes('featuredSnippet')) score += 1;
  if (result.results.serpFeatures.includes('peopleAlsoAsk')) score += 1;

  // Large domains in top positions increase difficulty
  const largeDomains = ['wikipedia.org', 'amazon.com', 'yelp.com', 'facebook.com', 'linkedin.com'];
  for (const competitor of result.results.topCompetitors.slice(0, 5)) {
    if (largeDomains.some((d) => competitor.domain.includes(d))) {
      score += 1;
    }
  }

  if (score >= 5) return 'HARD';
  if (score >= 2) return 'MEDIUM';
  return 'EASY';
}

// =============================================================================
// SUMMARY UTILITIES
// =============================================================================

/**
 * Generate human-readable summary of market check.
 */
export function summarizeMarketCheck(result: MarketVerificationResult): string {
  const { verification, marketAnalysis } = result;

  let status: string;
  if (verification.actualPosition !== null) {
    if (verification.actualPosition <= 3) {
      status = `✅ Strong position (#${verification.actualPosition})`;
    } else if (verification.actualPosition <= 10) {
      status = `🟡 Page 1 (#${verification.actualPosition})`;
    } else {
      status = `⚠️ Below fold (#${verification.actualPosition})`;
    }
  } else {
    status = '❌ Not ranking';
  }

  const features = marketAnalysis.serpFeatures.length > 0
    ? `SERP features: ${marketAnalysis.serpFeatures.join(', ')}`
    : 'No special SERP features';

  return `${status} for "${result.query}". ` +
    `Difficulty: ${marketAnalysis.difficulty}. ${features}`;
}

/**
 * Generate summary for bulk verification.
 */
export function summarizeBulkVerification(result: BulkVerificationResult): string {
  const { summary } = result;

  const rankingPercent = Math.round((summary.ranking / summary.totalQueries) * 100);

  let status: string;
  if (rankingPercent >= 80) {
    status = '✅ Strong visibility';
  } else if (rankingPercent >= 50) {
    status = '🟡 Moderate visibility';
  } else {
    status = '⚠️ Low visibility';
  }

  return `${status}: Ranking for ${summary.ranking}/${summary.totalQueries} queries (${rankingPercent}%). ` +
    (summary.avgPosition !== null ? `Avg position: ${summary.avgPosition}` : '');
}
