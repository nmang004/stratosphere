'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getHealthScoreColor, getTrendIndicator } from '@/lib/utils/alerts'
import { ChurnRiskIndicator } from './ChurnRiskIndicator'
import type { ClientWithHealth, ViewMode } from '@/lib/hooks/useClients'
import {
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  Building2,
  Users,
} from 'lucide-react'

interface ClientListProps {
  clients: ClientWithHealth[]
  viewMode: ViewMode
  isLoading?: boolean
}

function ClientGridCard({ client }: { client: ClientWithHealth }) {
  const healthScore = client.latest_health?.health_score ?? client.risk_score ?? 0
  const previousScore = client.risk_score ?? healthScore
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
      <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Client info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{client.name}</h3>
                {showChurnWarning && (
                  <Badge
                    variant="outline"
                    className="bg-red-500/10 text-red-500 border-red-500/20 gap-1 shrink-0"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Risk
                  </Badge>
                )}
              </div>
              {client.domain && (
                <p className="text-xs text-muted-foreground truncate">
                  {client.domain}
                </p>
              )}
              {client.industry && (
                <Badge variant="secondary" className="text-xs">
                  {client.industry}
                </Badge>
              )}
            </div>

            {/* Health score */}
            <div className="flex flex-col items-end gap-1">
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full font-bold text-white',
                  healthColors.bg
                )}
              >
                {healthScore}
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  trend.direction === 'up' && 'text-green-500',
                  trend.direction === 'down' && 'text-red-500',
                  trend.direction === 'stable' && 'text-muted-foreground'
                )}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{trend.label}</span>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            {(client.active_alert_count ?? 0) > 0 ? (
              <p className="text-xs text-muted-foreground">
                {client.active_alert_count} active alert
                {client.active_alert_count !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No active alerts</p>
            )}
            {client.churn_prediction && (
              <ChurnRiskIndicator
                churnPrediction={client.churn_prediction}
                compact
                showDetails={false}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ClientListRow({ client }: { client: ClientWithHealth }) {
  const healthScore = client.latest_health?.health_score ?? client.risk_score ?? 0
  const previousScore = client.risk_score ?? healthScore
  const churnProbability = client.churn_prediction?.churn_probability ?? 0

  const healthColors = getHealthScoreColor(healthScore)
  const trend = getTrendIndicator(healthScore, previousScore)

  const TrendIcon =
    trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
        ? TrendingDown
        : Minus

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell>
        <Link href={`/clients/${client.id}`} className="block">
          <div className="font-medium">{client.name}</div>
          {client.domain && (
            <div className="text-xs text-muted-foreground">{client.domain}</div>
          )}
        </Link>
      </TableCell>
      <TableCell>
        {client.industry ? (
          <Badge variant="secondary" className="text-xs">
            {client.industry}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <Link href={`/clients/${client.id}`} className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
              healthColors.bg
            )}
          >
            {healthScore}
          </div>
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs',
              trend.direction === 'up' && 'text-green-500',
              trend.direction === 'down' && 'text-red-500',
              trend.direction === 'stable' && 'text-muted-foreground'
            )}
          >
            <TrendIcon className="h-3 w-3" />
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <ChurnRiskIndicator
          churnPrediction={client.churn_prediction ?? null}
          compact
          showDetails={false}
        />
      </TableCell>
      <TableCell className="text-center">
        {(client.active_alert_count ?? 0) > 0 ? (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            {client.active_alert_count}
          </Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
    </TableRow>
  )
}

export function ClientList({ clients, viewMode, isLoading }: ClientListProps) {
  if (isLoading) {
    return viewMode === 'grid' ? (
      <ClientGridSkeleton />
    ) : (
      <ClientListSkeleton />
    )
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-1">No clients found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or search query.
        </p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <ClientGridCard key={client.id} client={client} />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Churn Risk</TableHead>
            <TableHead className="text-center">Alerts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <ClientListRow key={client.id} client={client} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ClientGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ClientListSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Churn Risk</TableHead>
            <TableHead className="text-center">Alerts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="h-5 w-6 mx-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
