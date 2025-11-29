'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/alerts'
import {
  Mail,
  MailOpen,
  Video,
  MessageSquare,
  Ticket,
  History,
  Filter,
} from 'lucide-react'
import type { ClientTouchpoint, TouchpointType } from '@/types/database'

interface TouchpointTimelineProps {
  touchpoints: ClientTouchpoint[]
  isLoading?: boolean
  className?: string
  maxItems?: number
}

type TouchpointFilter = 'all' | TouchpointType

const TOUCHPOINT_ICONS: Record<TouchpointType, typeof Mail> = {
  EMAIL_SENT: Mail,
  EMAIL_RECEIVED: MailOpen,
  MEETING: Video,
  SLACK: MessageSquare,
  TICKET_REPLY: Ticket,
}

const TOUCHPOINT_COLORS: Record<TouchpointType, { bg: string; text: string }> = {
  EMAIL_SENT: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  EMAIL_RECEIVED: { bg: 'bg-green-500/10', text: 'text-green-500' },
  MEETING: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  SLACK: { bg: 'bg-pink-500/10', text: 'text-pink-500' },
  TICKET_REPLY: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
}

const TOUCHPOINT_LABELS: Record<TouchpointType, string> = {
  EMAIL_SENT: 'Email Sent',
  EMAIL_RECEIVED: 'Email Received',
  MEETING: 'Meeting',
  SLACK: 'Slack',
  TICKET_REPLY: 'Ticket Reply',
}

interface GroupedTouchpoints {
  date: string
  displayDate: string
  items: ClientTouchpoint[]
}

function groupByDate(touchpoints: ClientTouchpoint[]): GroupedTouchpoints[] {
  const groups = new Map<string, ClientTouchpoint[]>()

  touchpoints.forEach((tp) => {
    const date = new Date(tp.occurred_at).toISOString().split('T')[0]
    if (!groups.has(date)) {
      groups.set(date, [])
    }
    groups.get(date)!.push(tp)
  })

  return Array.from(groups.entries())
    .map(([date, items]) => ({
      date,
      displayDate: new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      items: items.sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      ),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function TouchpointTimeline({
  touchpoints,
  isLoading = false,
  className,
  maxItems,
}: TouchpointTimelineProps) {
  const [filter, setFilter] = useState<TouchpointFilter>('all')

  const filteredTouchpoints = useMemo(() => {
    let filtered = touchpoints
    if (filter !== 'all') {
      filtered = touchpoints.filter((tp) => tp.touchpoint_type === filter)
    }
    if (maxItems) {
      filtered = filtered.slice(0, maxItems)
    }
    return filtered
  }, [touchpoints, filter, maxItems])

  const groupedTouchpoints = useMemo(
    () => groupByDate(filteredTouchpoints),
    [filteredTouchpoints]
  )

  if (isLoading) {
    return <TouchpointTimelineSkeleton className={className} />
  }

  if (touchpoints.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Touchpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No touchpoints recorded.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Log your first interaction with this client.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Touchpoints
            <Badge variant="secondary" className="text-xs">
              {touchpoints.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setFilter(filter === 'all' ? 'MEETING' : 'all')}
          >
            <Filter className="h-3 w-3" />
            Filter
          </Button>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilter('all')}
          >
            All
          </Badge>
          {(Object.keys(TOUCHPOINT_LABELS) as TouchpointType[]).map((type) => {
            const count = touchpoints.filter((tp) => tp.touchpoint_type === type).length
            if (count === 0) return null
            return (
              <Badge
                key={type}
                variant={filter === type ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer text-xs gap-1',
                  filter === type && TOUCHPOINT_COLORS[type].bg,
                  filter === type && TOUCHPOINT_COLORS[type].text
                )}
                onClick={() => setFilter(type)}
              >
                {TOUCHPOINT_LABELS[type]} ({count})
              </Badge>
            )
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />

          {/* Grouped entries */}
          <div className="space-y-6">
            {groupedTouchpoints.map((group) => (
              <div key={group.date}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center z-10 relative">
                    <span className="text-[10px] font-medium">
                      {new Date(group.date).getDate()}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {group.displayDate}
                  </span>
                </div>

                {/* Touchpoints for this date */}
                <div className="space-y-3 ml-10">
                  {group.items.map((touchpoint) => {
                    const Icon = TOUCHPOINT_ICONS[touchpoint.touchpoint_type]
                    const colors = TOUCHPOINT_COLORS[touchpoint.touchpoint_type]

                    return (
                      <div
                        key={touchpoint.id}
                        className="relative pl-6 pb-3 border-b border-dashed last:border-0 last:pb-0"
                      >
                        {/* Icon */}
                        <div
                          className={cn(
                            'absolute left-0 top-0 w-5 h-5 rounded-full flex items-center justify-center',
                            colors.bg
                          )}
                        >
                          <Icon className={cn('h-3 w-3', colors.text)} />
                        </div>

                        {/* Content */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {touchpoint.subject ||
                                TOUCHPOINT_LABELS[touchpoint.touchpoint_type]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(touchpoint.occurred_at)}
                            </span>
                          </div>

                          {touchpoint.summary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {touchpoint.summary}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-1.5">
                            {touchpoint.source && (
                              <Badge variant="outline" className="text-[10px] py-0 h-4">
                                {touchpoint.source}
                              </Badge>
                            )}
                            {touchpoint.sentiment_score !== null && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] py-0 h-4',
                                  touchpoint.sentiment_score >= 0.7 &&
                                    'bg-green-500/10 text-green-600 border-green-500/20',
                                  touchpoint.sentiment_score < 0.4 &&
                                    'bg-red-500/10 text-red-600 border-red-500/20'
                                )}
                              >
                                Sentiment: {Math.round(touchpoint.sentiment_score * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TouchpointTimelineSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-7 w-16" />
        </div>
        <div className="flex gap-1 mt-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
