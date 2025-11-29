/**
 * Stratosphere AI Constraint Helpers - Forensics Edition
 *
 * Utility functions for enforcing Handbook constraints.
 */

import { HANDBOOK_RULES } from '../forensics/constants';
import type { PageMetadata, NineMonthCheck } from './types';

// =============================================================================
// 9-MONTH RULE ENFORCEMENT
// =============================================================================

/**
 * Check if a page is locked by the 9-Month Rule.
 * Returns detailed check result with reason.
 */
export function checkNineMonthRule(pageMetadata?: PageMetadata): NineMonthCheck {
  if (!pageMetadata) {
    return {
      isLocked: false,
      reason: 'No page metadata provided - assuming eligible for optimization',
    };
  }

  const now = new Date();

  // Check creation date (6 month lockout)
  if (pageMetadata.createdDate) {
    const created = new Date(pageMetadata.createdDate);
    const monthsSinceCreation = monthsBetween(created, now);

    if (monthsSinceCreation < HANDBOOK_RULES.NEW_PAGE_LOCKOUT_MONTHS) {
      return {
        isLocked: true,
        reason: `Page created ${monthsSinceCreation.toFixed(1)} months ago (requires ${HANDBOOK_RULES.NEW_PAGE_LOCKOUT_MONTHS} months)`,
      };
    }
  }

  // Check last optimization date (9 month lockout)
  if (pageMetadata.lastOptimizationDate) {
    const lastOpt = new Date(pageMetadata.lastOptimizationDate);
    const monthsSinceOptimization = monthsBetween(lastOpt, now);

    if (monthsSinceOptimization < HANDBOOK_RULES.OPTIMIZATION_LOCKOUT_MONTHS) {
      return {
        isLocked: true,
        reason: `Last optimized ${monthsSinceOptimization.toFixed(1)} months ago (requires ${HANDBOOK_RULES.OPTIMIZATION_LOCKOUT_MONTHS} months)`,
      };
    }
  }

  return {
    isLocked: false,
    reason: 'Eligible for optimization',
  };
}

/**
 * Calculate months between two dates.
 */
function monthsBetween(date1: Date, date2: Date): number {
  const years = date2.getFullYear() - date1.getFullYear();
  const months = date2.getMonth() - date1.getMonth();
  const days = date2.getDate() - date1.getDate();

  return years * 12 + months + (days / 30);
}

// =============================================================================
// PAGE TYPE DETECTION
// =============================================================================

/**
 * Detect if a URL is a generic page or geo-specific.
 */
export function detectPageType(url: string): 'GENERIC' | 'GEO' | 'SERVICE' | 'HOMEPAGE' | 'UNKNOWN' {
  const path = url.toLowerCase();

  // Homepage detection
  if (path === '/' || path.endsWith('.com') || path.endsWith('.com/')) {
    return 'HOMEPAGE';
  }

  // Geo-specific patterns
  const geoPatterns = [
    /\/locations?\//,
    /\/areas?-we-serve/,
    /\/service-areas?/,
    /\/cities?\//,
    /\/(plumber|lawyer|dentist|doctor)s?-in-/,
    /-near-me/,
    /\/[a-z]+-[a-z]{2}\// // city-state pattern like /austin-tx/
  ];

  for (const pattern of geoPatterns) {
    if (pattern.test(path)) {
      return 'GEO';
    }
  }

  // Generic service page patterns
  const genericPatterns = [
    /^\/(services?|what-we-do)\/?$/,
    /^\/(plumbing|electrical|hvac|roofing|legal|dental)\/?$/,
    /^\/[a-z-]+-services?\/?$/,
  ];

  for (const pattern of genericPatterns) {
    if (pattern.test(new URL(url).pathname)) {
      return 'GENERIC';
    }
  }

  // Service-specific (not generic, not geo)
  if (path.includes('/service') || path.includes('/practice-area')) {
    return 'SERVICE';
  }

  return 'UNKNOWN';
}

/**
 * Check if a query is geo-targeted.
 */
export function isGeoQuery(query: string): boolean {
  const geoIndicators = [
    /\bin\s+[a-z]+/i, // "in Austin"
    /\bnear\s+(me|[a-z]+)/i, // "near me", "near downtown"
    /[a-z]+,?\s*[a-z]{2}/i, // "Austin TX", "Austin, TX"
    /\blocal\b/i,
    /\barea\b/i,
  ];

  return geoIndicators.some((pattern) => pattern.test(query));
}

// =============================================================================
// MAPPING RULE ENFORCEMENT
// =============================================================================

export interface MappingCheckResult {
  hasViolation: boolean;
  violation?: string;
  recommendation?: string;
}

/**
 * Check if there's a Mapping Rule violation.
 * Violation: Generic page ranking for geo query.
 */
export function checkMappingRule(
  pageUrl: string,
  query: string
): MappingCheckResult {
  const pageType = detectPageType(pageUrl);
  const isGeo = isGeoQuery(query);

  if (pageType === 'GENERIC' && isGeo) {
    return {
      hasViolation: true,
      violation: `Generic page "${pageUrl}" is ranking for geo query "${query}"`,
      recommendation: 'Unmap and Create: Remove generic page from geo-grid, create dedicated location page',
    };
  }

  return { hasViolation: false };
}

// =============================================================================
// QUEUE ENFORCEMENT
// =============================================================================

/**
 * Get the appropriate queue timeline based on current date.
 */
export function getQueueTimeline(): {
  currentQuarter: string;
  nextAvailableQuarter: string;
  monthsOut: number;
} {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  // Determine current quarter
  const currentQ = Math.floor(currentMonth / 3) + 1;
  const currentQuarter = `Q${currentQ} ${currentYear}`;

  // Calculate next available (3 months out)
  const targetMonth = currentMonth + HANDBOOK_RULES.QUEUE_LEAD_TIME_MONTHS;
  const targetQ = Math.floor(targetMonth / 3) + 1;
  const targetYear = targetMonth >= 12 ? currentYear + 1 : currentYear;
  const adjustedQ = targetMonth >= 12 ? targetQ - 4 : targetQ;

  const nextAvailableQuarter = `Q${adjustedQ > 0 ? adjustedQ : adjustedQ + 4} ${targetYear}`;

  return {
    currentQuarter,
    nextAvailableQuarter,
    monthsOut: HANDBOOK_RULES.QUEUE_LEAD_TIME_MONTHS,
  };
}

/**
 * Format a strategy recommendation with queue context.
 */
export function formatQueuedRecommendation(strategy: string): string {
  const { nextAvailableQuarter, monthsOut } = getQueueTimeline();

  return `${strategy} (Queue for ${nextAvailableQuarter}, ~${monthsOut} months)`;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate all Handbook constraints for a recommendation.
 */
export function validateRecommendation(
  strategy: string,
  pageMetadata?: PageMetadata,
  query?: string
): {
  isValid: boolean;
  violations: string[];
  warnings: string[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check 9-month rule for Content Refresh
  if (strategy.toLowerCase().includes('content refresh')) {
    const nineMonthCheck = checkNineMonthRule(pageMetadata);
    if (nineMonthCheck.isLocked) {
      violations.push(`9-Month Rule Violation: ${nineMonthCheck.reason}`);
    }
  }

  // Check mapping rule
  if (pageMetadata?.url && query) {
    const mappingCheck = checkMappingRule(pageMetadata.url, query);
    if (mappingCheck.hasViolation && !strategy.toLowerCase().includes('unmap')) {
      warnings.push(`Mapping Warning: ${mappingCheck.violation}`);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
  };
}

// =============================================================================
// CONTEXT BUILDERS
// =============================================================================

/**
 * Build constraint context for AI prompt.
 */
export function buildConstraintContext(
  pageMetadata?: PageMetadata,
  query?: string
): string {
  const sections: string[] = [];

  // 9-Month Rule status
  const nineMonthCheck = checkNineMonthRule(pageMetadata);
  sections.push(`## 9-Month Rule Status
- Locked: ${nineMonthCheck.isLocked ? 'YES' : 'NO'}
- Reason: ${nineMonthCheck.reason}
${nineMonthCheck.isLocked ? '⚠️ Content Refresh is NOT available. Consider Digital PR instead.' : '✓ Content Refresh is available if needed.'}`);

  // Queue timeline
  const queue = getQueueTimeline();
  sections.push(`## Queue Timeline
- Current Quarter: ${queue.currentQuarter}
- Next Available: ${queue.nextAvailableQuarter}
- All content work should be scheduled ${queue.monthsOut}+ months out`);

  // Mapping check (if we have both URL and query)
  if (pageMetadata?.url && query) {
    const mappingCheck = checkMappingRule(pageMetadata.url, query);
    if (mappingCheck.hasViolation) {
      sections.push(`## ⚠️ Mapping Rule Violation Detected
${mappingCheck.violation}
Recommended Strategy: ${mappingCheck.recommendation}`);
    }
  }

  return sections.join('\n\n');
}
