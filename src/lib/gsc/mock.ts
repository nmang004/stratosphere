/**
 * Mock GSC Client
 *
 * Generates realistic mock data for Google Search Console API.
 * Used when USE_MOCK_GSC=true (default for MVP).
 */

import {
  GSCClient,
  SearchAnalyticsParams,
  SearchAnalyticsResponse,
  SearchAnalyticsRow,
  Property,
  SitemapsResponse,
  Sitemap,
  UrlInspectionRequest,
  UrlInspectionResult,
  DateRange,
  formatDate,
  DeviceType,
} from './types';

// =============================================================================
// MOCK DATA SEEDS
// =============================================================================

// Realistic query patterns for different industries
const QUERY_TEMPLATES: Record<string, string[]> = {
  saas: [
    'best {product} software',
    '{product} pricing',
    '{product} vs {competitor}',
    'how to {action}',
    '{product} reviews',
    '{product} alternatives',
    'free {product} tools',
    '{product} for small business',
    '{product} integration',
    '{product} api',
    'enterprise {product}',
    '{product} demo',
    '{product} tutorial',
    '{product} features',
    '{product} comparison',
  ],
  publishing: [
    'best {topic} ideas',
    '{topic} tips',
    '{topic} guide 2024',
    'how to {topic}',
    '{topic} inspiration',
    '{topic} trends',
    '{topic} diy',
    '{topic} on a budget',
    'luxury {topic}',
    '{topic} before and after',
    '{topic} photos',
    '{topic} designs',
    'modern {topic}',
    'traditional {topic}',
    '{topic} near me',
  ],
  healthcare: [
    '{service} near me',
    '{condition} symptoms',
    '{condition} treatment',
    'best {provider} in {city}',
    '{service} cost',
    '{condition} causes',
    'when to see a {provider}',
    '{service} vs {alternative}',
    '{condition} prevention',
    '{service} insurance',
    'telehealth {service}',
    'same day {service}',
    '{provider} accepting patients',
    '{condition} doctor',
    'urgent care vs {provider}',
  ],
};

const PAGE_PATTERNS = [
  '/blog/{slug}',
  '/services/{service}',
  '/products/{product}',
  '/pricing',
  '/about',
  '/contact',
  '/features/{feature}',
  '/resources/{resource}',
  '/case-studies/{case}',
  '/solutions/{solution}',
  '/integrations/{integration}',
  '/docs/{doc}',
  '/faq',
  '/demo',
  '/free-trial',
];

const COUNTRIES = ['usa', 'gbr', 'can', 'aus', 'deu', 'fra', 'ind', 'jpn', 'bra', 'mex'];
const DEVICES: DeviceType[] = ['DESKTOP', 'MOBILE', 'TABLET'];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Seeded random number generator for consistent mock data
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let state = hash;

  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate a random integer within a range
 */
function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Generate mock search analytics data
 */
function generateMockRows(
  params: SearchAnalyticsParams,
  clientSeed: string
): SearchAnalyticsRow[] {
  const rng = seededRandom(clientSeed + params.startDate + params.endDate);
  const rows: SearchAnalyticsRow[] = [];
  const dimensions = params.dimensions || ['date'];

  // Determine base metrics based on client type
  const baseClicks = randomInt(rng, 50, 500);
  const baseImpressions = baseClicks * randomInt(rng, 20, 50);
  const basePosition = 5 + rng() * 15;

  // Generate dates in range
  const dates: string[] = [];
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(d));
  }

  // Generate different data based on dimensions
  if (dimensions.includes('date') && dimensions.length === 1) {
    // Time series data
    dates.forEach((date, index) => {
      // Add some trend (slight increase over time)
      const trendMultiplier = 1 + (index * 0.002);
      // Add day-of-week seasonality
      const dayOfWeek = new Date(date).getDay();
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.1;
      // Add some random noise
      const noiseMultiplier = 0.8 + rng() * 0.4;

      const clicks = Math.round(baseClicks * trendMultiplier * weekendMultiplier * noiseMultiplier);
      const impressions = Math.round(baseImpressions * trendMultiplier * weekendMultiplier * noiseMultiplier);

      rows.push({
        keys: [date],
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: basePosition + (rng() - 0.5) * 2,
      });
    });
  } else if (dimensions.includes('query')) {
    // Query data
    const queries = generateMockQueries(clientSeed, params.rowLimit || 50);
    queries.forEach((query, index) => {
      const popularityMultiplier = Math.pow(0.85, index); // Power law distribution
      const clicks = Math.round(baseClicks * popularityMultiplier * (0.5 + rng()));
      const impressions = Math.round(clicks * (15 + rng() * 30));

      rows.push({
        keys: dimensions.includes('date')
          ? [query, dates[randomInt(rng, 0, dates.length - 1)]]
          : [query],
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: 5 + index * 0.3 + rng() * 10,
      });
    });
  } else if (dimensions.includes('page')) {
    // Page data
    const pages = generateMockPages(clientSeed, params.rowLimit || 100);
    pages.forEach((page, index) => {
      const popularityMultiplier = Math.pow(0.9, index);
      const clicks = Math.round(baseClicks * 2 * popularityMultiplier * (0.5 + rng()));
      const impressions = Math.round(clicks * (20 + rng() * 40));

      rows.push({
        keys: dimensions.includes('date')
          ? [page, dates[randomInt(rng, 0, dates.length - 1)]]
          : [page],
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: 3 + index * 0.2 + rng() * 8,
      });
    });
  } else if (dimensions.includes('country')) {
    // Country data
    COUNTRIES.forEach((country, index) => {
      const popularityMultiplier = Math.pow(0.7, index);
      const clicks = Math.round(baseClicks * 3 * popularityMultiplier * (0.5 + rng()));
      const impressions = Math.round(clicks * (25 + rng() * 35));

      rows.push({
        keys: [country],
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: 8 + index * 0.5 + rng() * 5,
      });
    });
  } else if (dimensions.includes('device')) {
    // Device data (mobile typically dominant)
    const deviceWeights = { MOBILE: 0.55, DESKTOP: 0.40, TABLET: 0.05 };
    DEVICES.forEach((device) => {
      const weight = deviceWeights[device];
      const clicks = Math.round(baseClicks * 10 * weight * (0.8 + rng() * 0.4));
      const impressions = Math.round(clicks * (20 + rng() * 30));

      rows.push({
        keys: [device],
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: device === 'MOBILE' ? basePosition - 1 : basePosition + 2,
      });
    });
  }

  // Apply row limit
  const limit = params.rowLimit || 1000;
  const startRow = params.startRow || 0;

  return rows.slice(startRow, startRow + limit);
}

/**
 * Generate mock query strings
 */
function generateMockQueries(clientSeed: string, count: number): string[] {
  const rng = seededRandom(clientSeed + 'queries');
  const industry = getIndustryFromSeed(clientSeed);
  const templates = QUERY_TEMPLATES[industry] || QUERY_TEMPLATES.saas;

  const words: Record<string, string[]> = {
    product: ['crm', 'project management', 'automation', 'analytics', 'marketing'],
    competitor: ['hubspot', 'salesforce', 'asana', 'monday', 'trello'],
    action: ['automate workflows', 'track leads', 'manage projects', 'analyze data'],
    topic: ['coastal decor', 'beach house', 'ocean view', 'waterfront living', 'nautical design'],
    service: ['primary care', 'urgent care', 'telehealth', 'lab testing', 'vaccination'],
    condition: ['flu', 'covid', 'allergies', 'back pain', 'anxiety'],
    provider: ['doctor', 'physician', 'specialist', 'nurse practitioner'],
    city: ['atlanta', 'chicago', 'houston', 'phoenix', 'miami'],
    alternative: ['hospital', 'er', 'specialist'],
  };

  const queries: string[] = [];
  for (let i = 0; i < count; i++) {
    const template = templates[randomInt(rng, 0, templates.length - 1)];
    let query = template;

    // Replace placeholders
    Object.entries(words).forEach(([key, values]) => {
      const placeholder = `{${key}}`;
      if (query.includes(placeholder)) {
        query = query.replace(placeholder, values[randomInt(rng, 0, values.length - 1)]);
      }
    });

    queries.push(query);
  }

  return [...new Set(queries)]; // Remove duplicates
}

/**
 * Generate mock page URLs
 */
function generateMockPages(clientSeed: string, count: number): string[] {
  const rng = seededRandom(clientSeed + 'pages');
  const domain = getDomainFromSeed(clientSeed);

  const slugs = [
    'getting-started', 'features', 'pricing', 'enterprise', 'free-trial',
    'integrations', 'api-docs', 'case-study-acme', 'webinar-2024',
    'ultimate-guide', 'best-practices', 'tips-and-tricks', 'comparison',
    'how-it-works', 'security', 'compliance', 'gdpr', 'support',
  ];

  const pages: string[] = [];
  for (let i = 0; i < count; i++) {
    const pattern = PAGE_PATTERNS[randomInt(rng, 0, PAGE_PATTERNS.length - 1)];
    const slug = slugs[randomInt(rng, 0, slugs.length - 1)];
    const page = `https://${domain}${pattern.replace('{slug}', slug).replace(/{[^}]+}/g, slug)}`;
    pages.push(page);
  }

  return [...new Set(pages)];
}

/**
 * Get industry from client seed (deterministic)
 */
function getIndustryFromSeed(seed: string): string {
  const industries = ['saas', 'publishing', 'healthcare'];
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return industries[hash % industries.length];
}

/**
 * Get domain from client seed
 */
function getDomainFromSeed(seed: string): string {
  // Use seed to create consistent domain
  const domains: Record<string, string> = {
    'c1111111-1111-1111-1111-111111111111': 'techflow.io',
    'c2222222-2222-2222-2222-222222222222': 'coastalliving.com',
    'c3333333-3333-3333-3333-333333333333': 'medicareplus.health',
  };
  return domains[seed] || 'example.com';
}

// =============================================================================
// MOCK GSC CLIENT IMPLEMENTATION
// =============================================================================

export class MockGSCClient implements GSCClient {
  private clientSeed: string;

  constructor(clientId?: string) {
    this.clientSeed = clientId || 'default';
  }

  async getSearchAnalytics(params: SearchAnalyticsParams): Promise<SearchAnalyticsResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    const rows = generateMockRows(params, this.clientSeed);

    return {
      rows,
      responseAggregationType: params.aggregationType || 'auto',
    };
  }

  async listProperties(): Promise<Property[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const domain = getDomainFromSeed(this.clientSeed);

    return [
      {
        siteUrl: `sc-domain:${domain}`,
        permissionLevel: 'siteOwner',
      },
      {
        siteUrl: `https://${domain}/`,
        permissionLevel: 'siteFullUser',
      },
    ];
  }

  async getProperty(siteUrl: string): Promise<Property> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      siteUrl,
      permissionLevel: 'siteOwner',
    };
  }

  async getSitemaps(siteUrl: string): Promise<SitemapsResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const domain = siteUrl.replace('sc-domain:', '').replace('https://', '').replace('/', '');
    const now = new Date();

    const sitemaps: Sitemap[] = [
      {
        path: `https://${domain}/sitemap.xml`,
        lastSubmitted: formatDate(now),
        lastDownloaded: formatDate(now),
        isSitemapsIndex: true,
        type: 'sitemap',
        warnings: 0,
        errors: 0,
        contents: [
          { type: 'web', submitted: 150, indexed: 145 },
        ],
      },
      {
        path: `https://${domain}/blog-sitemap.xml`,
        lastSubmitted: formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        lastDownloaded: formatDate(now),
        type: 'sitemap',
        warnings: 2,
        errors: 0,
        contents: [
          { type: 'web', submitted: 85, indexed: 80 },
        ],
      },
    ];

    return { sitemap: sitemaps };
  }

  async submitSitemap(_siteUrl: string, _sitemapPath: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Mock successful submission
  }

  async inspectUrl(request: UrlInspectionRequest): Promise<UrlInspectionResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const rng = seededRandom(request.inspectionUrl);

    return {
      inspectionResult: {
        inspectionResultLink: `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(request.siteUrl)}`,
        indexStatusResult: {
          verdict: rng() > 0.1 ? 'PASS' : 'PARTIAL',
          coverageState: rng() > 0.1 ? 'Submitted and indexed' : 'Discovered - currently not indexed',
          robotsTxtState: 'ALLOWED',
          indexingState: 'INDEXING_ALLOWED',
          lastCrawlTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          pageFetchState: 'SUCCESSFUL',
          googleCanonical: request.inspectionUrl,
          crawledAs: rng() > 0.5 ? 'MOBILE' : 'DESKTOP',
        },
        mobileUsabilityResult: {
          verdict: rng() > 0.2 ? 'PASS' : 'PARTIAL',
          issues: rng() > 0.2 ? [] : [
            {
              issueType: 'VIEWPORT_NOT_SET',
              message: 'Viewport not set',
              severity: 'WARNING',
            },
          ],
        },
        richResultsResult: {
          verdict: rng() > 0.4 ? 'PASS' : 'NEUTRAL',
          detectedItems: rng() > 0.5 ? [
            {
              richResultType: 'Article',
              items: [{ name: 'Article' }],
            },
          ] : [],
        },
      },
    };
  }
}

// =============================================================================
// EXTENDED MOCK DATA GENERATORS
// =============================================================================

/**
 * Generate extended mock data for a specific client
 * Used for seeding the database with realistic GSC cache data
 */
export function generateExtendedMockData(
  clientId: string,
  dateRange: DateRange
): {
  searchAnalytics: SearchAnalyticsResponse;
  topQueries: SearchAnalyticsResponse;
  topPages: SearchAnalyticsResponse;
  countryBreakdown: SearchAnalyticsResponse;
  deviceBreakdown: SearchAnalyticsResponse;
} {
  const client = new MockGSCClient(clientId);
  const domain = getDomainFromSeed(clientId);
  const siteUrl = `sc-domain:${domain}`;

  // Generate different views of the data synchronously using the same seed
  const baseParams: SearchAnalyticsParams = {
    siteUrl,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  };

  // We need to run these synchronously for consistent seeding
  // In practice, we'll call the async methods

  const rng = seededRandom(clientId + dateRange.startDate);

  return {
    searchAnalytics: {
      rows: generateMockRows({ ...baseParams, dimensions: ['date'] }, clientId),
      responseAggregationType: 'auto',
    },
    topQueries: {
      rows: generateMockRows({ ...baseParams, dimensions: ['query'], rowLimit: 50 }, clientId),
      responseAggregationType: 'auto',
    },
    topPages: {
      rows: generateMockRows({ ...baseParams, dimensions: ['page'], rowLimit: 100 }, clientId),
      responseAggregationType: 'auto',
    },
    countryBreakdown: {
      rows: generateMockRows({ ...baseParams, dimensions: ['country'] }, clientId),
      responseAggregationType: 'auto',
    },
    deviceBreakdown: {
      rows: generateMockRows({ ...baseParams, dimensions: ['device'] }, clientId),
      responseAggregationType: 'auto',
    },
  };
}

/**
 * Check if mock mode is enabled
 */
export function isMockMode(): boolean {
  return process.env.USE_MOCK_GSC !== 'false';
}
