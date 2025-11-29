'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getHealthScoreColor } from '@/lib/utils/alerts'
import {
  useClientDetail,
  useClientHealthHistory,
  useClientTouchpoints,
  useClientAlerts,
} from '@/lib/hooks/useClients'
import { HealthHistoryChart } from '@/components/clients/HealthHistoryChart'
import { TouchpointTimeline } from '@/components/clients/TouchpointTimeline'
import { ContractCard } from '@/components/clients/ContractCard'
import { ChurnRiskIndicator } from '@/components/clients/ChurnRiskIndicator'
import { AlertCard } from '@/components/dashboard/AlertCard'
import {
  Activity,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  Calendar,
  FlaskConical,
  Ticket,
} from 'lucide-react'

export default function ClientOverviewPage() {
  const params = useParams()
  const clientId = params.clientId as string

  const { data: client, isLoading: clientLoading } = useClientDetail(clientId)
  const { data: healthHistory, isLoading: healthLoading } = useClientHealthHistory(clientId, 30)
  const { data: touchpoints, isLoading: touchpointsLoading } = useClientTouchpoints(clientId)
  const { data: alerts, isLoading: alertsLoading } = useClientAlerts(clientId, 3)

  const healthScore = client?.latest_health?.health_score ?? 0
  const healthColors = getHealthScoreColor(healthScore)

  // Calculate quick stats
  const daysSinceLastContact = touchpoints?.length
    ? Math.floor(
        (new Date().getTime() - new Date(touchpoints[0].occurred_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="space-y-6">
      {/* Health Summary Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Health Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex items-center justify-center w-16 h-16 rounded-full font-bold text-xl text-white',
                      healthColors.bg
                    )}
                  >
                    {healthScore}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{healthColors.label}</p>
                    {client?.latest_health && (
                      <p className="text-xs text-muted-foreground">
                        Last updated:{' '}
                        {new Date(client.latest_health.recorded_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Component breakdown */}
                {client?.latest_health && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {Math.round(client.latest_health.traffic_trend_score ?? 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Traffic</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {Math.round(client.latest_health.ops_velocity_score ?? 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Ops</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {Math.round(client.latest_health.sentiment_score ?? 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Sentiment</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Churn Risk Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Churn Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : client?.churn_prediction ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <ChurnRiskIndicator
                    churnPrediction={client.churn_prediction}
                    showDetails={false}
                  />
                  <span className="text-2xl font-bold">
                    {Math.round((client.churn_prediction.churn_probability ?? 0) * 100)}%
                  </span>
                </div>
                {client.churn_prediction.recommended_intervention && (
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-xs font-medium mb-1">Recommended Action</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {client.churn_prediction.recommended_intervention}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No churn data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientLoading || touchpointsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1 border-b">
                  <span className="text-sm text-muted-foreground">Days Since Contact</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      daysSinceLastContact !== null && daysSinceLastContact > 14 &&
                        'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    )}
                  >
                    {daysSinceLastContact !== null ? `${daysSinceLastContact} days` : 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1 border-b">
                  <span className="text-sm text-muted-foreground">Active Alerts</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      (client?.active_alert_count ?? 0) > 0 &&
                        'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    )}
                  >
                    {client?.active_alert_count ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">Active Experiments</span>
                  <Badge variant="outline">0</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second row: Contract + Recent Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contract Card */}
        <ContractCard contract={client?.contract ?? null} />

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recent Alerts
            </CardTitle>
            <CardDescription>Last 3 alerts for this client</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    compact
                    showActions={false}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active alerts for this client.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third row: Mini Health Chart + Recent Touchpoints */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Mini Health History */}
        <HealthHistoryChart
          data={healthHistory || []}
          isLoading={healthLoading}
        />

        {/* Recent Touchpoints */}
        <TouchpointTimeline
          touchpoints={touchpoints || []}
          isLoading={touchpointsLoading}
          maxItems={5}
        />
      </div>
    </div>
  )
}
