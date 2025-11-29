'use client';

/**
 * GSC Dashboard Page
 *
 * Main Google Search Console data visualization page.
 * Features:
 * - Data freshness banner
 * - Overview metrics cards
 * - Performance chart
 * - Top queries table
 * - Top pages table
 * - Date range selector
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  Eye,
  BarChart3,
  Target,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useGSCData, useCacheFreshness } from '@/lib/hooks/useGSC';
import { DataFreshnessIndicator } from '@/components/clients/DataFreshnessIndicator';
import { GSCMetricsChart } from '@/components/clients/GSCMetricsChart';
import { GSCQueryTable } from '@/components/clients/GSCQueryTable';
import { GSCPageTable } from '@/components/clients/GSCPageTable';
import { GSCConnectButton } from '@/components/clients/GSCConnectButton';
import { DateRangePreset } from '@/lib/gsc/types';
import { cn } from '@/lib/utils';

export default function GSCDashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = params.clientId as string;

  // Check for success/error messages from OAuth redirect
  const gscConnected = searchParams.get('gsc_connected');
  const gscError = searchParams.get('gsc_error');

  const [dateRange, setDateRange] = useState<DateRangePreset>('28d');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch GSC data
  const {
    overview,
    timeseries,
    queries,
    pages,
    status,
    cacheInfo,
    isLoading,
    isError,
    error,
  } = useGSCData(clientId, dateRange);

  const freshness = useCacheFreshness(cacheInfo);

  // Format delta with color
  const formatDelta = (value: number, inverse = false) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';

    return (
      <span className={cn('inline-flex items-center gap-1 text-sm', colorClass)}>
        <Icon className="h-3 w-3" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages from OAuth */}
      {gscConnected && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Google Search Console connected successfully!
          </AlertDescription>
        </Alert>
      )}

      {gscError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{gscError}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Search Console</h1>
          <p className="text-muted-foreground">
            {status?.siteUrl || 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRangePreset)}
          >
            <SelectTrigger className="w-[130px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="28d">Last 28 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <GSCConnectButton clientId={clientId} size="sm" showStatus={false} />
        </div>
      </div>

      {/* Data Freshness Banner */}
      <DataFreshnessIndicator
        clientId={clientId}
        cacheInfo={cacheInfo}
        preset={dateRange}
      />

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clicks"
          value={overview?.data.totalClicks}
          delta={overview?.data.clicksDelta}
          icon={MousePointerClick}
          isLoading={isLoading}
        />
        <MetricCard
          title="Impressions"
          value={overview?.data.totalImpressions}
          delta={overview?.data.impressionsDelta}
          icon={Eye}
          isLoading={isLoading}
        />
        <MetricCard
          title="Avg. CTR"
          value={overview?.data.avgCtr}
          delta={overview?.data.ctrDelta}
          icon={BarChart3}
          formatter={(v) => `${(v * 100).toFixed(2)}%`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Avg. Position"
          value={overview?.data.avgPosition}
          delta={overview?.data.positionDelta}
          icon={Target}
          formatter={(v) => v.toFixed(1)}
          isLoading={isLoading}
          inverseDelta
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <GSCMetricsChart
            data={timeseries?.data}
            isLoading={isLoading}
            title="Performance Over Time"
            chartType="area"
          />
        </TabsContent>

        <TabsContent value="queries" className="mt-6">
          <GSCQueryTable
            data={queries?.data}
            isLoading={isLoading}
            title="Top Search Queries"
            pageSize={15}
          />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <GSCPageTable
            data={pages?.data}
            isLoading={isLoading}
            title="Top Pages"
            pageSize={15}
          />
        </TabsContent>
      </Tabs>

      {/* Error State */}
      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load GSC data: {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({
  title,
  value,
  delta,
  icon: Icon,
  formatter = (v: number) => v.toLocaleString(),
  isLoading,
  inverseDelta = false,
}: {
  title: string;
  value: number | undefined;
  delta: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  formatter?: (value: number) => string;
  isLoading?: boolean;
  inverseDelta?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-16" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = inverseDelta ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const deltaColorClass = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value !== undefined ? formatter(value) : '-'}
        </div>
        {delta !== undefined && (
          <p className={cn('text-xs flex items-center gap-1 mt-1', deltaColorClass)}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(delta).toFixed(1)}% vs previous period
          </p>
        )}
      </CardContent>
    </Card>
  );
}
