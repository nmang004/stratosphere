'use client'

import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { AlertTriangle, TrendingDown, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ChurnPrediction } from '@/types/database'

interface ChurnRiskIndicatorProps {
  churnPrediction: ChurnPrediction | null
  showDetails?: boolean
  compact?: boolean
  clientId?: string
}

type RiskLevel = 'low' | 'medium' | 'high'

function getRiskLevel(probability: number): RiskLevel {
  if (probability > 0.65) return 'high'
  if (probability >= 0.3) return 'medium'
  return 'low'
}

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
  },
  medium: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500/20',
  },
  high: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
  },
}

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
}

const RISK_ICONS: Record<RiskLevel, typeof Shield> = {
  low: Shield,
  medium: AlertTriangle,
  high: TrendingDown,
}

function formatFactorName(factor: string): string {
  return factor
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function ChurnRiskIndicator({
  churnPrediction,
  showDetails = true,
  compact = false,
  clientId,
}: ChurnRiskIndicatorProps) {
  if (!churnPrediction) {
    return compact ? null : (
      <Badge variant="outline" className="text-muted-foreground">
        No Risk Data
      </Badge>
    )
  }

  const probability = churnPrediction.churn_probability ?? 0
  const riskLevel = getRiskLevel(probability)
  const colors = RISK_COLORS[riskLevel]
  const Icon = RISK_ICONS[riskLevel]
  const percentage = Math.round(probability * 100)

  // Parse contributing factors
  const factors = churnPrediction.contributing_factors as Record<string, unknown> | null

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        colors.bg,
        colors.text,
        colors.border,
        'gap-1',
        showDetails && 'cursor-pointer'
      )}
    >
      <Icon className="h-3 w-3" />
      {compact ? `${percentage}%` : `${RISK_LABELS[riskLevel]} (${percentage}%)`}
    </Badge>
  )

  if (!showDetails) {
    return badge
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Icon className={cn('h-4 w-4', colors.text)} />
                Churn Risk Assessment
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {churnPrediction.model_version === 'rule_based'
                  ? 'Rule-Based Assessment'
                  : `Model: ${churnPrediction.model_version || 'v2.1'}`}
              </p>
            </div>
            <div className={cn('text-2xl font-bold', colors.text)}>
              {percentage}%
            </div>
          </div>

          {/* Risk meter */}
          <div className="space-y-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  riskLevel === 'low' && 'bg-green-500',
                  riskLevel === 'medium' && 'bg-yellow-500',
                  riskLevel === 'high' && 'bg-red-500'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          {/* Contributing factors */}
          {factors && Object.keys(factors).length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">
                Contributing Factors
              </h5>
              <ul className="text-xs space-y-1.5">
                {Object.entries(factors).map(([key, value]) => {
                  if (key === 'notes') return null
                  const displayValue =
                    typeof value === 'boolean'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : typeof value === 'number'
                        ? value > 1
                          ? value.toString()
                          : `${Math.round(value * 100)}%`
                        : String(value)

                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between py-1 border-b border-dashed last:border-0"
                    >
                      <span className="text-muted-foreground">
                        {formatFactorName(key)}
                      </span>
                      <span className={cn(
                        typeof value === 'boolean' && value && 'text-red-500 font-medium',
                        typeof value === 'string' && value.includes('negative') && 'text-red-500',
                        typeof value === 'string' && value.includes('positive') && 'text-green-500'
                      )}>
                        {displayValue}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Recommended intervention */}
          {churnPrediction.recommended_intervention && (
            <div className="pt-2 border-t">
              <h5 className="text-xs font-medium text-muted-foreground mb-1">
                Recommended Action
              </h5>
              <p className="text-xs">{churnPrediction.recommended_intervention}</p>
            </div>
          )}

          {/* Link to client page */}
          {clientId && (
            <Link
              href={`/clients/${clientId}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-2"
            >
              View Client Details
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
