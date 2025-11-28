import { AlertTriangle, AlertCircle, Info, LucideIcon } from 'lucide-react'
import type { AlertSeverity } from '@/types/database'

/**
 * Returns Tailwind color classes for alert severity
 */
export function getSeverityColor(severity: AlertSeverity): {
  bg: string
  text: string
  border: string
  badge: string
} {
  switch (severity) {
    case 'CRITICAL':
      return {
        bg: 'bg-red-500',
        text: 'text-red-500',
        border: 'border-red-500',
        badge: 'bg-red-500/10 text-red-500 border-red-500/20',
      }
    case 'WARNING':
      return {
        bg: 'bg-yellow-500',
        text: 'text-yellow-500',
        border: 'border-yellow-500',
        badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      }
    case 'INFO':
    default:
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-500',
        border: 'border-blue-500',
        badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      }
  }
}

/**
 * Returns the appropriate Lucide icon for alert severity
 */
export function getSeverityIcon(severity: AlertSeverity): LucideIcon {
  switch (severity) {
    case 'CRITICAL':
      return AlertCircle
    case 'WARNING':
      return AlertTriangle
    case 'INFO':
    default:
      return Info
  }
}

/**
 * Formats a timestamp as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}

/**
 * Returns health score color classes based on score value
 */
export function getHealthScoreColor(score: number): {
  bg: string
  text: string
  label: string
} {
  if (score < 40) {
    return {
      bg: 'bg-red-500',
      text: 'text-red-500',
      label: 'Critical',
    }
  } else if (score < 70) {
    return {
      bg: 'bg-yellow-500',
      text: 'text-yellow-500',
      label: 'Warning',
    }
  } else {
    return {
      bg: 'bg-green-500',
      text: 'text-green-500',
      label: 'Healthy',
    }
  }
}

/**
 * Returns trend indicator based on score change
 */
export function getTrendIndicator(
  current: number,
  previous: number
): {
  direction: 'up' | 'down' | 'stable'
  symbol: string
  label: string
} {
  const diff = current - previous
  const threshold = 2 // Consider stable if change is less than 2 points

  if (diff > threshold) {
    return { direction: 'up', symbol: '↑', label: 'Improving' }
  } else if (diff < -threshold) {
    return { direction: 'down', symbol: '↓', label: 'Declining' }
  } else {
    return { direction: 'stable', symbol: '→', label: 'Stable' }
  }
}

/**
 * Dismissal reason options for the dismiss modal
 */
export const DISMISSAL_REASONS = [
  { value: 'false_positive', label: 'False positive - data anomaly' },
  { value: 'already_addressed', label: 'Already addressed offline' },
  { value: 'client_acknowledged', label: 'Client acknowledged - no action needed' },
  { value: 'scheduled_later', label: 'Scheduled for later review' },
  { value: 'not_applicable', label: 'Not applicable to current strategy' },
  { value: 'other', label: 'Other (see notes)' },
] as const

export type DismissalReason = (typeof DISMISSAL_REASONS)[number]['value']
