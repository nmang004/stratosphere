'use client'

import { useQuery } from '@tanstack/react-query'
import { getClient } from '@/lib/supabase/client'
import type { Client, ClientHealthHistory, ChurnPrediction } from '@/types/database'

export interface ClientWithHealth extends Client {
  latest_health?: ClientHealthHistory | null
  churn_prediction?: ChurnPrediction | null
  active_alert_count?: number
}

/**
 * Fetches all clients assigned to the current user
 */
export function useClients() {
  const supabase = getClient()

  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      return data as Client[]
    },
  })
}

/**
 * Fetches clients with their latest health data and churn predictions
 */
export function useClientsWithHealth() {
  const supabase = getClient()

  return useQuery({
    queryKey: ['clients', 'with-health'],
    queryFn: async () => {
      // Fetch clients
      const { data: clientsRaw, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (clientsError) {
        throw clientsError
      }

      const clients = clientsRaw as Client[]

      // Fetch latest health history for each client
      const { data: healthDataRaw, error: healthError } = await supabase
        .from('client_health_history')
        .select('*')
        .order('recorded_date', { ascending: false })

      if (healthError) {
        throw healthError
      }

      const healthData = healthDataRaw as ClientHealthHistory[]

      // Fetch churn predictions
      const { data: churnDataRaw, error: churnError } = await supabase
        .from('churn_prediction_scores')
        .select('*')
        .order('prediction_date', { ascending: false })

      if (churnError) {
        throw churnError
      }

      const churnData = churnDataRaw as ChurnPrediction[]

      // Fetch active alert counts
      const { data: alertCountsRaw, error: alertError } = await supabase
        .from('alerts')
        .select('client_id')
        .eq('is_dismissed', false)

      if (alertError) {
        throw alertError
      }

      const alertCounts = alertCountsRaw as { client_id: string }[]

      // Map latest health and churn to each client
      const clientsWithHealth: ClientWithHealth[] = clients.map((client) => {
        const latestHealth = healthData?.find((h) => h.client_id === client.id)
        const latestChurn = churnData?.find((c) => c.client_id === client.id)
        const alertCount = alertCounts?.filter((a) => a.client_id === client.id).length || 0

        return {
          ...client,
          latest_health: latestHealth || null,
          churn_prediction: latestChurn || null,
          active_alert_count: alertCount,
        }
      })

      return clientsWithHealth
    },
  })
}

/**
 * Fetches clients needing attention (low health or high churn)
 */
export function useClientsNeedingAttention() {
  const { data: clients, ...rest } = useClientsWithHealth()

  const needingAttention = clients?.filter((client) => {
    const healthScore = client.latest_health?.health_score ?? 100
    const churnProbability = client.churn_prediction?.churn_probability ?? 0

    return healthScore < 40 || churnProbability > 0.65
  })

  // Sort by health score ascending (lowest first)
  const sorted = needingAttention?.sort((a, b) => {
    const aScore = a.latest_health?.health_score ?? 100
    const bScore = b.latest_health?.health_score ?? 100
    return aScore - bScore
  })

  return { data: sorted, ...rest }
}

/**
 * Fetches health history for a specific client
 */
export function useClientHealth(clientId: string) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['client-health', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_health_history')
        .select('*')
        .eq('client_id', clientId)
        .order('recorded_date', { ascending: false })
        .limit(30)

      if (error) {
        throw error
      }

      return data as ClientHealthHistory[]
    },
    enabled: !!clientId,
  })
}

/**
 * Fetches a single client by ID
 */
export function useClient(clientId: string) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (error) {
        throw error
      }

      return data as Client
    },
    enabled: !!clientId,
  })
}
