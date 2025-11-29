/**
 * Serper.dev API Types
 *
 * Type definitions for Serper.dev Google Search API responses.
 * API Docs: https://serper.dev/api
 */

// =============================================================================
// REQUEST TYPES
// =============================================================================

export interface SerperSearchParams {
  /** Search query string */
  q: string;
  /** Country code for localized results (e.g., 'us', 'uk', 'ca') */
  gl?: string;
  /** Location for local results (e.g., 'Austin, Texas') */
  location?: string;
  /** Number of results to return (default 10, max 100) */
  num?: number;
  /** Page number for pagination */
  page?: number;
  /** Search type: search, images, news, places */
  type?: 'search' | 'images' | 'news' | 'places';
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  sitelinks?: Array<{
    title: string;
    link: string;
  }>;
  date?: string;
}

export interface SerperPeopleAlsoAsk {
  question: string;
  snippet: string;
  title?: string;
  link?: string;
}

export interface SerperRelatedSearch {
  query: string;
}

export interface SerperKnowledgeGraph {
  title?: string;
  type?: string;
  description?: string;
  website?: string;
  imageUrl?: string;
  attributes?: Record<string, string>;
}

export interface SerperLocalResult {
  title: string;
  address: string;
  phone?: string;
  rating?: number;
  reviews?: number;
  type?: string;
  position: number;
}

export interface SerperSearchResponse {
  searchParameters: {
    q: string;
    gl?: string;
    location?: string;
    type?: string;
    num?: number;
    page?: number;
  };
  organic: SerperOrganicResult[];
  peopleAlsoAsk?: SerperPeopleAlsoAsk[];
  relatedSearches?: SerperRelatedSearch[];
  knowledgeGraph?: SerperKnowledgeGraph;
  places?: SerperLocalResult[];
  credits?: number;
}

// =============================================================================
// MARKET CHECK TYPES (Processed Results)
// =============================================================================

export interface MarketCheckResult {
  query: string;
  location: string | null;
  targetDomain: string;
  results: {
    isRanking: boolean;
    position: number | null;
    rankingUrl: string | null;
    topCompetitors: Array<{
      domain: string;
      position: number;
      url: string;
      title: string;
    }>;
    serpFeatures: string[];
  };
  timestamp: string;
  cached: boolean;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface CachedSerperResponse {
  query: string;
  location: string | null;
  gl: string;
  response: SerperSearchResponse;
  created_at: string;
  expires_at: string;
}
