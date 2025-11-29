'use client'

import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { AlertTriangle, Plus, Check } from 'lucide-react'
import type { ServiceTier } from '@/types/database'

interface EntitlementsBadgeProps {
  tier: ServiceTier | null
  customExclusions?: string[]
  customInclusions?: string[]
  showDetails?: boolean
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Starter: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-500/20',
  },
  Growth: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  Enterprise: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
  },
}

function formatServiceName(service: string): string {
  return service
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function EntitlementsBadge({
  tier,
  customExclusions = [],
  customInclusions = [],
  showDetails = true,
}: EntitlementsBadgeProps) {
  if (!tier) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No Tier
      </Badge>
    )
  }

  const colors = TIER_COLORS[tier.tier_name] || TIER_COLORS.Starter
  const hasExclusions = customExclusions.length > 0
  const hasInclusions = customInclusions.length > 0

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        colors.bg,
        colors.text,
        colors.border,
        'gap-1 cursor-default',
        showDetails && (hasExclusions || hasInclusions) && 'cursor-pointer'
      )}
    >
      {tier.tier_name}
      {hasExclusions && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
      {hasInclusions && <Plus className="h-3 w-3 text-green-500" />}
    </Badge>
  )

  if (!showDetails || (!hasExclusions && !hasInclusions && !tier.included_services?.length)) {
    return badge
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm">{tier.tier_name} Tier</h4>
            {tier.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {tier.description}
              </p>
            )}
            {tier.monthly_hours && (
              <p className="text-xs text-muted-foreground">
                {tier.monthly_hours} hours/month
              </p>
            )}
          </div>

          {tier.included_services && tier.included_services.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">
                Included Services
              </h5>
              <ul className="text-xs space-y-0.5">
                {tier.included_services.map((service) => (
                  <li key={service} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    <span
                      className={cn(
                        customExclusions.includes(service) && 'line-through text-muted-foreground'
                      )}
                    >
                      {formatServiceName(service)}
                    </span>
                    {customExclusions.includes(service) && (
                      <span className="text-yellow-500 text-[10px]">(excluded)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasInclusions && (
            <div>
              <h5 className="text-xs font-medium text-green-600 mb-1">
                Custom Additions
              </h5>
              <ul className="text-xs space-y-0.5">
                {customInclusions.map((service) => (
                  <li key={service} className="flex items-center gap-1.5">
                    <Plus className="h-3 w-3 text-green-500" />
                    {formatServiceName(service)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasExclusions && (
            <div>
              <h5 className="text-xs font-medium text-yellow-600 mb-1">
                Excluded from Tier
              </h5>
              <ul className="text-xs space-y-0.5">
                {customExclusions.map((service) => (
                  <li key={service} className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    {formatServiceName(service)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
