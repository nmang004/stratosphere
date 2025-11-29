'use client';

/**
 * DataFreshnessIndicator
 *
 * Shows cache age and freshness status for GSC data.
 * Color coding per SRS:
 * - Green (< 12h): Data is fresh
 * - Yellow (12-20h): Data is stale, consider refreshing
 * - Red (> 20h): Data approaching expiration, refresh recommended
 */

import { useState } from 'react';
import { RefreshCw, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useRefreshGSC } from '@/lib/hooks/useGSC';
import { DateRangePreset } from '@/lib/gsc/types';

interface DataFreshnessIndicatorProps {
  clientId: string;
  cacheInfo?: {
    fromCache: boolean;
    cachedAt: string | null;
    expiresAt: string | null;
    ageHours: number;
    isStale: boolean;
    isExpiring: boolean;
  };
  preset?: DateRangePreset;
  showRefreshButton?: boolean;
  compact?: boolean;
}

export function DataFreshnessIndicator({
  clientId,
  cacheInfo,
  preset = '28d',
  showRefreshButton = true,
  compact = false,
}: DataFreshnessIndicatorProps) {
  const refreshMutation = useRefreshGSC(clientId);

  if (!cacheInfo) {
    return (
      <div className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        compact && 'text-xs'
      )}>
        <Clock className="h-4 w-4" />
        <span>No data available</span>
        {showRefreshButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate(preset)}
            disabled={refreshMutation.isPending}
            className="ml-2"
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', refreshMutation.isPending && 'animate-spin')} />
            Sync
          </Button>
        )}
      </div>
    );
  }

  const { ageHours, isStale, isExpiring, cachedAt } = cacheInfo;

  // Determine color and icon
  let colorClass: string;
  let bgClass: string;
  let Icon: typeof CheckCircle;

  if (isExpiring) {
    colorClass = 'text-red-600 dark:text-red-400';
    bgClass = 'bg-red-50 dark:bg-red-950/30';
    Icon = AlertTriangle;
  } else if (isStale) {
    colorClass = 'text-yellow-600 dark:text-yellow-400';
    bgClass = 'bg-yellow-50 dark:bg-yellow-950/30';
    Icon = Info;
  } else {
    colorClass = 'text-green-600 dark:text-green-400';
    bgClass = 'bg-green-50 dark:bg-green-950/30';
    Icon = CheckCircle;
  }

  // Format time
  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Age text
  const ageText = ageHours < 1
    ? 'Less than 1 hour ago'
    : ageHours < 24
    ? `${ageHours.toFixed(1)} hours ago`
    : `${Math.floor(ageHours / 24)} days ago`;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
              bgClass,
              colorClass
            )}>
              <Icon className="h-3 w-3" />
              <span>{ageText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Data as of {formatTime(cachedAt)}</p>
            {isExpiring && <p className="text-red-400">Refresh recommended</p>}
            {isStale && !isExpiring && <p className="text-yellow-400">Consider refreshing</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 p-3 rounded-lg',
      bgClass
    )}>
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', colorClass)} />
        <div>
          <p className={cn('text-sm font-medium', colorClass)}>
            {isExpiring
              ? 'Data approaching expiration'
              : isStale
              ? 'Data is stale'
              : 'Data is fresh'}
          </p>
          <p className="text-xs text-muted-foreground">
            Last synced: {formatTime(cachedAt)} ({ageText})
          </p>
        </div>
      </div>

      {showRefreshButton && (
        <Button
          variant={isExpiring ? 'destructive' : isStale ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => refreshMutation.mutate(preset)}
          disabled={refreshMutation.isPending}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshMutation.isPending && 'animate-spin')} />
          {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Now'}
        </Button>
      )}
    </div>
  );
}

/**
 * Compact data freshness badge
 */
export function FreshnessBadge({
  cacheInfo,
}: {
  cacheInfo?: DataFreshnessIndicatorProps['cacheInfo'];
}) {
  if (!cacheInfo) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        No data
      </span>
    );
  }

  const { ageHours, isStale, isExpiring } = cacheInfo;

  let colorClass: string;
  let bgClass: string;

  if (isExpiring) {
    colorClass = 'text-red-700 dark:text-red-300';
    bgClass = 'bg-red-100 dark:bg-red-900/40';
  } else if (isStale) {
    colorClass = 'text-yellow-700 dark:text-yellow-300';
    bgClass = 'bg-yellow-100 dark:bg-yellow-900/40';
  } else {
    colorClass = 'text-green-700 dark:text-green-300';
    bgClass = 'bg-green-100 dark:bg-green-900/40';
  }

  const ageText = ageHours < 1 ? '<1h' : `${Math.round(ageHours)}h`;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      bgClass,
      colorClass
    )}>
      <Clock className="h-3 w-3" />
      {ageText} old
    </span>
  );
}
