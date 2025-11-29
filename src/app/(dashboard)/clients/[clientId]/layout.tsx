'use client'

import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { getHealthScoreColor, getTrendIndicator } from '@/lib/utils/alerts'
import { useClientDetail } from '@/lib/hooks/useClients'
import { EntitlementsBadge } from '@/components/clients/EntitlementsBadge'
import { ChurnRiskIndicator } from '@/components/clients/ChurnRiskIndicator'
import { LogTouchpointModal } from '@/components/clients/LogTouchpointModal'
import { AIDraftPanel } from '@/components/shared/AIDraftPanel'
import { AIChatTrigger } from '@/components/shared/AIChatPanel'
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  ExternalLink,
} from 'lucide-react'

const TABS = [
  { value: 'overview', label: 'Overview', href: '' },
  { value: 'health', label: 'Health History', href: '/health' },
  { value: 'touchpoints', label: 'Touchpoints', href: '/touchpoints' },
  { value: 'serp', label: 'SERP Analysis', href: '/serp' },
  { value: 'gsc', label: 'Search Console', href: '/gsc' },
  { value: 'experiments', label: 'Experiments', href: '/experiments', disabled: true },
]

export default function ClientDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const clientId = params.clientId as string

  const { data: client, isLoading, error } = useClientDetail(clientId)

  // Determine active tab
  const getActiveTab = () => {
    if (pathname.endsWith('/health')) return 'health'
    if (pathname.endsWith('/touchpoints')) return 'touchpoints'
    if (pathname.endsWith('/serp')) return 'serp'
    if (pathname.endsWith('/gsc')) return 'gsc'
    if (pathname.endsWith('/experiments')) return 'experiments'
    return 'overview'
  }

  const activeTab = getActiveTab()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="font-medium text-lg mb-1">Client not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The client you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Button asChild variant="outline">
          <Link href="/clients">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Link>
        </Button>
      </div>
    )
  }

  const healthScore = client?.latest_health?.health_score ?? client?.risk_score ?? 0
  const previousScore = client?.risk_score ?? healthScore
  const healthColors = getHealthScoreColor(healthScore)
  const trend = getTrendIndicator(healthScore, previousScore)
  const TrendIcon =
    trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
        ? TrendingDown
        : Minus

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/clients" className="hover:text-foreground transition-colors">
          Clients
        </Link>
        <span>/</span>
        <span className="text-foreground">
          {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : client?.name}
        </span>
      </div>

      {/* Client Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {isLoading ? (
          <ClientHeaderSkeleton />
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{client?.name}</h1>
                {/* Health score badge */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full font-bold text-white',
                      healthColors.bg
                    )}
                  >
                    {healthScore}
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-sm',
                      trend.direction === 'up' && 'text-green-500',
                      trend.direction === 'down' && 'text-red-500',
                      trend.direction === 'stable' && 'text-muted-foreground'
                    )}
                  >
                    <TrendIcon className="h-4 w-4" />
                    <span>{trend.label}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {client?.domain && (
                  <a
                    href={`https://${client.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {client.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {client?.industry && (
                  <Badge variant="secondary">{client.industry}</Badge>
                )}
                {client?.entitlements?.tier && (
                  <EntitlementsBadge
                    tier={client.entitlements.tier}
                    customExclusions={client.entitlements.custom_exclusions}
                    customInclusions={client.entitlements.custom_inclusions}
                  />
                )}
                {client?.churn_prediction && (
                  <ChurnRiskIndicator
                    churnPrediction={client.churn_prediction}
                    clientId={clientId}
                  />
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center gap-2">
              <AIChatTrigger
                clientId={clientId}
                clientName={client?.name}
              />
              <AIDraftPanel
                clientId={clientId}
                clientName={client?.name || 'Client'}
              />
              <LogTouchpointModal clientId={clientId} />
              <Button variant="outline" size="sm" className="gap-1" disabled>
                <FileText className="h-4 w-4" />
                View Contract
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              asChild={!tab.disabled}
              className={cn(
                'data-[state=active]:bg-background',
                tab.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {tab.disabled ? (
                <span className="flex items-center gap-1">
                  {tab.label}
                  <Badge variant="outline" className="text-[10px] py-0 h-4 ml-1">
                    Soon
                  </Badge>
                </span>
              ) : (
                <Link href={`/clients/${clientId}${tab.href}`}>{tab.label}</Link>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Page content */}
      {children}
    </div>
  )
}

function ClientHeaderSkeleton() {
  return (
    <div className="space-y-3 flex-1">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  )
}
