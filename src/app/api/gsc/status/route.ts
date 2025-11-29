/**
 * GSC Status API Route
 *
 * GET /api/gsc/status?clientId=xxx
 *
 * Returns:
 * - Connection status
 * - Cache freshness
 * - Quota status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CachedGSCClient, isMockMode } from '@/lib/gsc';
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

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('gsc_property_url, domain')
      .eq('id', clientId)
      .single() as { data: Pick<Client, 'gsc_property_url' | 'domain'> | null; error: unknown };

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const gscClient = new CachedGSCClient(clientId);

    // Get status info
    const [connectionStatus, cacheFreshness, quotaStatus] = await Promise.all([
      gscClient.getConnectionStatus(),
      gscClient.getCacheFreshness(),
      gscClient.getQuotaStatus(),
    ]);

    return NextResponse.json({
      isMockMode: isMockMode(),
      siteUrl: client.gsc_property_url || `sc-domain:${client.domain}`,
      connection: connectionStatus,
      cache: {
        ...cacheFreshness,
        lastSync: cacheFreshness.lastSync?.toISOString(),
      },
      quota: {
        ...quotaStatus,
        nextResetAt: quotaStatus.nextResetAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('GSC Status error:', error);
    return NextResponse.json(
      { error: 'Failed to get GSC status', details: (error as Error).message },
      { status: 500 }
    );
  }
}
