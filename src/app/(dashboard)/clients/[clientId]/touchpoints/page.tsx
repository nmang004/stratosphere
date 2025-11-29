'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useClientTouchpoints } from '@/lib/hooks/useClients'
import { TouchpointTimeline } from '@/components/clients/TouchpointTimeline'
import { LogTouchpointModal } from '@/components/clients/LogTouchpointModal'
import { Button } from '@/components/ui/button'
import {
  History,
  Mail,
  MailOpen,
  Video,
  MessageSquare,
  Ticket,
  Plus,
  CalendarDays,
} from 'lucide-react'
import type { TouchpointType } from '@/types/database'
import { useMemo } from 'react'

const TOUCHPOINT_ICONS: Record<TouchpointType, typeof Mail> = {
  EMAIL_SENT: Mail,
  EMAIL_RECEIVED: MailOpen,
  MEETING: Video,
  SLACK: MessageSquare,
  TICKET_REPLY: Ticket,
}

export default function ClientTouchpointsPage() {
  const params = useParams()
  const clientId = params.clientId as string

  const { data: touchpoints, isLoading } = useClientTouchpoints(clientId)

  // Calculate stats
  const stats = useMemo(() => {
    if (!touchpoints || touchpoints.length === 0) return null

    const total = touchpoints.length
    const byType = touchpoints.reduce(
      (acc, tp) => {
        acc[tp.touchpoint_type] = (acc[tp.touchpoint_type] || 0) + 1
        return acc
      },
      {} as Record<TouchpointType, number>
    )

    const lastContact = touchpoints[0]
    const daysSinceLastContact = Math.floor(
      (new Date().getTime() - new Date(lastContact.occurred_at).getTime()) /
        (1000 * 60 * 60 * 24)
    )

    // Count touchpoints in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const last30Days = touchpoints.filter(
      (tp) => new Date(tp.occurred_at) >= thirtyDaysAgo
    ).length

    // Average sentiment
    const sentimentScores = touchpoints
      .filter((tp) => tp.sentiment_score !== null)
      .map((tp) => tp.sentiment_score as number)
    const avgSentiment =
      sentimentScores.length > 0
        ? Math.round(
            (sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length) * 100
          )
        : null

    return {
      total,
      byType,
      daysSinceLastContact,
      last30Days,
      avgSentiment,
      lastContactType: lastContact.touchpoint_type,
    }
  }, [touchpoints])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Client Touchpoints
          </h2>
          <p className="text-sm text-muted-foreground">
            Track all interactions with this client
          </p>
        </div>

        <LogTouchpointModal
          clientId={clientId}
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Log Touchpoint
            </Button>
          }
        />
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Total Touchpoints</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Last 30 Days</p>
              <p className="text-2xl font-bold">{stats.last30Days}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Days Since Contact</p>
              <p
                className={`text-2xl font-bold ${
                  stats.daysSinceLastContact > 14 ? 'text-yellow-500' : ''
                }`}
              >
                {stats.daysSinceLastContact}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Avg Sentiment</p>
              <p
                className={`text-2xl font-bold ${
                  stats.avgSentiment !== null
                    ? stats.avgSentiment >= 70
                      ? 'text-green-500'
                      : stats.avgSentiment < 50
                        ? 'text-red-500'
                        : ''
                    : ''
                }`}
              >
                {stats.avgSentiment !== null ? `${stats.avgSentiment}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Touchpoint breakdown by type */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interaction Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(Object.entries(stats.byType) as [TouchpointType, number][]).map(
                ([type, count]) => {
                  const Icon = TOUCHPOINT_ICONS[type]
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{type.replace('_', ' ')}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <TouchpointTimeline
        touchpoints={touchpoints || []}
        isLoading={isLoading}
      />

      {/* Empty state hint */}
      {!isLoading && (!touchpoints || touchpoints.length === 0) && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-1">No touchpoints yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your interactions with this client by logging your first
                touchpoint.
              </p>
              <LogTouchpointModal
                clientId={clientId}
                trigger={
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Log Your First Touchpoint
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
