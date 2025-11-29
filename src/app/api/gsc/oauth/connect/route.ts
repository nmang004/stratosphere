/**
 * GSC OAuth Connect Route
 *
 * GET /api/gsc/oauth/connect?clientId=xxx
 *
 * Initiates OAuth flow for connecting client's GSC account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOAuthUrl, generateOAuthState, hasGSCCredentials } from '@/lib/gsc';
import { Database } from '@/types/database';

type UserClientAssignment = Database['public']['Tables']['user_client_assignments']['Row'];

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if GSC credentials are configured
    if (!hasGSCCredentials()) {
      return NextResponse.json(
        { error: 'GSC OAuth not configured. Contact administrator.' },
        { status: 503 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const returnUrl = searchParams.get('returnUrl');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Verify user has access to this client
    const { data: assignment, error: accessError } = await supabase
      .from('user_client_assignments')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .is('ended_at', null)
      .single() as { data: Pick<UserClientAssignment, 'id' | 'role'> | null; error: unknown };

    if (accessError || !assignment) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only allow PRIMARY users to connect GSC
    if (assignment.role !== 'PRIMARY' && assignment.role !== 'EXECUTIVE') {
      return NextResponse.json(
        { error: 'Only PRIMARY or EXECUTIVE users can connect GSC' },
        { status: 403 }
      );
    }

    // Generate OAuth state
    const state = generateOAuthState(clientId, returnUrl || undefined);

    // Get OAuth URL
    const oauthUrl = getOAuthUrl(state);

    // Redirect to Google OAuth
    return NextResponse.redirect(oauthUrl);
  } catch (error) {
    console.error('GSC OAuth Connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth', details: (error as Error).message },
      { status: 500 }
    );
  }
}
