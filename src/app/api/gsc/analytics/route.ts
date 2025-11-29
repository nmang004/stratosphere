/**
 * GSC Analytics API Route
 *
 * GET /api/gsc/analytics
 *
 * Query parameters:
 * - clientId: string (required)
 * - startDate: string (YYYY-MM-DD)
 * - endDate: string (YYYY-MM-DD)
 * - dimensions: string (comma-separated: query,page,country,device,date)
 * - type: 'overview' | 'timeseries' | 'queries' | 'pages' (default: 'overview')
 * - limit: number (for queries/pages, default 50)
 * - forceRefresh: boolean (bypass cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CachedGSCClient, getDateRangeFromPreset, DateRange } from '@/lib/gsc';
import { Database } from '@/types/database';

type Client = Database['public']['Tables']['clients']['Row'];

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const type = searchParams.get('type') || 'overview';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const preset = searchParams.get('preset') as '7d' | '14d' | '28d' | '90d' | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Verify user has access to this client
    const { data: assignment, error: accessError } = await supabase
      .from('user_client_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .is('ended_at', null)
      .single();

    if (accessError || !assignment) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get client GSC property URL
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('gsc_property_url, domain')
      .eq('id', clientId)
      .single() as { data: Pick<Client, 'gsc_property_url' | 'domain'> | null; error: unknown };

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const siteUrl = client.gsc_property_url || `sc-domain:${client.domain}`;

    // Determine date range
    let dateRange: DateRange;
    if (preset) {
      dateRange = getDateRangeFromPreset(preset);
    } else if (startDate && endDate) {
      dateRange = { startDate, endDate };
    } else {
      dateRange = getDateRangeFromPreset('28d');
    }

    // Create GSC client
    const gscClient = new CachedGSCClient(clientId);
    const cacheOptions = forceRefresh ? { forceRefresh: true } : {};

    // Fetch data based on type
    let result;
    switch (type) {
      case 'overview':
        result = await gscClient.getOverviewMetrics(siteUrl, dateRange, cacheOptions);
        break;

      case 'timeseries':
        result = await gscClient.getTimeSeriesData(siteUrl, dateRange, cacheOptions);
        break;

      case 'queries':
        result = await gscClient.getTopQueries(siteUrl, dateRange, limit, cacheOptions);
        break;

      case 'pages':
        result = await gscClient.getTopPages(siteUrl, dateRange, limit, cacheOptions);
        break;

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json({
      data: result.data,
      cacheInfo: {
        fromCache: result.cacheInfo.fromCache,
        cachedAt: result.cacheInfo.cachedAt?.toISOString(),
        expiresAt: result.cacheInfo.expiresAt?.toISOString(),
        ageHours: result.cacheInfo.ageHours,
        isStale: result.cacheInfo.isStale,
        isExpiring: result.cacheInfo.isExpiring,
      },
      dateRange,
      siteUrl,
    });
  } catch (error) {
    console.error('GSC Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GSC data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
