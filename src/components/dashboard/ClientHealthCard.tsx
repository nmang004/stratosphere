'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getHealthScoreColor, getTrendIndicator } from '@/lib/utils/alerts'
import type { ClientWithHealth } from '@/lib/hooks/useClients'
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface ClientHealthCardProps {
  client: ClientWithHealth
}

export function ClientHealthCard({ client }: ClientHealthCardProps) {
  const healthScore = client.latest_health?.health_score ?? 0
  const previousScore = client.risk_score ?? healthScore // Use risk_score as a proxy for previous
  const churnProbability = client.churn_prediction?.churn_probability ?? 0
  const showChurnWarning = churnProbability > 0.65

  const healthColors = getHealthScoreColor(healthScore)
  const trend = getTrendIndicator(healthScore, previousScore)

  const TrendIcon =
    trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
        ? TrendingDown
        : Minus

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Client name and churn warning */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{client.name}</h3>
                {showChurnWarning && (
                  <Badge
                    variant="outline"
                    className="bg-red-500/10 text-red-500 border-red-500/20 gap-1 shrink-0"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Churn Risk
                  </Badge>
                )}
              </div>
              {client.industry && (
                <p className="text-xs text-muted-foreground truncate">
                  {client.industry}
                </p>
              )}
            </div>

            {/* Health score */}
            <div className="flex items-center gap-3">
              {/* Trend indicator */}
              <div
                className={cn(
                  'flex items-center gap-1 text-sm',
                  trend.direction === 'up' && 'text-green-500',
                  trend.direction === 'down' && 'text-red-500',
                  trend.direction === 'stable' && 'text-muted-foreground'
                )}
              >
                <TrendIcon className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">{trend.label}</span>
              </div>

              {/* Score display */}
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full font-bold text-white',
                  healthColors.bg
                )}
              >
                {healthScore}
              </div>
            </div>
          </div>

          {/* Alert count indicator */}
          {(client.active_alert_count ?? 0) > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {client.active_alert_count} active alert
                {client.active_alert_count !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export function ClientHealthCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
