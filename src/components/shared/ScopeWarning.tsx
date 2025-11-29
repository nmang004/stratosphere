'use client'

/**
 * ScopeWarning Component
 *
 * Visual warning for scope violations ("The Lawyer" guardrail).
 * Displays when requested work is outside the client's contracted services.
 */

import { AlertTriangle, ArrowUpCircle, Pencil } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ScopeWarningProps {
  violations: string[]
  clientTier: string | null
  suggestions?: string[]
  onProceedAnyway?: () => void
  onEditDraft?: () => void
}

// Service display names
const SERVICE_LABELS: Record<string, string> = {
  technical_audit: 'Technical SEO Audit',
  content_strategy: 'Content Strategy',
  link_building: 'Link Building',
  local_seo: 'Local SEO',
  ecommerce_seo: 'E-commerce SEO',
  competitor_analysis: 'Competitor Analysis',
  keyword_research: 'Keyword Research',
  on_page_optimization: 'On-Page Optimization',
  reporting: 'Performance Reporting',
  consulting: 'Strategic Consulting',
}

// Tier upgrade paths
const TIER_UPGRADES: Record<string, string> = {
  Starter: 'Growth',
  Growth: 'Enterprise',
  Enterprise: 'Custom',
}

export function ScopeWarning({
  violations,
  clientTier,
  suggestions,
  onProceedAnyway,
  onEditDraft,
}: ScopeWarningProps) {
  if (violations.length === 0) return null

  const suggestedUpgrade = clientTier ? TIER_UPGRADES[clientTier] : null

  return (
    <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
        Scope Warning
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-amber-700 dark:text-amber-300">
          The following services are outside the client&apos;s contracted scope:
        </p>

        <ul className="space-y-1">
          {violations.map((violation) => (
            <li key={violation} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-amber-800 dark:text-amber-200">
                &quot;{SERVICE_LABELS[violation] || violation}&quot; is not included
              </span>
            </li>
          ))}
        </ul>

        {clientTier && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-amber-700 dark:text-amber-300">
              Current tier:
            </span>
            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
              {clientTier}
            </Badge>
          </div>
        )}

        {/* Suggestions */}
        <div className="pt-2 space-y-2 text-sm text-amber-700 dark:text-amber-300">
          <p className="font-medium">Suggested alternatives:</p>
          <ul className="space-y-1 pl-4">
            {suggestedUpgrade && (
              <li className="flex items-start gap-2">
                <ArrowUpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Consider discussing an upgrade to{' '}
                  <strong>{suggestedUpgrade}</strong> tier
                </span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <Pencil className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Rephrase to focus only on in-scope services</span>
            </li>
            {suggestions?.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        {(onProceedAnyway || onEditDraft) && (
          <div className="flex gap-2 pt-3">
            {onEditDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditDraft}
                className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit Draft
              </Button>
            )}
            {onProceedAnyway && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onProceedAnyway}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                Proceed Anyway
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
