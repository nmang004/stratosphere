/**
 * GSC OAuth Flow
 *
 * Handles OAuth 2.0 authentication for Google Search Console.
 * Supports both:
 * - Admin-managed credentials for agency properties
 * - User OAuth flow for client-owned properties
 */

import { createClient } from '@/lib/supabase/server';
import { GSCTokens, GSCCredentials } from './types';
import { Database, Json } from '@/types/database';

type Client = Database['public']['Tables']['clients']['Row'];

// =============================================================================
// CONFIGURATION
// =============================================================================

const GSC_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/webmasters',
];

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// =============================================================================
// CREDENTIALS HELPERS
// =============================================================================

/**
 * Get GSC OAuth credentials from environment
 */
export function getGSCCredentials(): GSCCredentials | null {
  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/gsc/oauth/callback`,
  };
}

/**
 * Check if GSC credentials are configured
 */
export function hasGSCCredentials(): boolean {
  return getGSCCredentials() !== null;
}

// =============================================================================
// OAUTH URL GENERATION
// =============================================================================

/**
 * Generate OAuth authorization URL
 *
 * @param redirectUri - Override redirect URI (optional)
 * @param state - State parameter for CSRF protection (should include clientId)
 */
export function getOAuthUrl(state: string, redirectUri?: string): string {
  const credentials = getGSCCredentials();

  if (!credentials) {
    throw new Error('GSC OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri || credentials.redirectUri,
    response_type: 'code',
    scope: GSC_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Always show consent screen to get refresh token
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Generate a secure state parameter for OAuth
 */
export function generateOAuthState(clientId: string, returnUrl?: string): string {
  const stateData = {
    clientId,
    returnUrl: returnUrl || `/clients/${clientId}/gsc`,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15),
  };

  // Base64 encode the state
  return Buffer.from(JSON.stringify(stateData)).toString('base64url');
}

/**
 * Parse and validate OAuth state parameter
 */
export function parseOAuthState(state: string): {
  clientId: string;
  returnUrl: string;
  timestamp: number;
  nonce: string;
} | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded);

    // Validate structure
    if (!parsed.clientId || !parsed.returnUrl || !parsed.timestamp) {
      return null;
    }

    // Validate timestamp (expire after 1 hour)
    const age = Date.now() - parsed.timestamp;
    if (age > 60 * 60 * 1000) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

// =============================================================================
// TOKEN EXCHANGE
// =============================================================================

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GSCTokens> {
  const credentials = getGSCCredentials();

  if (!credentials) {
    throw new Error('GSC OAuth credentials not configured');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: credentials.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scope: data.scope,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GSCTokens> {
  const credentials = getGSCCredentials();

  if (!credentials) {
    throw new Error('GSC OAuth credentials not configured');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // May not return new refresh token
    expiresAt,
    scope: data.scope,
  };
}

// =============================================================================
// TOKEN STORAGE
// =============================================================================

/**
 * Store GSC tokens for a client
 */
export async function storeClientGSCTokens(
  clientId: string,
  tokens: GSCTokens
): Promise<void> {
  const supabase = await createClient();

  // Store tokens in client record (encrypted in production via Supabase Vault)
  const tokensJson: Json = {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt.toISOString(),
    scope: tokens.scope,
  };

  const { error } = await supabase
    .from('clients')
    .update({
      gsc_tokens: tokensJson,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', clientId);

  if (error) {
    console.error('Error storing GSC tokens:', error);
    throw new Error('Failed to store GSC tokens');
  }
}

/**
 * Get GSC tokens for a client
 */
export async function getClientGSCTokens(clientId: string): Promise<GSCTokens | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('clients')
    .select('gsc_tokens')
    .eq('id', clientId)
    .single() as { data: Pick<Client, 'gsc_tokens'> | null; error: unknown };

  if (error || !data?.gsc_tokens) {
    return null;
  }

  const tokens = data.gsc_tokens as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    scope: string;
  };

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expires_at),
    scope: tokens.scope,
  };
}

/**
 * Get valid access token for a client (refresh if needed)
 */
export async function getValidAccessToken(clientId: string): Promise<string | null> {
  const tokens = await getClientGSCTokens(clientId);

  if (!tokens) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = new Date(tokens.expiresAt);
  const bufferMs = 5 * 60 * 1000;

  if (now.getTime() + bufferMs < expiresAt.getTime()) {
    // Token is still valid
    return tokens.accessToken;
  }

  // Token expired or expiring soon - refresh it
  try {
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    await storeClientGSCTokens(clientId, newTokens);
    return newTokens.accessToken;
  } catch (error) {
    console.error('Failed to refresh GSC token:', error);
    return null;
  }
}

/**
 * Remove GSC connection for a client
 */
export async function disconnectClientGSC(clientId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('clients')
    .update({
      gsc_tokens: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', clientId);

  if (error) {
    console.error('Error disconnecting GSC:', error);
    throw new Error('Failed to disconnect GSC');
  }
}

// =============================================================================
// CONNECTION STATUS
// =============================================================================

/**
 * Check if a client has GSC connected
 */
export async function isGSCConnected(clientId: string): Promise<boolean> {
  const tokens = await getClientGSCTokens(clientId);
  return tokens !== null;
}

/**
 * Get GSC connection status for a client
 */
export async function getGSCConnectionStatus(clientId: string): Promise<{
  connected: boolean;
  hasCredentials: boolean;
  expiresAt?: Date;
  canConnect: boolean;
}> {
  const hasCredentials = hasGSCCredentials();
  const tokens = await getClientGSCTokens(clientId);

  return {
    connected: tokens !== null,
    hasCredentials,
    expiresAt: tokens?.expiresAt,
    canConnect: hasCredentials && tokens === null,
  };
}
