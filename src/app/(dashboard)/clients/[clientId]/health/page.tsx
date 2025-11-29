'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getHealthScoreColor } from '@/lib/utils/alerts'
import { useClientHealthHistory } from '@/lib/hooks/useClients'
import { HealthHistoryChart } from '@/components/clients/HealthHistoryChart'
import { Activity, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'

type DateRange = 7 | 14 | 30 | 90

export default function ClientHealthPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const [dateRange, setDateRange] = useState<DateRange>(30)

  const { data: healthHistory, isLoading } = useClientHealthHistory(clientId, dateRange)

  // Calculate anomalies (sudden drops or spikes > 10 points)
  const anomalies = useMemo(() => {
    if (!healthHistory || healthHistory.length < 2) return []

    const anomalyList: { date: string; change: number; direction: 'drop' | 'spike' }[] = []

    for (let i = 1; i < healthHistory.length; i++) {
      const current = healthHistory[i].health_score ?? 0
      const previous = healthHistory[i - 1].health_score ?? 0
      const change = current - previous

      if (Math.abs(change) >= 10) {
        anomalyList.push({
          date: healthHistory[i].recorded_date,
          change,
          direction: change < 0 ? 'drop' : 'spike',
        })
      }
    }

    return anomalyList
  }, [healthHistory])

  // Calculate trend stats
  const trendStats = useMemo(() => {
    if (!healthHistory || healthHistory.length < 2) return null

    const scores = healthHistory.map((h) => h.health_score ?? 0)
    const first = scores[0]
    const last = scores[scores.length - 1]
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const overallChange = last - first

    return { avg, min, max, overallChange, first, last }
  }, [healthHistory])

  return (
    <div className="space-y-6">
      {/* Date range selector and stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health History
          </h2>
          <p className="text-sm text-muted-foreground">
            Track health score trends over time
          </p>
        </div>

        {/* Date range buttons */}
        <div className="flex gap-1">
          {([7, 14, 30, 90] as DateRange[]).map((days) => (
            <Button
              key={days}
              variant={dateRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {trendStats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Current</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  getHealthScoreColor(trendStats.last).text
                )}
              >
                {trendStats.last}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Average</p>
              <p className="text-2xl font-bold">{trendStats.avg}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Min</p>
              <p className="text-2xl font-bold text-red-500">{trendStats.min}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Max</p>
              <p className="text-2xl font-bold text-green-500">{trendStats.max}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Change</p>
              <p
                className={cn(
                  'text-2xl font-bold flex items-center gap-1',
                  trendStats.overallChange > 0 && 'text-green-500',
                  trendStats.overallChange < 0 && 'text-red-500'
                )}
              >
                {trendStats.overallChange > 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : trendStats.overallChange < 0 ? (
                  <TrendingDown className="h-5 w-5" />
                ) : null}
                {trendStats.overallChange > 0 ? '+' : ''}
                {trendStats.overallChange}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <HealthHistoryChart
        data={healthHistory || []}
        isLoading={isLoading}
        showComponentScores
      />

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Anomalies Detected
              <Badge variant="outline" className="ml-auto">
                {anomalies.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalies.map((anomaly, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-md',
                    anomaly.direction === 'drop'
                      ? 'bg-red-500/10'
                      : 'bg-green-500/10'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {anomaly.direction === 'drop' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">
                      {new Date(anomaly.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      anomaly.direction === 'drop'
                        ? 'text-red-500 border-red-500/20'
                        : 'text-green-500 border-green-500/20'
                    )}
                  >
                    {anomaly.change > 0 ? '+' : ''}
                    {anomaly.change} points
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed score table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : healthHistory && healthHistory.length > 0 ? (
            <div className="rounded-md border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Health</TableHead>
                    <TableHead className="text-center">Traffic</TableHead>
                    <TableHead className="text-center">Operations</TableHead>
                    <TableHead className="text-center">Sentiment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...healthHistory].reverse().map((entry) => {
                    const colors = getHealthScoreColor(entry.health_score ?? 0)
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.recorded_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(colors.bg, 'text-white border-0')}
                          >
                            {entry.health_score ?? '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.traffic_trend_score !== null
                            ? Math.round(entry.traffic_trend_score)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.ops_velocity_score !== null
                            ? Math.round(entry.ops_velocity_score)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.sentiment_score !== null
                            ? Math.round(entry.sentiment_score)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No health history data available for this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
