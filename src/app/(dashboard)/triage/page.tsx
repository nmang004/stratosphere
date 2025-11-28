'use client'

import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TriageStack } from '@/components/dashboard/TriageStack'
import { AlertCard, AlertCardSkeleton } from '@/components/dashboard/AlertCard'
import { DismissAlertModal } from '@/components/dashboard/DismissAlertModal'
import { useAlerts, useAlertStats, AlertWithClient } from '@/lib/hooks/useAlerts'
import { cn } from '@/lib/utils'
import { getSeverityColor } from '@/lib/utils/alerts'
import type { AlertSeverity } from '@/types/database'
import { AlertTriangle, LayoutGrid, Layers } from 'lucide-react'

type ViewMode = 'stack' | 'list'
type SortOption = 'newest' | 'oldest' | 'severity'
type TabValue = 'all' | 'critical' | 'warning' | 'info' | 'dismissed'

export default function TriagePage() {
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [sortBy, setSortBy] = useState<SortOption>('severity')
  const [viewMode, setViewMode] = useState<ViewMode>('stack')
  const [dismissingAlert, setDismissingAlert] = useState<AlertWithClient | null>(null)

  const { data: stats, isLoading: statsLoading } = useAlertStats()

  // Determine filter based on active tab
  const filters = useMemo(() => {
    const base: { severity?: AlertSeverity; isDismissed?: boolean } = {}

    switch (activeTab) {
      case 'critical':
        base.severity = 'CRITICAL'
        base.isDismissed = false
        break
      case 'warning':
        base.severity = 'WARNING'
        base.isDismissed = false
        break
      case 'info':
        base.severity = 'INFO'
        base.isDismissed = false
        break
      case 'dismissed':
        base.isDismissed = true
        break
      default:
        base.isDismissed = false
    }

    return base
  }, [activeTab])

  const { data: alerts, isLoading } = useAlerts(filters)

  // Sort alerts
  const sortedAlerts = useMemo(() => {
    if (!alerts) return []

    const sorted = [...alerts]

    switch (sortBy) {
      case 'newest':
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
      case 'oldest':
        sorted.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        break
      case 'severity':
        const severityOrder: Record<AlertSeverity, number> = {
          CRITICAL: 0,
          WARNING: 1,
          INFO: 2,
        }
        sorted.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
        break
    }

    return sorted
  }, [alerts, sortBy])

  const handleDismiss = (alert: AlertWithClient) => {
    setDismissingAlert(alert)
  }

  const handleAction = (alert: AlertWithClient) => {
    // For MVP, this would create a ticket
    console.log('Take action on alert:', alert.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Alert Triage
          </h2>
          <p className="text-muted-foreground">
            Review and manage alerts across all your clients.
          </p>
        </div>

        {/* View mode toggle and sort */}
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity">By Severity</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'stack' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('stack')}
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="gap-2">
            All
            {!statsLoading && stats && (
              <Badge variant="secondary" className="text-xs">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="critical" className="gap-2">
            Critical
            {!statsLoading && stats && stats.critical > 0 && (
              <Badge
                variant="outline"
                className={cn('text-xs', getSeverityColor('CRITICAL').badge)}
              >
                {stats.critical}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="warning" className="gap-2">
            Warning
            {!statsLoading && stats && stats.warning > 0 && (
              <Badge
                variant="outline"
                className={cn('text-xs', getSeverityColor('WARNING').badge)}
              >
                {stats.warning}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            Info
            {!statsLoading && stats && stats.info > 0 && (
              <Badge
                variant="outline"
                className={cn('text-xs', getSeverityColor('INFO').badge)}
              >
                {stats.info}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {activeTab === 'all' && 'All Active Alerts'}
                {activeTab === 'critical' && 'Critical Alerts'}
                {activeTab === 'warning' && 'Warning Alerts'}
                {activeTab === 'info' && 'Info Alerts'}
                {activeTab === 'dismissed' && 'Dismissed Alerts'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'dismissed'
                  ? 'Previously dismissed alerts for reference'
                  : 'Swipe right to take action, left to dismiss'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <AlertCardSkeleton />
                  <AlertCardSkeleton />
                  <AlertCardSkeleton />
                </div>
              ) : viewMode === 'stack' && activeTab !== 'dismissed' ? (
                <TriageStack alerts={sortedAlerts} isLoading={isLoading} />
              ) : (
                <div className="space-y-4">
                  {sortedAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">No alerts</h3>
                      <p className="text-muted-foreground mt-1">
                        {activeTab === 'dismissed'
                          ? 'No dismissed alerts to show.'
                          : 'No alerts in this category.'}
                      </p>
                    </div>
                  ) : (
                    sortedAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onDismiss={handleDismiss}
                        onAction={handleAction}
                        showActions={activeTab !== 'dismissed'}
                      />
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DismissAlertModal
        alert={dismissingAlert}
        open={!!dismissingAlert}
        onOpenChange={(open) => !open && setDismissingAlert(null)}
      />
    </div>
  )
}
