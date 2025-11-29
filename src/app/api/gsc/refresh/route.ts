/**
 * GSC Refresh API Route
 *
 * POST /api/gsc/refresh
 *
 * Body:
 * - clientId: string (required)
 * - preset: '7d' | '14d' | '28d' | '90d' (default: '28d')
 *
 * Forces a cache refresh for GSC data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CachedGSCClient, getDateRangeFromPreset, invalidateCache } from '@/lib/gsc';
import { Database } from '@/types/database';

type Client = Database['public']['Tables']['clients']['Row'];

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { clientId, preset = '28d' } = body;

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
    const dateRange = getDateRangeFromPreset(preset);

    // Invalidate existing cache
    await invalidateCache(clientId);

    // Fetch fresh data
    const gscClient = new CachedGSCClient(clientId);
    await gscClient.refreshData(siteUrl, dateRange);

    // Get new cache freshness
    const cacheFreshness = await gscClient.getCacheFreshness();

    return NextResponse.json({
      success: true,
      message: 'GSC data refreshed successfully',
      cache: {
        ...cacheFreshness,
        lastSync: cacheFreshness.lastSync?.toISOString(),
      },
    });
  } catch (error) {
    console.error('GSC Refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh GSC data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
