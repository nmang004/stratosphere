'use client'

/**
 * AIConstraintWarnings Component
 *
 * Displays all constraint-related warnings from AI interactions.
 * Color-coded by severity with collapsible details.
 */

import { useState } from 'react'
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  Scale,
  Database,
  FlaskConical,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type WarningSeverity = 'info' | 'warning' | 'critical'

export interface Warning {
  type: string
  message: string
  severity: WarningSeverity
}

interface AIConstraintWarningsProps {
  warnings: Warning[]
  collapsible?: boolean
  defaultExpanded?: boolean
}

// Warning type icons and labels
const WARNING_CONFIG: Record<string, { icon: typeof AlertTriangle; label: string }> = {
  DATA_THRESHOLD: {
    icon: Database,
    label: 'Insufficient Data',
  },
  CACHE_STALE: {
    icon: Clock,
    label: 'Stale Data',
  },
  CHURN_RISK: {
    icon: TrendingDown,
    label: 'Churn Risk',
  },
  SCOPE_VIOLATION: {
    icon: Scale,
    label: 'Scope Violation',
  },
  NO_BASELINE: {
    icon: FlaskConical,
    label: 'No Baseline',
  },
  LOW_CONFIDENCE: {
    icon: ShieldAlert,
    label: 'Low Confidence',
  },
  NO_MANUAL_MATH: {
    icon: AlertCircle,
    label: 'Math Violation',
  },
  STATISTICAL_RIGOR: {
    icon: AlertCircle,
    label: 'Statistical Rigor',
  },
}

// Severity styles
const SEVERITY_STYLES: Record<WarningSeverity, {
  border: string
  bg: string
  icon: string
  text: string
}> = {
  info: {
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    icon: 'text-blue-600',
    text: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: 'text-amber-600',
    text: 'text-amber-700 dark:text-amber-300',
  },
  critical: {
    border: 'border-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    icon: 'text-red-600',
    text: 'text-red-700 dark:text-red-300',
  },
}

function getWarningIcon(type: string) {
  return WARNING_CONFIG[type]?.icon || AlertTriangle
}

function getSeverityIcon(severity: WarningSeverity) {
  if (severity === 'critical') return AlertCircle
  if (severity === 'warning') return AlertTriangle
  return Info
}

export function AIConstraintWarnings({
  warnings,
  collapsible = true,
  defaultExpanded = true,
}: AIConstraintWarningsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (warnings.length === 0) return null

  // Sort by severity (critical first)
  const sortedWarnings = [...warnings].sort((a, b) => {
    const order: Record<WarningSeverity, number> = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })

  // Get highest severity for the header
  const highestSeverity = sortedWarnings[0]?.severity || 'info'
  const headerStyles = SEVERITY_STYLES[highestSeverity]

  // Count by severity
  const criticalCount = warnings.filter(w => w.severity === 'critical').length
  const warningCount = warnings.filter(w => w.severity === 'warning').length

  return (
    <div className={cn(
      'rounded-lg border',
      headerStyles.border,
      headerStyles.bg
    )}>
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3',
          collapsible && 'cursor-pointer hover:opacity-80'
        )}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {(() => {
            const SeverityIcon = getSeverityIcon(highestSeverity)
            return <SeverityIcon className={cn('h-5 w-5', headerStyles.icon)} />
          })()}
          <span className={cn('font-medium', headerStyles.text)}>
            {warnings.length} AI Warning{warnings.length !== 1 ? 's' : ''}
          </span>
          {(criticalCount > 0 || warningCount > 0) && (
            <div className="flex gap-1.5">
              {criticalCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                  {criticalCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  {warningCount} warning
                </span>
              )}
            </div>
          )}
        </div>
        {collapsible && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Warning list */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {sortedWarnings.map((warning, index) => {
            const styles = SEVERITY_STYLES[warning.severity]
            const WarningIcon = getWarningIcon(warning.type)
            const label = WARNING_CONFIG[warning.type]?.label || warning.type

            return (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 p-2 rounded border',
                  styles.border,
                  styles.bg
                )}
              >
                <WarningIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', styles.icon)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-medium', styles.text)}>
                    {label}
                  </p>
                  <p className={cn('text-sm mt-0.5', styles.text)}>
                    {warning.message}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Helper to convert string warnings to Warning objects
 */
export function parseWarnings(warnings: string[]): Warning[] {
  return warnings.map((message) => {
    // Detect severity and type from message content
    let severity: WarningSeverity = 'info'
    let type = 'GENERAL'

    if (message.includes('RETENTION ALERT') || message.includes('churn risk')) {
      severity = 'critical'
      type = 'CHURN_RISK'
    } else if (message.includes('SCOPE WARNING') || message.includes('outside')) {
      severity = 'warning'
      type = 'SCOPE_VIOLATION'
    } else if (message.includes('Insufficient data')) {
      severity = 'warning'
      type = 'DATA_THRESHOLD'
    } else if (message.includes('hours old') || message.includes('stale')) {
      severity = 'info'
      type = 'CACHE_STALE'
    } else if (message.includes('baseline')) {
      severity = 'warning'
      type = 'NO_BASELINE'
    } else if (message.includes('confidence')) {
      severity = 'info'
      type = 'LOW_CONFIDENCE'
    }

    return { type, message, severity }
  })
}
