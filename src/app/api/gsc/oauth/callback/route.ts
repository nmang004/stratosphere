/**
 * GSC OAuth Callback Route
 *
 * GET /api/gsc/oauth/callback?code=xxx&state=xxx
 *
 * Handles OAuth callback from Google, exchanges code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  parseOAuthState,
  exchangeCodeForTokens,
  storeClientGSCTokens,
} from '@/lib/gsc';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle OAuth errors
  if (error) {
    console.error('GSC OAuth error:', error, errorDescription);
    const errorUrl = new URL('/clients', baseUrl);
    errorUrl.searchParams.set('gsc_error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    const errorUrl = new URL('/clients', baseUrl);
    errorUrl.searchParams.set('gsc_error', 'Missing required OAuth parameters');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorUrl = new URL('/login', baseUrl);
      errorUrl.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(errorUrl);
    }

    // Parse and validate state
    const stateData = parseOAuthState(state);

    if (!stateData) {
      const errorUrl = new URL('/clients', baseUrl);
      errorUrl.searchParams.set('gsc_error', 'Invalid or expired OAuth state');
      return NextResponse.redirect(errorUrl);
    }

    const { clientId, returnUrl } = stateData;

    // Verify user still has access to this client
    const { data: assignment, error: accessError } = await supabase
      .from('user_client_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .is('ended_at', null)
      .single();

    if (accessError || !assignment) {
      const errorUrl = new URL('/clients', baseUrl);
      errorUrl.searchParams.set('gsc_error', 'Access denied to this client');
      return NextResponse.redirect(errorUrl);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens for client
    await storeClientGSCTokens(clientId, tokens);

    // Redirect to return URL with success message
    const successUrl = new URL(returnUrl || `/clients/${clientId}/gsc`, baseUrl);
    successUrl.searchParams.set('gsc_connected', 'true');
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('GSC OAuth callback error:', error);

    const errorUrl = new URL('/clients', baseUrl);
    errorUrl.searchParams.set('gsc_error', (error as Error).message);
    return NextResponse.redirect(errorUrl);
  }
}
