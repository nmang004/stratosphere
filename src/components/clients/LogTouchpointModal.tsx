'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useCreateTouchpoint } from '@/lib/hooks/useClients'
import { Plus, Loader2 } from 'lucide-react'
import type { TouchpointType } from '@/types/database'

interface LogTouchpointModalProps {
  clientId: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const TOUCHPOINT_TYPES: { value: TouchpointType; label: string }[] = [
  { value: 'EMAIL_SENT', label: 'Email Sent' },
  { value: 'EMAIL_RECEIVED', label: 'Email Received' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'SLACK', label: 'Slack Message' },
  { value: 'TICKET_REPLY', label: 'Ticket Reply' },
]

const SOURCE_OPTIONS = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'slack', label: 'Slack' },
  { value: 'zendesk', label: 'Zendesk' },
  { value: 'manual', label: 'Manual Entry' },
]

export function LogTouchpointModal({
  clientId,
  trigger,
  onSuccess,
}: LogTouchpointModalProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TouchpointType>('MEETING')
  const [subject, setSubject] = useState('')
  const [summary, setSummary] = useState('')
  const [source, setSource] = useState('manual')
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date()
    // Format for datetime-local input
    return now.toISOString().slice(0, 16)
  })

  const createTouchpoint = useCreateTouchpoint()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!type) {
      toast.error('Please select a touchpoint type')
      return
    }

    try {
      await createTouchpoint.mutateAsync({
        client_id: clientId,
        touchpoint_type: type,
        occurred_at: new Date(occurredAt).toISOString(),
        subject: subject || null,
        summary: summary || null,
        source: source || null,
      })

      toast.success('Touchpoint logged successfully')
      setOpen(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      console.error('Error logging touchpoint:', error)
      toast.error('Failed to log touchpoint')
    }
  }

  const resetForm = () => {
    setType('MEETING')
    setSubject('')
    setSummary('')
    setSource('manual')
    setOccurredAt(new Date().toISOString().slice(0, 16))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Log Touchpoint
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log Touchpoint</DialogTitle>
            <DialogDescription>
              Record an interaction with this client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as TouchpointType)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TOUCHPOINT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date/Time */}
            <div className="grid gap-2">
              <Label htmlFor="occurredAt">Date & Time *</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            </div>

            {/* Source */}
            <div className="grid gap-2">
              <Label htmlFor="source">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject / Title</Label>
              <Input
                id="subject"
                placeholder="e.g., Weekly Strategy Call"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Summary */}
            <div className="grid gap-2">
              <Label htmlFor="summary">Summary / Notes</Label>
              <Textarea
                id="summary"
                placeholder="Brief description of the interaction..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createTouchpoint.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTouchpoint.isPending}>
              {createTouchpoint.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Log Touchpoint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
