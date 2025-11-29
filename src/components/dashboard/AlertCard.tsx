'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  getSeverityColor,
  getSeverityIcon,
  formatRelativeTime,
} from '@/lib/utils/alerts'
import type { AlertWithClient } from '@/lib/hooks/useAlerts'
import type { Alert } from '@/types/database'
import { ExternalLink } from 'lucide-react'

// AlertCard accepts AlertWithClient (which has clients joined)
// The callbacks use the same type for type safety
interface AlertCardProps {
  alert: AlertWithClient
  onDismiss?: (alert: AlertWithClient) => void
  onAction?: (alert: AlertWithClient) => void
  showActions?: boolean
  compact?: boolean
}

export function AlertCard({
  alert,
  onDismiss,
  onAction,
  showActions = true,
  compact = false,
}: AlertCardProps) {
  const severityColors = getSeverityColor(alert.severity)
  const SeverityIcon = getSeverityIcon(alert.severity)

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-md',
        compact ? 'p-3' : ''
      )}
    >
      {/* Severity indicator bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', severityColors.bg)} />

      <CardContent className={cn('pl-4', compact ? 'p-0' : 'pt-4')}>
        <div className="space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('gap-1 font-medium', severityColors.badge)}
              >
                <SeverityIcon className="h-3 w-3" />
                {alert.severity}
              </Badge>
              {alert.clients && (
                <Link
                  href={`/clients/${alert.clients.id}`}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                >
                  {alert.clients.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(alert.created_at)}
            </span>
          </div>

          {/* Signal */}
          <div>
            <p className="font-medium text-sm">{alert.signal}</p>
            {alert.context && !compact && (
              <p className="text-sm text-muted-foreground mt-1">{alert.context}</p>
            )}
          </div>

          {/* Recommended action */}
          {alert.recommended_action && !compact && (
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Recommended Action
              </p>
              <p className="text-sm">{alert.recommended_action}</p>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                onClick={() => onAction?.(alert)}
              >
                Take Action
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDismiss?.(alert)}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface AlertCardSkeletonProps {
  compact?: boolean
}

export function AlertCardSkeleton({ compact = false }: AlertCardSkeletonProps) {
  return (
    <Card className={cn('relative overflow-hidden', compact ? 'p-3' : '')}>
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted animate-pulse" />
      <CardContent className={cn('pl-4 space-y-3', compact ? 'p-0' : 'pt-4')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          {!compact && <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />}
        </div>
        {!compact && (
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
