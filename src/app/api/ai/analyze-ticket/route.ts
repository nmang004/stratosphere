/**
 * POST /api/ai/analyze-ticket
 *
 * Main endpoint for the Forensics Console.
 * Analyzes AM tickets using forensic data and AI with Handbook constraints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createClient } from '@supabase/supabase-js';

import { buildForensicsPrompt, validateForensicsResponse, type ForensicsAIResponse } from '@/lib/ai/system-prompts';
import { checkNineMonthRule, buildConstraintContext } from '@/lib/ai/constraints';
import type { AMPersona, AnalyzeTicketRequest, AnalyzeTicketResponse, VerdictType } from '@/lib/ai/types';
import { verifyRanking, type MarketVerificationResult } from '@/lib/forensics/market-check';
import { analyzeAlgoCorrelations, getUpdatesInRange } from '@/lib/forensics/algo-overlay';
import { isSerperConfigured } from '@/lib/serper';

// =============================================================================
// CONFIGURATION
// =============================================================================

const MODEL = google('gemini-2.0-flash');

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request
    const body = await request.json() as AnalyzeTicketRequest;

    // Validate required fields
    if (!body.ticketBody || !body.targetDomain || !body.amPersona) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketBody, targetDomain, amPersona' },
        { status: 400 }
      );
    }

    // Validate persona
    const validPersonas: AMPersona[] = ['PANIC_PATTY', 'TECHNICAL_TOM', 'GHOST_GARY'];
    if (!validPersonas.includes(body.amPersona)) {
      return NextResponse.json(
        { error: `Invalid amPersona. Must be one of: ${validPersonas.join(', ')}` },
        { status: 400 }
      );
    }

    // ==========================================================================
    // PHASE 1: GATHER FORENSIC DATA
    // ==========================================================================

    const forensicData: AnalyzeTicketResponse['forensicData'] = {};
    const warnings: string[] = [];

    // Market Check (if Serper is configured and we have a query)
    let marketCheck: MarketVerificationResult | undefined;
    if (isSerperConfigured() && body.targetQuery) {
      try {
        marketCheck = await verifyRanking(body.targetDomain, body.targetQuery, {
          location: body.location,
        });
        forensicData.marketCheck = marketCheck.rawResult;
      } catch (err) {
        warnings.push(`Market check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else if (!isSerperConfigured()) {
      warnings.push('SERPER_API_KEY not configured - live SERP check unavailable');
    }

    // Algo Overlay (check for recent algorithm updates)
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentUpdates = getUpdatesInRange(thirtyDaysAgo, new Date());

      if (recentUpdates.length > 0) {
        forensicData.algoOverlay = {
          data: [],
          updatesInRange: recentUpdates,
          correlations: [],
        };
      }
    } catch (err) {
      warnings.push(`Algo overlay failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // 9-Month Rule Check
    const nineMonthCheck = checkNineMonthRule(body.pageMetadata);

    // ==========================================================================
    // PHASE 2: BUILD AI CONTEXT
    // ==========================================================================

    // Build forensic data JSON for prompt
    const forensicDataJson = JSON.stringify({
      marketCheck: marketCheck ? {
        isRanking: marketCheck.rawResult.results.isRanking,
        position: marketCheck.rawResult.results.position,
        topCompetitors: marketCheck.rawResult.results.topCompetitors.slice(0, 5),
        serpFeatures: marketCheck.rawResult.results.serpFeatures,
        difficulty: marketCheck.marketAnalysis.difficulty,
      } : null,
      recentAlgoUpdates: forensicData.algoOverlay?.updatesInRange || [],
      nineMonthRule: nineMonthCheck,
    }, null, 2);

    // Build page metadata JSON
    const pageMetadataJson = body.pageMetadata
      ? JSON.stringify(body.pageMetadata, null, 2)
      : undefined;

    // Build constraint context
    const constraintContext = buildConstraintContext(
      body.pageMetadata,
      body.targetQuery
    );

    // Build complete prompt
    const systemPrompt = buildForensicsPrompt({
      persona: body.amPersona,
      forensicDataJson,
      pageMetadataJson,
      additionalContext: constraintContext,
    });

    // ==========================================================================
    // PHASE 3: CALL AI
    // ==========================================================================

    const userPrompt = `Analyze this support ticket and provide your assessment:

## Ticket Body
${body.ticketBody}

## Target Domain
${body.targetDomain}

${body.targetQuery ? `## Target Query\n${body.targetQuery}` : ''}
${body.location ? `## Location\n${body.location}` : ''}

Respond with valid JSON matching the output format specified.`;

    const result = await generateText({
      model: MODEL,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // ==========================================================================
    // PHASE 4: PARSE AND VALIDATE RESPONSE
    // ==========================================================================

    let aiResponse: ForensicsAIResponse;

    try {
      // Try to parse JSON from response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      aiResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // If parsing fails, construct a fallback response
      aiResponse = {
        verdict: 'NEEDS_INVESTIGATION',
        rootCause: 'Unable to parse AI response. Manual review required.',
        strategy: null,
        evidence: ['AI response parsing failed'],
        confidence: 0.3,
        draftEmail: 'I need to review this ticket manually and will get back to you shortly.',
      };
      warnings.push('AI response parsing failed - using fallback response');
    }

    // Validate response against Handbook rules
    const violations = validateForensicsResponse(aiResponse, body.pageMetadata);
    if (violations.length > 0) {
      warnings.push(...violations.map(v => `Validation: ${v}`));
    }

    // ==========================================================================
    // PHASE 5: BUILD FINAL RESPONSE
    // ==========================================================================

    const latencyMs = Date.now() - startTime;

    const response: AnalyzeTicketResponse = {
      verdict: aiResponse.verdict as VerdictType,
      rootCause: aiResponse.rootCause,
      strategy: aiResponse.strategy,
      evidence: aiResponse.evidence,
      confidence: aiResponse.confidence,
      nineMonthCheck: aiResponse.nineMonthCheck || nineMonthCheck,
      draftEmail: aiResponse.draftEmail,
      forensicData,
      warnings,
      modelUsed: 'gemini-2.0-flash',
      latencyMs,
    };

    // ==========================================================================
    // PHASE 6: LOG TO DATABASE (Optional)
    // ==========================================================================

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from('ticket_analyses').insert({
        ticket_body: body.ticketBody,
        target_domain: body.targetDomain,
        am_persona: body.amPersona,
        page_metadata: body.pageMetadata || null,
        verdict: response.verdict,
        root_cause: response.rootCause,
        strategy: response.strategy,
        evidence: response.evidence,
        confidence: response.confidence,
        draft_email: response.draftEmail,
        forensic_data: forensicData,
        warnings,
        model_used: 'gemini-2.0-flash',
        latency_ms: latencyMs,
      });
    } catch (dbError) {
      // Log but don't fail the request
      console.error('Failed to log ticket analysis:', dbError);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Analyze ticket error:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze ticket',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
