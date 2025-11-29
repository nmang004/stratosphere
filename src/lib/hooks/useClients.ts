'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClient } from '@/lib/supabase/client'
import type {
  Client,
  ClientHealthHistory,
  ChurnPrediction,
  ClientTouchpoint,
  ClientTouchpointInsert,
  ClientContract,
  ServiceTier,
  ClientDetail,
} from '@/types/database'

export interface ClientWithHealth extends Client {
  latest_health?: ClientHealthHistory | null
  churn_prediction?: ChurnPrediction | null
  active_alert_count?: number
}

export interface ClientEntitlements {
  tier: ServiceTier | null
  custom_exclusions: string[]
  custom_inclusions: string[]
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

/**
 * Fetches full client detail with all related data
 */
export function useClientDetail(clientId: string) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['client-detail', clientId],
    queryFn: async (): Promise<ClientDetail> => {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError

      const client = clientData as Client

      // Fetch latest health
      const { data: healthRaw } = await supabase
        .from('client_health_history')
        .select('*')
        .eq('client_id', clientId)
        .order('recorded_date', { ascending: false })
        .limit(1)
        .single()
      const healthData = healthRaw as ClientHealthHistory | null

      // Fetch churn prediction
      const { data: churnRaw } = await supabase
        .from('churn_prediction_scores')
        .select('*')
        .eq('client_id', clientId)
        .order('prediction_date', { ascending: false })
        .limit(1)
        .single()
      const churnData = churnRaw as ChurnPrediction | null

      // Fetch contract
      const { data: contractRaw } = await supabase
        .from('client_contracts')
        .select('*')
        .eq('client_id', clientId)
        .order('contract_end', { ascending: false })
        .limit(1)
        .single()
      const contractData = contractRaw as ClientContract | null

      // Fetch entitlements with tier
      const { data: entitlementsRaw } = await supabase
        .from('client_entitlements')
        .select('*, tier:service_tiers(*)')
        .eq('client_id', clientId)
        .single()

      // Fetch active alert count
      const { count: alertCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_dismissed', false)

      // Type the entitlements data
      const entitlementsData = entitlementsRaw as {
        tier: ServiceTier | null
        custom_exclusions: string[]
        custom_inclusions: string[]
      } | null

      return {
        ...client,
        latest_health: healthData,
        churn_prediction: churnData,
        contract: contractData,
        entitlements: entitlementsData ? {
          tier: entitlementsData.tier,
          custom_exclusions: entitlementsData.custom_exclusions || [],
          custom_inclusions: entitlementsData.custom_inclusions || [],
        } : null,
        active_alert_count: alertCount || 0,
      }
    },
    enabled: !!clientId,
  })
}

/**
 * Fetches health history for a client with configurable day range
 */
export function useClientHealthHistory(clientId: string, days: number = 30) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['client-health-history', clientId, days],
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('client_health_history')
        .select('*')
        .eq('client_id', clientId)
        .gte('recorded_date', startDate.toISOString().split('T')[0])
        .order('recorded_date', { ascending: true })

      if (error) throw error

      return data as ClientHealthHistory[]
    },
    enabled: !!clientId,
  })
}

/**
 * Fetches touchpoints for a client
 */
export function useClientTouchpoints(clientId: string) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['client-touchpoints', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_touchpoints')
        .select('*')
        .eq('client_id', clientId)
        .order('occurred_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return data as ClientTouchpoint[]
    },
    enabled: !!clientId,
  })
}

/**
 * Fetches contract details for a client
 */
export function useClientContract(clientId: string) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['client-contract', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_contracts')
        .select('*')
        .eq('client_id', clientId)
        .order('contract_end', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // Ignore no rows error

      return data as ClientContract | null
    },
    enabled: !!clientId,
  })
}

/**
 * Fetches entitlements with tier info for a client
 */
export function useClientEntitlements(clientId: string) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['client-entitlements', clientId],
    queryFn: async (): Promise<ClientEntitlements | null> => {
      const { data: rawData, error } = await supabase
        .from('client_entitlements')
        .select('*, tier:service_tiers(*)')
        .eq('client_id', clientId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (!rawData) return null

      const data = rawData as {
        tier: ServiceTier | null
        custom_exclusions: string[]
        custom_inclusions: string[]
      }

      return {
        tier: data.tier,
        custom_exclusions: data.custom_exclusions || [],
        custom_inclusions: data.custom_inclusions || [],
      }
    },
    enabled: !!clientId,
  })
}

/**
 * Mutation to create a new touchpoint
 */
export function useCreateTouchpoint() {
  const supabase = getClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (touchpoint: ClientTouchpointInsert) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('client_touchpoints')
        .insert(touchpoint)
        .select()
        .single()

      if (error) throw error

      return data as ClientTouchpoint
    },
    onSuccess: (data) => {
      // Invalidate touchpoints query for this client
      queryClient.invalidateQueries({ queryKey: ['client-touchpoints', data.client_id] })
      // Also invalidate client detail to update "last contact" info
      queryClient.invalidateQueries({ queryKey: ['client-detail', data.client_id] })
    },
  })
}

/**
 * Fetches recent alerts for a client (with client info for AlertCard compatibility)
 */
export function useClientAlerts(clientId: string, limit: number = 5) {
  const supabase = getClient()

  return useQuery({
    queryKey: ['client-alerts', clientId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .eq('client_id', clientId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data as (import('@/types/database').Alert & { clients: { id: string; name: string } | null })[]
    },
    enabled: !!clientId,
  })
}

// Client filter types
export type HealthFilter = 'all' | 'critical' | 'warning' | 'healthy'
export type ChurnFilter = 'all' | 'high' | 'medium' | 'low'
export type TierFilter = 'all' | 'starter' | 'growth' | 'enterprise'
export type SortOption = 'name' | 'health' | 'lastContact' | 'churnRisk'
export type ViewMode = 'grid' | 'list'

export interface ClientFilters {
  search: string
  health: HealthFilter
  churn: ChurnFilter
  tier: TierFilter
  sortBy: SortOption
  sortOrder: 'asc' | 'desc'
  viewMode: ViewMode
}

/**
 * Filters and sorts clients based on filter options
 */
export function filterClients(
  clients: ClientWithHealth[],
  filters: ClientFilters
): ClientWithHealth[] {
  let filtered = [...clients]

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter((c) =>
      c.name.toLowerCase().includes(searchLower) ||
      c.domain?.toLowerCase().includes(searchLower) ||
      c.industry?.toLowerCase().includes(searchLower)
    )
  }

  // Health filter
  if (filters.health !== 'all') {
    filtered = filtered.filter((c) => {
      const score = c.latest_health?.health_score ?? c.risk_score ?? 50
      if (filters.health === 'critical') return score < 40
      if (filters.health === 'warning') return score >= 40 && score < 70
      if (filters.health === 'healthy') return score >= 70
      return true
    })
  }

  // Churn filter
  if (filters.churn !== 'all') {
    filtered = filtered.filter((c) => {
      const prob = c.churn_prediction?.churn_probability ?? 0
      if (filters.churn === 'high') return prob > 0.65
      if (filters.churn === 'medium') return prob >= 0.3 && prob <= 0.65
      if (filters.churn === 'low') return prob < 0.3
      return true
    })
  }

  // Sorting
  filtered.sort((a, b) => {
    let comparison = 0

    switch (filters.sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'health':
        const aHealth = a.latest_health?.health_score ?? a.risk_score ?? 50
        const bHealth = b.latest_health?.health_score ?? b.risk_score ?? 50
        comparison = aHealth - bHealth
        break
      case 'churnRisk':
        const aChurn = a.churn_prediction?.churn_probability ?? 0
        const bChurn = b.churn_prediction?.churn_probability ?? 0
        comparison = bChurn - aChurn // Higher churn first by default
        break
      case 'lastContact':
        // This would require additional data - for now sort by name
        comparison = a.name.localeCompare(b.name)
        break
    }

    return filters.sortOrder === 'desc' ? -comparison : comparison
  })

  return filtered
}
