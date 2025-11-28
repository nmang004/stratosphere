'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DISMISSAL_REASONS, getSeverityColor } from '@/lib/utils/alerts'
import type { AlertWithClient } from '@/lib/hooks/useAlerts'
import { useDismissAlert } from '@/lib/hooks/useAlerts'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'

interface DismissAlertModalProps {
  alert: AlertWithClient | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CRITICAL_HOLD_DURATION = 3000 // 3 seconds
const CRITICAL_CONFIRMATION_TEXT = 'DISMISS'

export function DismissAlertModal({
  alert,
  open,
  onOpenChange,
}: DismissAlertModalProps) {
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [holdComplete, setHoldComplete] = useState(false)

  const dismissMutation = useDismissAlert()
  const isCritical = alert?.severity === 'CRITICAL'
  const severityColors = alert ? getSeverityColor(alert.severity) : null

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setReason('')
      setNotes('')
      setConfirmationText('')
      setHoldProgress(0)
      setIsHolding(false)
      setHoldComplete(false)
    }
  }, [open])

  // Handle hold progress for CRITICAL alerts
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isHolding && isCritical && !holdComplete) {
      interval = setInterval(() => {
        setHoldProgress((prev) => {
          const next = prev + 100
          if (next >= CRITICAL_HOLD_DURATION) {
            setHoldComplete(true)
            setIsHolding(false)
            return CRITICAL_HOLD_DURATION
          }
          return next
        })
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isHolding, isCritical, holdComplete])

  const handleDismiss = useCallback(async () => {
    if (!alert || !reason) return

    // For CRITICAL alerts, require confirmation text
    if (isCritical && confirmationText !== CRITICAL_CONFIRMATION_TEXT) {
      toast.error(`Please type "${CRITICAL_CONFIRMATION_TEXT}" to confirm`)
      return
    }

    try {
      await dismissMutation.mutateAsync({
        alertId: alert.id,
        reason,
        notes: notes || undefined,
      })

      toast.success('Alert dismissed successfully')
      onOpenChange(false)
    } catch {
      toast.error('Failed to dismiss alert')
    }
  }, [alert, reason, notes, isCritical, confirmationText, dismissMutation, onOpenChange])

  const handleHoldStart = () => {
    if (!holdComplete) {
      setIsHolding(true)
      setHoldProgress(0)
    }
  }

  const handleHoldEnd = () => {
    if (!holdComplete) {
      setIsHolding(false)
      setHoldProgress(0)
    }
  }

  const canDismiss = isCritical
    ? holdComplete && reason && confirmationText === CRITICAL_CONFIRMATION_TEXT
    : !!reason

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Dismiss Alert
            {alert && severityColors && (
              <Badge variant="outline" className={cn('text-xs', severityColors.badge)}>
                {alert.severity}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isCritical
              ? 'Critical alerts require additional confirmation to dismiss.'
              : 'Please select a reason for dismissing this alert.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alert preview */}
          {alert && (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p className="font-medium">{alert.signal}</p>
              {alert.clients && (
                <p className="text-muted-foreground text-xs mt-1">
                  {alert.clients.name}
                </p>
              )}
            </div>
          )}

          {/* Critical alert warning and hold button */}
          {isCritical && !holdComplete && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is a CRITICAL alert. Press and hold the button below for 3
                seconds to proceed.
              </AlertDescription>
            </Alert>
          )}

          {isCritical && !holdComplete && (
            <div className="space-y-2">
              <Button
                variant="destructive"
                className="w-full relative overflow-hidden"
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
              >
                {/* Progress overlay */}
                <div
                  className="absolute inset-0 bg-white/20 transition-all"
                  style={{ width: `${(holdProgress / CRITICAL_HOLD_DURATION) * 100}%` }}
                />
                <span className="relative">
                  {isHolding
                    ? `Hold... ${Math.ceil((CRITICAL_HOLD_DURATION - holdProgress) / 1000)}s`
                    : 'Press and Hold to Confirm'}
                </span>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {holdProgress > 0 && !holdComplete
                  ? `${Math.round((holdProgress / CRITICAL_HOLD_DURATION) * 100)}% complete`
                  : 'Hold for 3 seconds'}
              </p>
            </div>
          )}

          {isCritical && holdComplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hold confirmed. Now type "{CRITICAL_CONFIRMATION_TEXT}" below and
                select a reason.
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation text input for CRITICAL */}
          {isCritical && holdComplete && (
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type "{CRITICAL_CONFIRMATION_TEXT}" to confirm
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                placeholder={CRITICAL_CONFIRMATION_TEXT}
                className={cn(
                  confirmationText === CRITICAL_CONFIRMATION_TEXT &&
                    'border-green-500 focus-visible:ring-green-500'
                )}
              />
            </div>
          )}

          {/* Reason selection - show for non-critical or after hold complete */}
          {(!isCritical || holdComplete) && (
            <div className="space-y-2">
              <Label htmlFor="reason">Dismissal Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {DISMISSAL_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          {(!isCritical || holdComplete) && (
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context for this dismissal..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDismiss}
            disabled={!canDismiss || dismissMutation.isPending}
            variant={isCritical ? 'destructive' : 'default'}
          >
            {dismissMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Dismiss Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
