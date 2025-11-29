/**
 * GSC Data Hooks
 *
 * React Query hooks for GSC data fetching with caching and optimistic updates.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GSCOverviewMetrics,
  GSCTimeSeriesData,
  GSCQueryData,
  GSCPageData,
  CacheInfo,
  DateRangePreset,
} from '@/lib/gsc/types';

// =============================================================================
// TYPES
// =============================================================================

interface GSCResponse<T> {
  data: T;
  cacheInfo: {
    fromCache: boolean;
    cachedAt: string | null;
    expiresAt: string | null;
    ageHours: number;
    isStale: boolean;
    isExpiring: boolean;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  siteUrl: string;
}

interface GSCStatusResponse {
  isMockMode: boolean;
  siteUrl: string;
  connection: {
    connected: boolean;
    hasCredentials: boolean;
    expiresAt?: string;
    canConnect: boolean;
  };
  cache: {
    hasCache: boolean;
    lastSync: string | null;
    hoursOld: number;
    isStale: boolean;
    isExpiring: boolean;
    recommendation: string;
  };
  quota: {
    remaining: number;
    used: number;
    allocated: number;
    canProceed: boolean;
    nextResetAt: string;
  };
}

interface RefreshResponse {
  success: boolean;
  message: string;
  cache: {
    hasCache: boolean;
    lastSync: string | null;
    hoursOld: number;
    isStale: boolean;
    isExpiring: boolean;
    recommendation: string;
  };
}

// =============================================================================
// FETCHER FUNCTIONS
// =============================================================================

async function fetchGSCData<T>(
  clientId: string,
  type: string,
  preset: DateRangePreset = '28d',
  forceRefresh = false
): Promise<GSCResponse<T>> {
  const params = new URLSearchParams({
    clientId,
    type,
    preset,
    ...(forceRefresh && { forceRefresh: 'true' }),
  });

  const response = await fetch(`/api/gsc/analytics?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch GSC data');
  }

  return response.json();
}

async function fetchGSCStatus(clientId: string): Promise<GSCStatusResponse> {
  const response = await fetch(`/api/gsc/status?clientId=${clientId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch GSC status');
  }

  return response.json();
}

async function refreshGSCData(clientId: string, preset: DateRangePreset = '28d'): Promise<RefreshResponse> {
  const response = await fetch('/api/gsc/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, preset }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to refresh GSC data');
  }

  return response.json();
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const gscKeys = {
  all: ['gsc'] as const,
  status: (clientId: string) => [...gscKeys.all, 'status', clientId] as const,
  analytics: (clientId: string, type: string, preset: DateRangePreset) =>
    [...gscKeys.all, 'analytics', clientId, type, preset] as const,
  overview: (clientId: string, preset: DateRangePreset) =>
    gscKeys.analytics(clientId, 'overview', preset),
  timeseries: (clientId: string, preset: DateRangePreset) =>
    gscKeys.analytics(clientId, 'timeseries', preset),
  queries: (clientId: string, preset: DateRangePreset) =>
    gscKeys.analytics(clientId, 'queries', preset),
  pages: (clientId: string, preset: DateRangePreset) =>
    gscKeys.analytics(clientId, 'pages', preset),
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get GSC status (connection, cache freshness, quota)
 */
export function useGSCStatus(clientId: string) {
  return useQuery({
    queryKey: gscKeys.status(clientId),
    queryFn: () => fetchGSCStatus(clientId),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get GSC overview metrics
 */
export function useGSCOverview(clientId: string, preset: DateRangePreset = '28d') {
  return useQuery({
    queryKey: gscKeys.overview(clientId, preset),
    queryFn: () => fetchGSCData<GSCOverviewMetrics>(clientId, 'overview', preset),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get GSC time series data
 */
export function useGSCTimeSeries(clientId: string, preset: DateRangePreset = '28d') {
  return useQuery({
    queryKey: gscKeys.timeseries(clientId, preset),
    queryFn: () => fetchGSCData<GSCTimeSeriesData[]>(clientId, 'timeseries', preset),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get top queries
 */
export function useGSCQueries(clientId: string, preset: DateRangePreset = '28d') {
  return useQuery({
    queryKey: gscKeys.queries(clientId, preset),
    queryFn: () => fetchGSCData<GSCQueryData[]>(clientId, 'queries', preset),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get top pages
 */
export function useGSCPages(clientId: string, preset: DateRangePreset = '28d') {
  return useQuery({
    queryKey: gscKeys.pages(clientId, preset),
    queryFn: () => fetchGSCData<GSCPageData[]>(clientId, 'pages', preset),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to refresh GSC data
 */
export function useRefreshGSC(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preset: DateRangePreset = '28d') => refreshGSCData(clientId, preset),
    onSuccess: () => {
      // Invalidate all GSC queries for this client
      queryClient.invalidateQueries({ queryKey: [...gscKeys.all, 'analytics', clientId] });
      queryClient.invalidateQueries({ queryKey: gscKeys.status(clientId) });
    },
  });
}

/**
 * Combined hook for GSC data (overview, timeseries, queries, pages)
 */
export function useGSCData(clientId: string, preset: DateRangePreset = '28d') {
  const overview = useGSCOverview(clientId, preset);
  const timeseries = useGSCTimeSeries(clientId, preset);
  const queries = useGSCQueries(clientId, preset);
  const pages = useGSCPages(clientId, preset);
  const status = useGSCStatus(clientId);

  const isLoading = overview.isLoading || timeseries.isLoading || queries.isLoading || pages.isLoading;
  const isError = overview.isError || timeseries.isError || queries.isError || pages.isError;
  const error = overview.error || timeseries.error || queries.error || pages.error;

  // Get cache info from any successful response
  const cacheInfo = overview.data?.cacheInfo || timeseries.data?.cacheInfo;

  return {
    overview: overview.data,
    timeseries: timeseries.data,
    queries: queries.data,
    pages: pages.data,
    status: status.data,
    cacheInfo,
    isLoading,
    isError,
    error,
    refetch: () => {
      overview.refetch();
      timeseries.refetch();
      queries.refetch();
      pages.refetch();
      status.refetch();
    },
  };
}

/**
 * Hook for GSC connection status and OAuth flow
 */
export function useGSCConnection(clientId: string) {
  const status = useGSCStatus(clientId);

  const initiateOAuth = () => {
    const returnUrl = window.location.pathname;
    window.location.href = `/api/gsc/oauth/connect?clientId=${clientId}&returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  return {
    isConnected: status.data?.connection?.connected ?? false,
    canConnect: status.data?.connection?.canConnect ?? false,
    hasCredentials: status.data?.connection?.hasCredentials ?? false,
    isMockMode: status.data?.isMockMode ?? true,
    isLoading: status.isLoading,
    initiateOAuth,
  };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Get cache age display info
 */
export function useCacheFreshness(cacheInfo: GSCResponse<unknown>['cacheInfo'] | undefined) {
  if (!cacheInfo) {
    return {
      hasData: false,
      ageText: 'No data',
      color: 'red' as const,
      showWarning: true,
      warningText: 'No cached data available. Sync required.',
    };
  }

  const ageHours = cacheInfo.ageHours;
  const ageText = ageHours < 1
    ? 'Less than 1 hour ago'
    : `${ageHours.toFixed(1)} hours ago`;

  let color: 'green' | 'yellow' | 'red';
  let showWarning = false;
  let warningText = '';

  if (cacheInfo.isExpiring) {
    color = 'red';
    showWarning = true;
    warningText = `Data approaching expiration (${ageHours.toFixed(1)}h old). Refresh recommended.`;
  } else if (cacheInfo.isStale) {
    color = 'yellow';
    showWarning = true;
    warningText = `Data is ${ageHours.toFixed(1)}h old. Consider refreshing for critical decisions.`;
  } else {
    color = 'green';
  }

  return {
    hasData: true,
    ageText,
    color,
    showWarning,
    warningText,
    fromCache: cacheInfo.fromCache,
    cachedAt: cacheInfo.cachedAt ? new Date(cacheInfo.cachedAt) : null,
  };
}
