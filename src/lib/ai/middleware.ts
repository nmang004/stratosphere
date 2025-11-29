/**
 * AI Middleware - Forensics Edition
 *
 * Utility functions for AI request handling.
 * Simplified from the original client-based middleware.
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { AnalyzeTicketRequest } from './types';

// =============================================================================
// RATE LIMITING
// =============================================================================

const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 30,
  WINDOW_MS: 60 * 1000,
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if user is rate limited.
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || userLimit.resetAt < now) {
    // Reset window
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT.WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT.MAX_REQUESTS_PER_MINUTE - 1,
      resetIn: RATE_LIMIT.WINDOW_MS,
    };
  }

  if (userLimit.count >= RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: userLimit.resetAt - now,
    };
  }

  userLimit.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT.MAX_REQUESTS_PER_MINUTE - userLimit.count,
    resetIn: userLimit.resetAt - now,
  };
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Validate analyze ticket request.
 */
export function validateAnalyzeTicketRequest(body: unknown): {
  valid: boolean;
  errors: string[];
  request?: AnalyzeTicketRequest;
} {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }

  const req = body as Record<string, unknown>;

  // Required fields
  if (!req.ticketBody || typeof req.ticketBody !== 'string') {
    errors.push('ticketBody is required and must be a string');
  }

  if (!req.targetDomain || typeof req.targetDomain !== 'string') {
    errors.push('targetDomain is required and must be a string');
  }

  if (!req.amPersona || typeof req.amPersona !== 'string') {
    errors.push('amPersona is required and must be a string');
  } else {
    const validPersonas = ['PANIC_PATTY', 'TECHNICAL_TOM', 'GHOST_GARY'];
    if (!validPersonas.includes(req.amPersona as string)) {
      errors.push(`amPersona must be one of: ${validPersonas.join(', ')}`);
    }
  }

  // Optional fields validation
  if (req.pageMetadata !== undefined && typeof req.pageMetadata !== 'object') {
    errors.push('pageMetadata must be an object if provided');
  }

  if (req.targetQuery !== undefined && typeof req.targetQuery !== 'string') {
    errors.push('targetQuery must be a string if provided');
  }

  if (req.location !== undefined && typeof req.location !== 'string') {
    errors.push('location must be a string if provided');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    request: {
      ticketBody: req.ticketBody as string,
      targetDomain: req.targetDomain as string,
      amPersona: req.amPersona as AnalyzeTicketRequest['amPersona'],
      pageMetadata: req.pageMetadata as AnalyzeTicketRequest['pageMetadata'],
      targetQuery: req.targetQuery as string | undefined,
      location: req.location as string | undefined,
    },
  };
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Creates a Supabase client for the current request
 */
async function createRequestClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from Server Components
          }
        },
      },
    }
  );
}

/**
 * Authenticates the current request and returns user info
 */
export async function authenticateRequest(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createRequestClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (err) {
    console.error('[AI Middleware] Authentication error:', err);
    return null;
  }
}

/**
 * Get authenticated user from request header (for API routes).
 */
export async function getAuthenticatedUser(
  authHeader: string | null
): Promise<{ userId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return { userId: user.id };
  } catch {
    return null;
  }
}

// =============================================================================
// LOGGING
// =============================================================================

/**
 * Log AI interaction to database.
 */
export async function logAIInteraction(data: {
  userId?: string;
  ticketBody: string;
  targetDomain: string;
  amPersona: string;
  verdict: string;
  strategy: string | null;
  confidence: number;
  latencyMs: number;
  modelUsed: string;
  violations?: string[];
}): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('ticket_analyses').insert({
      user_id: data.userId || null,
      ticket_body: data.ticketBody,
      target_domain: data.targetDomain,
      am_persona: data.amPersona,
      verdict: data.verdict,
      strategy: data.strategy,
      confidence: data.confidence,
      latency_ms: data.latencyMs,
      model_used: data.modelUsed,
      warnings: data.violations || [],
    });
  } catch (error) {
    console.error('Failed to log AI interaction:', error);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Estimate token count for a string (rough approximation).
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Measure execution time.
 */
export function measureLatency(startTime: number): number {
  return Date.now() - startTime;
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

export const ERROR_RESPONSES = {
  RATE_LIMITED: {
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
  },
  UNAUTHORIZED: {
    error: 'Unauthorized',
    message: 'Authentication required.',
  },
  INVALID_REQUEST: {
    error: 'Invalid request',
    message: 'Request validation failed.',
  },
  AI_ERROR: {
    error: 'AI processing error',
    message: 'Failed to process request with AI.',
  },
} as const;
