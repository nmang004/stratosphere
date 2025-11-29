/**
 * GSC Types and Interfaces
 *
 * Type definitions for Google Search Console API integration.
 * Supports both mock and real API implementations.
 */

// =============================================================================
// SEARCH ANALYTICS TYPES
// =============================================================================

export type Dimension = 'query' | 'page' | 'country' | 'device' | 'date';
export type SearchType = 'web' | 'image' | 'video' | 'news' | 'discover' | 'googleNews';
export type AggregationType = 'auto' | 'byPage' | 'byProperty';
export type DeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET';

export interface SearchAnalyticsParams {
  siteUrl: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dimensions?: Dimension[];
  searchType?: SearchType;
  aggregationType?: AggregationType;
  rowLimit?: number;
  startRow?: number;
  dimensionFilterGroups?: DimensionFilterGroup[];
}

export interface DimensionFilterGroup {
  groupType?: 'and' | 'or';
  filters: DimensionFilter[];
}

export interface DimensionFilter {
  dimension: Dimension;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'includingRegex' | 'excludingRegex';
  expression: string;
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsResponse {
  rows: SearchAnalyticsRow[];
  responseAggregationType: AggregationType;
}

// =============================================================================
// PROPERTY & SITEMAP TYPES
// =============================================================================

export interface Property {
  siteUrl: string;
  permissionLevel: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser' | 'siteUnverifiedUser';
}

export interface Sitemap {
  path: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: 'sitemap' | 'urlList' | 'atomFeed' | 'rssFeed';
  lastDownloaded?: string;
  warnings?: number;
  errors?: number;
  contents?: SitemapContent[];
}

export interface SitemapContent {
  type: string;
  submitted?: number;
  indexed?: number;
}

export interface SitemapsResponse {
  sitemap: Sitemap[];
}

// =============================================================================
// URL INSPECTION TYPES
// =============================================================================

export interface UrlInspectionRequest {
  inspectionUrl: string;
  siteUrl: string;
  languageCode?: string;
}

export interface UrlInspectionResult {
  inspectionResult: {
    inspectionResultLink: string;
    indexStatusResult?: IndexStatusResult;
    ampResult?: AmpResult;
    mobileUsabilityResult?: MobileUsabilityResult;
    richResultsResult?: RichResultsResult;
  };
}

export interface IndexStatusResult {
  verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED';
  coverageState: string;
  robotsTxtState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  userCanonical?: string;
  crawledAs?: 'MOBILE' | 'DESKTOP' | 'CRAWLING_USER_AGENT_UNSPECIFIED';
  referringUrls?: string[];
}

export interface AmpResult {
  verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED';
  ampUrl?: string;
  ampIndexStatusVerdict?: string;
  issues?: AmpIssue[];
}

export interface AmpIssue {
  issueMessage: string;
  severity: 'WARNING' | 'ERROR';
}

export interface MobileUsabilityResult {
  verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED';
  issues?: MobileUsabilityIssue[];
}

export interface MobileUsabilityIssue {
  issueType: string;
  message: string;
  severity: 'WARNING' | 'ERROR';
}

export interface RichResultsResult {
  verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED';
  detectedItems?: DetectedItem[];
}

export interface DetectedItem {
  richResultType: string;
  items?: RichResultItem[];
}

export interface RichResultItem {
  name?: string;
  issues?: RichResultIssue[];
}

export interface RichResultIssue {
  issueMessage: string;
  severity: 'WARNING' | 'ERROR';
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface CacheOptions {
  forceRefresh?: boolean;
  maxAge?: number; // Hours, default 24
  clientId: string;
}

export interface CacheInfo {
  fromCache: boolean;
  cachedAt: Date | null;
  expiresAt: Date | null;
  ageHours: number;
  isStale: boolean;      // > 12h old
  isExpiring: boolean;   // > 20h old
}

export interface CachedGSCResponse<T> {
  data: T;
  cacheInfo: CacheInfo;
}

// =============================================================================
// QUOTA & RATE LIMIT TYPES
// =============================================================================

export interface QuotaStatus {
  remaining: number;
  used: number;
  allocated: number;
  canProceed: boolean;
  nextResetAt: Date;
}

export interface RateLimitConfig {
  retries: number;
  backoff: {
    type: 'exponential';
    minDelay: number;  // ms
    maxDelay: number;  // ms
  };
  quotaThreshold: number;
  sleepDuration: number; // ms
  staggerDelay: number;  // ms
}

// =============================================================================
// OAuth TYPES
// =============================================================================

export interface GSCTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export interface GSCCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// =============================================================================
// CLIENT INTERFACE
// =============================================================================

export interface GSCClient {
  // Search Analytics
  getSearchAnalytics(params: SearchAnalyticsParams): Promise<SearchAnalyticsResponse>;

  // Properties
  listProperties(): Promise<Property[]>;
  getProperty(siteUrl: string): Promise<Property>;

  // Sitemaps
  getSitemaps(siteUrl: string): Promise<SitemapsResponse>;
  submitSitemap(siteUrl: string, sitemapPath: string): Promise<void>;

  // URL Inspection
  inspectUrl(request: UrlInspectionRequest): Promise<UrlInspectionResult>;
}

// =============================================================================
// AGGREGATED DATA TYPES (for UI)
// =============================================================================

export interface GSCOverviewMetrics {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  clicksDelta: number;      // % change from previous period
  impressionsDelta: number;
  ctrDelta: number;
  positionDelta: number;
}

export interface GSCTimeSeriesData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCQueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  clicksDelta?: number;
  impressionsDelta?: number;
}

export interface GSCPageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  clicksDelta?: number;
  impressionsDelta?: number;
}

export interface GSCCountryData {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCDeviceData {
  device: DeviceType;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// =============================================================================
// ANOMALY DETECTION TYPES
// =============================================================================

export interface GSCAnomalyContext {
  date: Date;
  metric: 'clicks' | 'impressions' | 'ctr' | 'position';
  actualValue: number;
  expectedValue: number;
  deviationPercent: number;
  calendarEvents: CalendarEventContext[];
  isSeasonalOrEventDriven: boolean;
}

export interface CalendarEventContext {
  eventId: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  geoScope: string[];
  notes?: string;
}

// =============================================================================
// DATE RANGE PRESETS
// =============================================================================

export type DateRangePreset = '7d' | '14d' | '28d' | '90d' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 2); // GSC data is delayed by ~2 days

  const startDate = new Date(endDate);

  switch (preset) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '14d':
      startDate.setDate(startDate.getDate() - 14);
      break;
    case '28d':
      startDate.setDate(startDate.getDate() - 28);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'custom':
      // Return last 28 days as default for custom
      startDate.setDate(startDate.getDate() - 28);
      break;
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}
