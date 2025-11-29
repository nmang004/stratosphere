'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useClientDetail } from '@/lib/hooks/useClients'
import { SERPShapeshifter } from '@/components/clients/SERPShapeshifter'

export default function ClientSERPPage() {
  const params = useParams()
  const clientId = params.clientId as string

  const { data: client, isLoading } = useClientDetail(clientId)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Client not found
        </CardContent>
      </Card>
    )
  }

  return (
    <SERPShapeshifter
      clientId={clientId}
      clientName={client.name}
      clientDomain={client.domain}
    />
  )
}
