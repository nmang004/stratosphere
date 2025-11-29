'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClientList } from '@/components/clients/ClientList'
import {
  useClientsWithHealth,
  filterClients,
  type ClientFilters,
  type HealthFilter,
  type ChurnFilter,
  type TierFilter,
  type SortOption,
  type ViewMode,
} from '@/lib/hooks/useClients'
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Users,
  ArrowUpDown,
} from 'lucide-react'

const HEALTH_OPTIONS: { value: HealthFilter; label: string }[] = [
  { value: 'all', label: 'All Health' },
  { value: 'critical', label: 'Critical (<40)' },
  { value: 'warning', label: 'Warning (40-70)' },
  { value: 'healthy', label: 'Healthy (>70)' },
]

const CHURN_OPTIONS: { value: ChurnFilter; label: string }[] = [
  { value: 'all', label: 'All Risk' },
  { value: 'high', label: 'High Risk (>65%)' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'low', label: 'Low Risk (<30%)' },
]

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: 'all', label: 'All Tiers' },
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'enterprise', label: 'Enterprise' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'health', label: 'Health Score' },
  { value: 'churnRisk', label: 'Churn Risk' },
  { value: 'lastContact', label: 'Last Contact' },
]

export default function ClientsPage() {
  const { data: clients, isLoading, error } = useClientsWithHealth()

  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    health: 'all',
    churn: 'all',
    tier: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'grid',
  })

  const [showFilters, setShowFilters] = useState(false)

  const filteredClients = useMemo(() => {
    if (!clients) return []
    return filterClients(clients, filters)
  }, [clients, filters])

  const updateFilter = <K extends keyof ClientFilters>(
    key: K,
    value: ClientFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const activeFilterCount = [
    filters.health !== 'all',
    filters.churn !== 'all',
    filters.tier !== 'all',
  ].filter(Boolean).length

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h3 className="font-medium text-lg mb-1">Error loading clients</h3>
          <p className="text-sm text-muted-foreground">
            {error.message || 'Something went wrong. Please try again.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Clients
          </h1>
          <p className="text-muted-foreground">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                {filteredClients.length} client
                {filteredClients.length !== 1 ? 's' : ''}
                {activeFilterCount > 0 && ` (filtered from ${clients?.length || 0})`}
              </>
            )}
          </p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Search and filters bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilter('sortBy', value as SortOption)}
            >
              <SelectTrigger className="w-[140px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
              }
            >
              <ArrowUpDown
                className={`h-4 w-4 transition-transform ${
                  filters.sortOrder === 'desc' ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={filters.viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => updateFilter('viewMode', 'grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={filters.viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => updateFilter('viewMode', 'list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Health Status
              </label>
              <Select
                value={filters.health}
                onValueChange={(value) => updateFilter('health', value as HealthFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEALTH_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Churn Risk
              </label>
              <Select
                value={filters.churn}
                onValueChange={(value) => updateFilter('churn', value as ChurnFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHURN_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Service Tier
              </label>
              <Select
                value={filters.tier}
                onValueChange={(value) => updateFilter('tier', value as TierFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      health: 'all',
                      churn: 'all',
                      tier: 'all',
                    }))
                  }
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Client list */}
      <ClientList
        clients={filteredClients}
        viewMode={filters.viewMode}
        isLoading={isLoading}
      />
    </div>
  )
}
