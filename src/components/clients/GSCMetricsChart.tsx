'use client';

/**
 * GSCMetricsChart
 *
 * Line/area chart for GSC metrics over time using Recharts.
 * Features:
 * - Dual Y-axis (clicks on left, impressions on right)
 * - Toggleable metrics
 * - Hover tooltips with exact values
 * - Date markers for calendar events (anomaly context)
 */

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarEvent } from '@/types/database';
import { GSCTimeSeriesData } from '@/lib/gsc/types';
import { cn } from '@/lib/utils';

interface GSCMetricsChartProps {
  data: GSCTimeSeriesData[] | undefined;
  isLoading?: boolean;
  calendarEvents?: CalendarEvent[];
  title?: string;
  chartType?: 'line' | 'area';
}

type MetricKey = 'clicks' | 'impressions' | 'ctr' | 'position';

const METRIC_CONFIG: Record<MetricKey, {
  label: string;
  color: string;
  yAxisId: 'left' | 'right';
  formatter: (value: number) => string;
}> = {
  clicks: {
    label: 'Clicks',
    color: '#3b82f6', // blue-500
    yAxisId: 'left',
    formatter: (v) => v.toLocaleString(),
  },
  impressions: {
    label: 'Impressions',
    color: '#8b5cf6', // violet-500
    yAxisId: 'right',
    formatter: (v) => v.toLocaleString(),
  },
  ctr: {
    label: 'CTR',
    color: '#10b981', // emerald-500
    yAxisId: 'left',
    formatter: (v) => `${(v * 100).toFixed(2)}%`,
  },
  position: {
    label: 'Position',
    color: '#f59e0b', // amber-500
    yAxisId: 'right',
    formatter: (v) => v.toFixed(1),
  },
};

export function GSCMetricsChart({
  data,
  isLoading,
  calendarEvents = [],
  title = 'Performance Over Time',
  chartType = 'area',
}: GSCMetricsChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(['clicks', 'impressions']);

  // Format data for chart
  const chartData = useMemo(() => {
    if (!data) return [];

    return data.map((item) => ({
      ...item,
      dateFormatted: new Date(item.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [data]);

  // Get events that fall within the date range
  const relevantEvents = useMemo(() => {
    if (!data || data.length === 0) return [];

    const startDate = new Date(data[0].date);
    const endDate = new Date(data[data.length - 1].date);

    return calendarEvents.filter((event) => {
      const eventDate = new Date(event.event_date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }, [data, calendarEvents]);

  const toggleMetric = (metric: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for the selected date range
          </div>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;
  const DataComponent = chartType === 'area' ? Area : Line;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    // Check for calendar events on this date
    const dateEvents = relevantEvents.filter(
      (e) => new Date(e.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) === label
    );

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any) => {
          const config = METRIC_CONFIG[entry.dataKey as MetricKey];
          return (
            <p key={entry.dataKey} className="flex justify-between gap-4" style={{ color: entry.color }}>
              <span>{config.label}:</span>
              <span className="font-medium">{config.formatter(entry.value)}</span>
            </p>
          );
        })}
        {dateEvents.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            {dateEvents.map((event) => (
              <p key={event.id} className="text-xs text-muted-foreground">
                {event.event_type === 'ALGORITHM_UPDATE' && '🔄 '}
                {event.event_type === 'HOLIDAY' && '🎉 '}
                {event.event_name}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <div className="flex gap-1">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((metric) => (
            <Toggle
              key={metric}
              pressed={activeMetrics.includes(metric)}
              onPressedChange={() => toggleMetric(metric)}
              size="sm"
              className="text-xs"
              style={{
                backgroundColor: activeMetrics.includes(metric) ? `${METRIC_CONFIG[metric].color}20` : undefined,
                borderColor: activeMetrics.includes(metric) ? METRIC_CONFIG[metric].color : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: METRIC_CONFIG[metric].color }}
              />
              {METRIC_CONFIG[metric].label}
            </Toggle>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />

              {/* Left Y-axis for clicks/CTR */}
              {(activeMetrics.includes('clicks') || activeMetrics.includes('ctr')) && (
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
              )}

              {/* Right Y-axis for impressions/position */}
              {(activeMetrics.includes('impressions') || activeMetrics.includes('position')) && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Render active metrics */}
              {activeMetrics.map((metric) => {
                const config = METRIC_CONFIG[metric];
                const commonProps = {
                  key: metric,
                  dataKey: metric,
                  name: config.label,
                  stroke: config.color,
                  yAxisId: config.yAxisId,
                  strokeWidth: 2,
                  dot: false,
                  activeDot: { r: 4 },
                };

                if (chartType === 'area') {
                  return (
                    <Area
                      {...commonProps}
                      type="monotone"
                      fill={config.color}
                      fillOpacity={0.1}
                    />
                  );
                }

                return <Line {...commonProps} type="monotone" />;
              })}

              {/* Reference lines for calendar events */}
              {relevantEvents.map((event) => (
                <ReferenceLine
                  key={event.id}
                  x={new Date(event.event_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                  stroke={event.event_type === 'ALGORITHM_UPDATE' ? '#ef4444' : '#6b7280'}
                  strokeDasharray="3 3"
                  label={{
                    value: event.event_type === 'ALGORITHM_UPDATE' ? '🔄' : '🎉',
                    position: 'top',
                    fontSize: 12,
                  }}
                />
              ))}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Mini sparkline chart for compact displays
 */
export function GSCSparkline({
  data,
  metric = 'clicks',
  className,
}: {
  data: GSCTimeSeriesData[] | undefined;
  metric?: 'clicks' | 'impressions';
  className?: string;
}) {
  if (!data || data.length === 0) {
    return <div className={cn('h-8 w-24 bg-muted rounded', className)} />;
  }

  const values = data.map((d) => d[metric]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Create SVG path
  const width = 96;
  const height = 32;
  const padding = 2;

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Determine trend color
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const isUp = secondAvg > firstAvg;

  return (
    <svg
      className={cn('h-8 w-24', className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <path
        d={pathD}
        fill="none"
        stroke={isUp ? '#10b981' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
