/**
 * GSC Client
 *
 * Main Google Search Console API client with:
 * - Mock/Real adapter pattern (USE_MOCK_GSC environment variable)
 * - Cache-first data fetching
 * - Rate limiting with exponential backoff
 * - Quota tracking
 *
 * Usage:
 * const client = await createGSCClient(clientId);
 * const data = await client.getSearchAnalytics(params);
 */

import {
  GSCClient,
  SearchAnalyticsParams,
  SearchAnalyticsResponse,
  Property,
  SitemapsResponse,
  UrlInspectionRequest,
  UrlInspectionResult,
  CacheOptions,
  CachedGSCResponse,
  DateRange,
  formatDate,
  GSCOverviewMetrics,
  GSCTimeSeriesData,
  GSCQueryData,
  GSCPageData,
} from './types';

import { MockGSCClient, isMockMode } from './mock';
import { getCachedGSCData, generateEndpointSignature, getClientCacheFreshness } from './cache';
import { executeWithProtection, getQuotaStatus } from './rateLimit';
import { getValidAccessToken, isGSCConnected, getGSCConnectionStatus } from './oauth';

// =============================================================================
// REAL GSC CLIENT (for production use)
// =============================================================================

const GSC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3';
const GSC_INSPECTION_API = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

class RealGSCClient implements GSCClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.error?.message || `GSC API error: ${response.status}`;
      throw new Error(message);
    }

    return response.json();
  }

  async getSearchAnalytics(params: SearchAnalyticsParams): Promise<SearchAnalyticsResponse> {
    const url = `${GSC_API_BASE}/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`;

    const body = {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      type: params.searchType || 'web',
      aggregationType: params.aggregationType,
      rowLimit: params.rowLimit || 1000,
      startRow: params.startRow || 0,
      dimensionFilterGroups: params.dimensionFilterGroups,
    };

    return this.fetch<SearchAnalyticsResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listProperties(): Promise<Property[]> {
    const url = `${GSC_API_BASE}/sites`;
    const response = await this.fetch<{ siteEntry: Property[] }>(url);
    return response.siteEntry || [];
  }

  async getProperty(siteUrl: string): Promise<Property> {
    const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}`;
    return this.fetch<Property>(url);
  }

  async getSitemaps(siteUrl: string): Promise<SitemapsResponse> {
    const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`;
    return this.fetch<SitemapsResponse>(url);
  }

  async submitSitemap(siteUrl: string, sitemapPath: string): Promise<void> {
    const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapPath)}`;
    await this.fetch(url, { method: 'PUT' });
  }

  async inspectUrl(request: UrlInspectionRequest): Promise<UrlInspectionResult> {
    return this.fetch<UrlInspectionResult>(GSC_INSPECTION_API, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// =============================================================================
// CLIENT FACTORY
// =============================================================================

/**
 * Create a GSC client for a specific client
 *
 * @param clientId - The Stratosphere client ID
 * @returns GSC client instance (mock or real based on environment)
 */
export async function createGSCClient(clientId: string): Promise<GSCClient> {
  // Check if mock mode is enabled
  if (isMockMode()) {
    return new MockGSCClient(clientId);
  }

  // Get access token for real API
  const accessToken = await getValidAccessToken(clientId);

  if (!accessToken) {
    // Fall back to mock if no credentials
    console.warn(`No GSC credentials for client ${clientId}, using mock client`);
    return new MockGSCClient(clientId);
  }

  return new RealGSCClient(accessToken);
}

// =============================================================================
// CACHED CLIENT WRAPPER
// =============================================================================

/**
 * High-level GSC data fetching with caching, rate limiting, and error handling
 */
export class CachedGSCClient {
  private clientId: string;
  private client: GSCClient | null = null;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  private async getClient(): Promise<GSCClient> {
    if (!this.client) {
      this.client = await createGSCClient(this.clientId);
    }
    return this.client;
  }

  /**
   * Get search analytics with caching
   */
  async getSearchAnalytics(
    params: SearchAnalyticsParams,
    options: Partial<CacheOptions> = {}
  ): Promise<CachedGSCResponse<SearchAnalyticsResponse>> {
    const cacheOptions: CacheOptions = {
      clientId: this.clientId,
      ...options,
    };

    return getCachedGSCData(
      'searchAnalytics',
      params as unknown as Record<string, unknown>,
      async () => {
        const client = await this.getClient();
        return executeWithProtection(
          this.clientId,
          () => client.getSearchAnalytics(params),
          { trackUsage: !isMockMode() }
        );
      },
      cacheOptions
    );
  }

  /**
   * Get time series data (clicks, impressions over time)
   */
  async getTimeSeriesData(
    siteUrl: string,
    dateRange: DateRange,
    options: Partial<CacheOptions> = {}
  ): Promise<CachedGSCResponse<GSCTimeSeriesData[]>> {
    const params: SearchAnalyticsParams = {
      siteUrl,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dimensions: ['date'],
    };

    const result = await this.getSearchAnalytics(params, options);

    // Transform to time series format
    const timeSeries: GSCTimeSeriesData[] = result.data.rows.map((row) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));

    // Sort by date
    timeSeries.sort((a, b) => a.date.localeCompare(b.date));

    return {
      data: timeSeries,
      cacheInfo: result.cacheInfo,
    };
  }

  /**
   * Get top queries
   */
  async getTopQueries(
    siteUrl: string,
    dateRange: DateRange,
    limit: number = 50,
    options: Partial<CacheOptions> = {}
  ): Promise<CachedGSCResponse<GSCQueryData[]>> {
    const params: SearchAnalyticsParams = {
      siteUrl,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dimensions: ['query'],
      rowLimit: limit,
    };

    const result = await this.getSearchAnalytics(params, options);

    const queries: GSCQueryData[] = result.data.rows.map((row) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));

    return {
      data: queries,
      cacheInfo: result.cacheInfo,
    };
  }

  /**
   * Get top pages
   */
  async getTopPages(
    siteUrl: string,
    dateRange: DateRange,
    limit: number = 100,
    options: Partial<CacheOptions> = {}
  ): Promise<CachedGSCResponse<GSCPageData[]>> {
    const params: SearchAnalyticsParams = {
      siteUrl,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dimensions: ['page'],
      rowLimit: limit,
    };

    const result = await this.getSearchAnalytics(params, options);

    const pages: GSCPageData[] = result.data.rows.map((row) => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));

    return {
      data: pages,
      cacheInfo: result.cacheInfo,
    };
  }

  /**
   * Get overview metrics with comparison to previous period
   */
  async getOverviewMetrics(
    siteUrl: string,
    dateRange: DateRange,
    options: Partial<CacheOptions> = {}
  ): Promise<CachedGSCResponse<GSCOverviewMetrics>> {
    // Get current period data
    const currentResult = await this.getTimeSeriesData(siteUrl, dateRange, options);

    // Calculate previous period
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);

    const previousRange: DateRange = {
      startDate: formatDate(prevStartDate),
      endDate: formatDate(prevEndDate),
    };

    // Get previous period data
    const previousResult = await this.getTimeSeriesData(siteUrl, previousRange, options);

    // Calculate totals
    const current = currentResult.data.reduce(
      (acc, day) => ({
        clicks: acc.clicks + day.clicks,
        impressions: acc.impressions + day.impressions,
        ctr: acc.ctr + day.ctr,
        position: acc.position + day.position,
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );

    const previous = previousResult.data.reduce(
      (acc, day) => ({
        clicks: acc.clicks + day.clicks,
        impressions: acc.impressions + day.impressions,
        ctr: acc.ctr + day.ctr,
        position: acc.position + day.position,
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );

    const currentDays = currentResult.data.length || 1;
    const previousDays = previousResult.data.length || 1;

    // Calculate averages
    const avgCtr = current.ctr / currentDays;
    const avgPosition = current.position / currentDays;
    const prevAvgCtr = previous.ctr / previousDays;
    const prevAvgPosition = previous.position / previousDays;

    // Calculate deltas
    const clicksDelta = previous.clicks ? ((current.clicks - previous.clicks) / previous.clicks) * 100 : 0;
    const impressionsDelta = previous.impressions
      ? ((current.impressions - previous.impressions) / previous.impressions) * 100
      : 0;
    const ctrDelta = prevAvgCtr ? ((avgCtr - prevAvgCtr) / prevAvgCtr) * 100 : 0;
    const positionDelta = prevAvgPosition ? prevAvgPosition - avgPosition : 0; // Positive = improvement

    return {
      data: {
        totalClicks: current.clicks,
        totalImpressions: current.impressions,
        avgCtr,
        avgPosition,
        clicksDelta: Math.round(clicksDelta * 10) / 10,
        impressionsDelta: Math.round(impressionsDelta * 10) / 10,
        ctrDelta: Math.round(ctrDelta * 10) / 10,
        positionDelta: Math.round(positionDelta * 10) / 10,
      },
      cacheInfo: currentResult.cacheInfo,
    };
  }

  /**
   * Get GSC connection status
   */
  async getConnectionStatus() {
    return getGSCConnectionStatus(this.clientId);
  }

  /**
   * Get cache freshness status
   */
  async getCacheFreshness() {
    return getClientCacheFreshness(this.clientId);
  }

  /**
   * Get quota status
   */
  async getQuotaStatus() {
    return getQuotaStatus(this.clientId);
  }

  /**
   * Force refresh all cached data
   */
  async refreshData(siteUrl: string, dateRange: DateRange): Promise<void> {
    const forceOptions = { forceRefresh: true };

    // Refresh all data in parallel
    await Promise.all([
      this.getTimeSeriesData(siteUrl, dateRange, forceOptions),
      this.getTopQueries(siteUrl, dateRange, 50, forceOptions),
      this.getTopPages(siteUrl, dateRange, 100, forceOptions),
    ]);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { isMockMode } from './mock';
export { isGSCConnected, getGSCConnectionStatus } from './oauth';
export {
  getClientCacheFreshness,
  getFreshnessMessage,
  getFreshnessColor,
  invalidateCache,
} from './cache';
export { getQuotaStatus, checkQuota } from './rateLimit';
