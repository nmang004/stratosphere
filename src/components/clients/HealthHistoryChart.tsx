'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ClientHealthHistory } from '@/types/database'

interface HealthHistoryChartProps {
  data: ClientHealthHistory[]
  isLoading?: boolean
  showComponentScores?: boolean
  className?: string
}

type DateRange = '7d' | '14d' | '30d' | '90d'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': '7 Days',
  '14d': '14 Days',
  '30d': '30 Days',
  '90d': '90 Days',
}

interface ChartDataPoint {
  date: string
  displayDate: string
  health_score: number | null
  traffic_trend_score: number | null
  ops_velocity_score: number | null
  sentiment_score: number | null
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTrend(data: ClientHealthHistory[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable'

  const recent = data.slice(-7)
  if (recent.length < 2) return 'stable'

  const first = recent[0]?.health_score ?? 0
  const last = recent[recent.length - 1]?.health_score ?? 0
  const diff = last - first

  if (diff > 2) return 'up'
  if (diff < -2) return 'down'
  return 'stable'
}

export function HealthHistoryChart({
  data,
  isLoading = false,
  showComponentScores: initialShowComponents = false,
  className,
}: HealthHistoryChartProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [showComponents, setShowComponents] = useState(initialShowComponents)

  const chartData = useMemo((): ChartDataPoint[] => {
    const days = parseInt(dateRange)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return data
      .filter((d) => new Date(d.recorded_date) >= cutoffDate)
      .map((d) => ({
        date: d.recorded_date,
        displayDate: formatDate(d.recorded_date),
        health_score: d.health_score,
        traffic_trend_score: d.traffic_trend_score,
        ops_velocity_score: d.ops_velocity_score,
        sentiment_score: d.sentiment_score,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data, dateRange])

  const trend = useMemo(() => getTrend(data), [data])
  const currentScore = data[data.length - 1]?.health_score ?? 0

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  if (isLoading) {
    return <HealthHistoryChartSkeleton className={className} />
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No health history data available.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health History
            <span
              className={cn(
                'flex items-center gap-1 text-xs font-normal',
                trend === 'up' && 'text-green-500',
                trend === 'down' && 'text-red-500',
                trend === 'stable' && 'text-muted-foreground'
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
            </span>
          </CardTitle>
          <div className="text-2xl font-bold">{currentScore}</div>
        </div>
        <div className="flex items-center justify-between mt-2">
          {/* Date range buttons */}
          <div className="flex gap-1">
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDateRange(range)}
              >
                {DATE_RANGE_LABELS[range]}
              </Button>
            ))}
          </div>
          {/* Toggle component scores */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowComponents(!showComponents)}
          >
            {showComponents ? 'Hide' : 'Show'} Components
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              {showComponents && <Legend wrapperStyle={{ fontSize: '11px' }} />}

              {/* Reference lines for thresholds */}
              <ReferenceLine
                y={40}
                stroke="hsl(var(--destructive))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={70}
                stroke="hsl(142.1 76.2% 36.3%)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />

              {/* Main health score line */}
              <Line
                type="monotone"
                dataKey="health_score"
                name="Health Score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              {/* Component score lines (shown when toggled) */}
              {showComponents && (
                <>
                  <Line
                    type="monotone"
                    dataKey="traffic_trend_score"
                    name="Traffic"
                    stroke="hsl(221.2 83.2% 53.3%)"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ops_velocity_score"
                    name="Operations"
                    stroke="hsl(262.1 83.3% 57.8%)"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sentiment_score"
                    name="Sentiment"
                    stroke="hsl(24.6 95% 53.1%)"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend for thresholds */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-red-500/50" style={{ borderStyle: 'dashed' }} />
            <span>Critical threshold (40)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-green-500/50" style={{ borderStyle: 'dashed' }} />
            <span>Healthy threshold (70)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HealthHistoryChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="h-7 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] mt-4" />
      </CardContent>
    </Card>
  )
}
