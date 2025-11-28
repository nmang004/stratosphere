'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCard, AlertCardSkeleton } from './AlertCard'
import { DismissAlertModal } from './DismissAlertModal'
import { useActiveAlerts, AlertWithClient } from '@/lib/hooks/useAlerts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getSeverityColor } from '@/lib/utils/alerts'
import { ChevronLeft, ChevronRight, ChevronDown, Keyboard } from 'lucide-react'
import { toast } from 'sonner'

interface TriageStackProps {
  alerts?: AlertWithClient[]
  isLoading?: boolean
}

export function TriageStack({ alerts: propAlerts, isLoading: propLoading }: TriageStackProps) {
  const { data: fetchedAlerts, isLoading: fetchLoading } = useActiveAlerts()

  const alerts = propAlerts ?? fetchedAlerts ?? []
  const isLoading = propLoading ?? fetchLoading

  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissingAlert, setDismissingAlert] = useState<AlertWithClient | null>(null)
  const [showKeyboardHints, setShowKeyboardHints] = useState(true)

  const currentAlert = alerts[currentIndex]
  const hasNext = currentIndex < alerts.length - 1
  const hasPrev = currentIndex > 0

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dismissingAlert) return // Don't navigate while modal is open

      switch (e.key) {
        case 'ArrowRight':
          if (currentAlert) {
            handleAction(currentAlert)
          }
          break
        case 'ArrowLeft':
          if (currentAlert) {
            handleDismiss(currentAlert)
          }
          break
        case 'ArrowDown':
          if (hasNext) {
            setCurrentIndex((prev) => prev + 1)
          }
          break
        case 'ArrowUp':
          if (hasPrev) {
            setCurrentIndex((prev) => prev - 1)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentAlert, hasNext, hasPrev, dismissingAlert])

  // Hide keyboard hints after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowKeyboardHints(false), 10000)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = useCallback((alert: AlertWithClient) => {
    setDismissingAlert(alert)
  }, [])

  const handleAction = useCallback((alert: AlertWithClient) => {
    // For MVP, show a toast - in future, this creates a ticket
    toast.success('Action noted', {
      description: `Ticket would be created for: ${alert.signal}`,
    })

    // Move to next alert
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1)
    }
  }, [hasNext])

  const handleDismissComplete = useCallback(() => {
    setDismissingAlert(null)
    // Move to next alert after dismissal
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1)
    } else if (alerts.length > 1) {
      // If we dismissed the last one, go back one
      setCurrentIndex((prev) => Math.max(0, prev - 1))
    }
  }, [hasNext, alerts.length])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        </div>
        <AlertCardSkeleton />
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium">All caught up!</h3>
        <p className="text-muted-foreground mt-1">
          No alerts to triage. Check back later.
        </p>
      </div>
    )
  }

  const severityColors = getSeverityColor(currentAlert.severity)

  return (
    <>
      <div className="space-y-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Alert {currentIndex + 1} of {alerts.length}
            </span>
            <Badge variant="outline" className={cn('text-xs', severityColors.badge)}>
              {currentAlert.severity}
            </Badge>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              disabled={!hasNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((currentIndex + 1) / alerts.length) * 100}%` }}
          />
        </div>

        {/* Current alert card */}
        <AlertCard
          alert={currentAlert}
          onDismiss={handleDismiss}
          onAction={handleAction}
          showActions
        />

        {/* Swipe/keyboard hints */}
        {showKeyboardHints && (
          <div className="flex items-center justify-center gap-6 py-4 text-muted-foreground">
            <div className="flex items-center gap-2 text-sm">
              <ChevronLeft className="h-4 w-4" />
              <span>Dismiss</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Action</span>
              <ChevronRight className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Next</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Keyboard shortcut toggle */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyboardHints(!showKeyboardHints)}
            className="text-muted-foreground"
          >
            <Keyboard className="h-4 w-4 mr-2" />
            {showKeyboardHints ? 'Hide' : 'Show'} keyboard shortcuts
          </Button>
        </div>

        {/* Severity summary */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t">
          {(['CRITICAL', 'WARNING', 'INFO'] as const).map((severity) => {
            const count = alerts.filter((a) => a.severity === severity).length
            const colors = getSeverityColor(severity)
            return (
              <div key={severity} className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', colors.bg)} />
                <span className="text-xs text-muted-foreground">
                  {count} {severity.toLowerCase()}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <DismissAlertModal
        alert={dismissingAlert}
        open={!!dismissingAlert}
        onOpenChange={(open) => {
          if (!open) handleDismissComplete()
        }}
      />
    </>
  )
}
