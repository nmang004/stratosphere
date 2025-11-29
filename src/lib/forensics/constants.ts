/**
 * Forensics Engine Constants
 *
 * Hardcoded Google algorithm update dates and other constants.
 * Source: Google Search Central, SEO industry tracking.
 */

import type { AlgoUpdate } from './types';

// =============================================================================
// GOOGLE ALGORITHM UPDATES (2023-2025)
// =============================================================================

export const GOOGLE_UPDATES: AlgoUpdate[] = [
  // 2025 Updates
  {
    date: '2025-03-13',
    name: 'March 2025 Core Update',
    type: 'CORE',
    impactLevel: 'HIGH',
    description: 'Core algorithm update improving search quality',
    rolloutDays: 14,
  },

  // 2024 Updates
  {
    date: '2024-11-11',
    name: 'November 2024 Core Update',
    type: 'CORE',
    impactLevel: 'HIGH',
    description: 'Major core update affecting content quality signals',
    rolloutDays: 25,
  },
  {
    date: '2024-08-15',
    name: 'August 2024 Core Update',
    type: 'CORE',
    impactLevel: 'HIGH',
    description: 'Core update with focus on helpful content',
    rolloutDays: 18,
  },
  {
    date: '2024-06-20',
    name: 'June 2024 Spam Update',
    type: 'SPAM',
    impactLevel: 'MEDIUM',
    description: 'Spam update targeting link manipulation',
    rolloutDays: 7,
  },
  {
    date: '2024-03-05',
    name: 'March 2024 Core Update',
    type: 'CORE',
    impactLevel: 'HIGH',
    description: 'Major core update with helpful content integration',
    rolloutDays: 45,
  },
  {
    date: '2024-03-05',
    name: 'March 2024 Spam Update',
    type: 'SPAM',
    impactLevel: 'HIGH',
    description: 'Aggressive spam update targeting scaled content abuse',
    rolloutDays: 14,
  },

  // 2023 Updates
  {
    date: '2023-11-02',
    name: 'November 2023 Core Update',
    type: 'CORE',
    impactLevel: 'HIGH',
    description: 'Core update improving content quality assessment',
    rolloutDays: 25,
  },
  {
    date: '2023-11-08',
    name: 'November 2023 Reviews Update',
    type: 'REVIEWS',
    impactLevel: 'MEDIUM',
    description: 'Final standalone reviews update before core integration',
    rolloutDays: 14,
  },
  {
    date: '2023-10-05',
    name: 'October 2023 Spam Update',
    type: 'SPAM',
    impactLevel: 'MEDIUM',
    description: 'Spam update targeting cloaking and hacked content',
    rolloutDays: 14,
  },
  {
    date: '2023-10-04',
    name: 'October 2023 Core Update',
    type: 'CORE',
    impactLevel: 'HIGH',
    description: 'Core update with ranking system improvements',
    rolloutDays: 14,
  },
  {
    date: '2023-09-14',
    name: 'September 2023 Helpful Content Update',
    type: 'HELPFUL_CONTENT',
    impactLevel: 'HIGH',
    description: 'Helpful content update improving classifier',
    rolloutDays: 14,
  },
  {
    date: '2023-08-22',
    name: 'August 2023 Core Update',
    type: 'CORE',
    impactLevel: 'HIGH',
    description: 'Core update affecting content quality signals',
    rolloutDays: 16,
  },
  {
    date: '2023-04-12',
    name: 'April 2023 Reviews Update',
    type: 'REVIEWS',
    impactLevel: 'MEDIUM',
    description: 'Reviews update for product and service reviews',
    rolloutDays: 13,
  },
  {
    date: '2023-03-15',
    name: 'March 2023 Core Update',
    type: 'CORE',
    impactLevel: 'HIGH',
    description: 'Broad core algorithm update',
    rolloutDays: 13,
  },
  {
    date: '2023-02-21',
    name: 'February 2023 Product Reviews Update',
    type: 'REVIEWS',
    impactLevel: 'MEDIUM',
    description: 'Product reviews update expanding to multiple languages',
    rolloutDays: 14,
  },
];

// =============================================================================
// SEVERITY THRESHOLDS
// =============================================================================

export const NUKE_THRESHOLDS = {
  /** Minimum clicks in period A to consider a page significant */
  MIN_PREVIOUS_CLICKS: 10,
  /** Minimum impressions in period A */
  MIN_PREVIOUS_IMPRESSIONS: 100,
  /** Percentage of pages nuked for CRITICAL severity */
  CRITICAL_PERCENTAGE: 30,
  /** Percentage of pages nuked for WARNING severity */
  WARNING_PERCENTAGE: 10,
};

export const CANNIBALIZATION_THRESHOLDS = {
  /** Minimum URL changes to flag as cannibalization */
  MIN_URL_CHANGES: 3,
  /** Minimum position variance for significant cannibalization */
  MIN_POSITION_VARIANCE: 5,
  /** Number of affected queries for HIGH severity */
  HIGH_SEVERITY_COUNT: 10,
  /** Number of affected queries for MEDIUM severity */
  MEDIUM_SEVERITY_COUNT: 5,
};

export const ALGO_CORRELATION_THRESHOLDS = {
  /** Days before update to check baseline */
  BASELINE_DAYS: 7,
  /** Days after update to check impact */
  IMPACT_DAYS: 14,
  /** Minimum percentage change to consider significant */
  MIN_CHANGE_PERCENT: 10,
};

// =============================================================================
// HANDBOOK RULES (Ranking 2.0)
// =============================================================================

export const HANDBOOK_RULES = {
  /** Pages created within this many months should not be optimized */
  NEW_PAGE_LOCKOUT_MONTHS: 6,
  /** Pages optimized within this many months should not be re-optimized */
  OPTIMIZATION_LOCKOUT_MONTHS: 9,
  /** Work is scheduled this many months out */
  QUEUE_LEAD_TIME_MONTHS: 3,
};

// =============================================================================
// ALLOWED STRATEGIES
// =============================================================================

export const ALLOWED_STRATEGIES = [
  {
    id: 'MINI_HOMEPAGE',
    name: 'Mini-Homepage',
    description: 'Create dedicated homepage for specific location',
    applicableFor: ['multi-location', 'geo-targeting'],
  },
  {
    id: 'AREAS_WE_SERVE',
    name: 'Areas We Serve Build',
    description: 'Build out geo-specific service area pages',
    applicableFor: ['missing-geo-pages', 'local-seo'],
  },
  {
    id: 'CONTENT_REFRESH',
    name: 'Content Refresh',
    description: 'Update existing page content (requires 9-month rule)',
    applicableFor: ['stale-content', 'ranking-drop'],
    requirements: ['9-month-rule-passed'],
  },
  {
    id: 'DIGITAL_PR',
    name: 'Digital PR',
    description: 'Build authority through PR and backlinks',
    applicableFor: ['9-month-locked', 'authority-building'],
  },
  {
    id: 'WEB_HEALTH_FIX',
    name: 'Web Health Fix',
    description: 'Fix technical issues (404s, Schema, Core Web Vitals)',
    applicableFor: ['technical-failure', '404s', 'schema-errors'],
  },
  {
    id: 'UNMAP_AND_CREATE',
    name: 'Unmap and Create New',
    description: 'Remove generic page from geo-grid, create dedicated page',
    applicableFor: ['generic-ranking-for-geo', 'mapping-issue'],
  },
] as const;

export type StrategyId = typeof ALLOWED_STRATEGIES[number]['id'];
