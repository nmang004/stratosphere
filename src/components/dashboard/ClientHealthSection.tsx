'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClientHealthCard, ClientHealthCardSkeleton } from './ClientHealthCard'
import { useClientsWithHealth } from '@/lib/hooks/useClients'
import { Users, ArrowRight } from 'lucide-react'

interface ClientHealthSectionProps {
  maxClients?: number
}

export function ClientHealthSection({ maxClients = 5 }: ClientHealthSectionProps) {
  const { data: clients, isLoading, error } = useClientsWithHealth()

  // Sort by health score (lowest first) to show clients needing attention
  const sortedClients = clients
    ?.slice()
    .sort((a, b) => {
      const aScore = a.latest_health?.health_score ?? 100
      const bScore = b.latest_health?.health_score ?? 100
      return aScore - bScore
    })
    .slice(0, maxClients)

  const hasMoreClients = (clients?.length ?? 0) > maxClients

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Health
          </CardTitle>
          <CardDescription>Clients needing attention</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load clients. Please try refreshing the page.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Health
            </CardTitle>
            <CardDescription>Clients needing attention</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients" className="flex items-center gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <ClientHealthCardSkeleton />
            <ClientHealthCardSkeleton />
            <ClientHealthCardSkeleton />
          </>
        ) : !sortedClients || sortedClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">No clients yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add clients to start tracking their health.
            </p>
          </div>
        ) : (
          sortedClients.map((client) => (
            <ClientHealthCard key={client.id} client={client} />
          ))
        )}

        {hasMoreClients && sortedClients && sortedClients.length > 0 && (
          <div className="pt-2 border-t">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/clients" className="flex items-center gap-2">
                View all {clients?.length} clients
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
