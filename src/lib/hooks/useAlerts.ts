'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClient } from '@/lib/supabase/client'
import type { Alert, AlertSeverity } from '@/types/database'

export interface AlertWithClient extends Alert {
  clients: {
    id: string
    name: string
  } | null
}

export interface AlertFilters {
  severity?: AlertSeverity
  isDismissed?: boolean
  clientId?: string
}

/**
 * Fetches alerts for the current user's assigned clients
 */
export function useAlerts(filters?: AlertFilters) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.severity) {
        query = query.eq('severity', filters.severity)
      }

      if (filters?.isDismissed !== undefined) {
        query = query.eq('is_dismissed', filters.isDismissed)
      }

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data as AlertWithClient[]
    },
  })
}

/**
 * Fetches active (non-dismissed) alerts sorted by severity
 */
export function useActiveAlerts(limit?: number) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['alerts', 'active', limit],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      // Sort by severity priority: CRITICAL > WARNING > INFO
      const severityOrder: Record<AlertSeverity, number> = {
        CRITICAL: 0,
        WARNING: 1,
        INFO: 2,
      }

      return (data as AlertWithClient[]).sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      )
    },
  })
}

/**
 * Gets alert statistics by severity
 */
export function useAlertStats() {
  const supabase = getClient()

  return useQuery({
    queryKey: ['alerts', 'stats'],
    queryFn: async () => {
      const { data: rawData, error } = await supabase
        .from('alerts')
        .select('severity, is_dismissed')
        .eq('is_dismissed', false)

      if (error) {
        throw error
      }

      const data = rawData as { severity: AlertSeverity; is_dismissed: boolean }[]

      const stats = {
        total: data.length,
        critical: data.filter((a) => a.severity === 'CRITICAL').length,
        warning: data.filter((a) => a.severity === 'WARNING').length,
        info: data.filter((a) => a.severity === 'INFO').length,
      }

      return stats
    },
  })
}

interface DismissAlertParams {
  alertId: string
  reason: string
  notes?: string
}

/**
 * Mutation to dismiss an alert
 */
export function useDismissAlert() {
  const supabase = getClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ alertId, reason, notes }: DismissAlertParams) => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get the alert to log its data
      const { data: alert, error: alertError } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', alertId)
        .single()

      if (alertError) {
        throw alertError
      }

      // Update alert as dismissed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('alerts')
        .update({ is_dismissed: true })
        .eq('id', alertId)

      if (updateError) {
        throw updateError
      }

      // Log dismissal to alert_dismissals table
      // Note: This requires the alert_dismissals table to exist
      // For now, we'll just update the alert status

      return { success: true }
    },
    onSuccess: () => {
      // Invalidate alert queries to refetch
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

/**
 * Mutation to mark an alert as read
 */
export function useMarkAlertRead() {
  const supabase = getClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (alertId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId)

      if (error) {
        throw error
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
