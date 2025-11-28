'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCard, AlertCardSkeleton } from './AlertCard'
import { DismissAlertModal } from './DismissAlertModal'
import { useActiveAlerts, AlertWithClient } from '@/lib/hooks/useAlerts'
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'

interface MorningBriefingProps {
  maxAlerts?: number
}

export function MorningBriefing({ maxAlerts = 5 }: MorningBriefingProps) {
  const { data: alerts, isLoading, error } = useActiveAlerts(maxAlerts + 5) // Fetch a few extra
  const [dismissingAlert, setDismissingAlert] = useState<AlertWithClient | null>(null)

  const displayedAlerts = alerts?.slice(0, maxAlerts) ?? []
  const hasMoreAlerts = (alerts?.length ?? 0) > maxAlerts

  const handleDismiss = (alert: AlertWithClient) => {
    setDismissingAlert(alert)
  }

  const handleAction = (alert: AlertWithClient) => {
    // For MVP, navigate to the triage page
    // In future, this could open a ticket creation modal
    window.location.href = `/triage?highlight=${alert.id}`
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Morning Briefing
          </CardTitle>
          <CardDescription>AI-powered summary of your day</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load alerts. Please try refreshing the page.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Morning Briefing
              </CardTitle>
              <CardDescription>What needs your attention today</CardDescription>
            </div>
            {hasMoreAlerts && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/triage" className="flex items-center gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            // Loading skeletons
            <>
              <AlertCardSkeleton compact />
              <AlertCardSkeleton compact />
              <AlertCardSkeleton compact />
            </>
          ) : displayedAlerts.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-medium">All clear!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No urgent items this morning.
              </p>
            </div>
          ) : (
            // Alert list
            displayedAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={handleDismiss}
                onAction={handleAction}
                compact
              />
            ))
          )}

          {/* View all link for mobile */}
          {hasMoreAlerts && displayedAlerts.length > 0 && (
            <div className="pt-2 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/triage" className="flex items-center gap-2">
                  View all {alerts?.length} alerts
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DismissAlertModal
        alert={dismissingAlert}
        open={!!dismissingAlert}
        onOpenChange={(open) => !open && setDismissingAlert(null)}
      />
    </>
  )
}

export function MorningBriefingSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Morning Briefing
        </CardTitle>
        <CardDescription>What needs your attention today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <AlertCardSkeleton compact />
        <AlertCardSkeleton compact />
        <AlertCardSkeleton compact />
      </CardContent>
    </Card>
  )
}
