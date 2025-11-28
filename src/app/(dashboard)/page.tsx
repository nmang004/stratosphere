import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, AlertCircle, Activity, Calendar } from 'lucide-react'
import { MorningBriefing, MorningBriefingSkeleton } from '@/components/dashboard/MorningBriefing'
import { ClientHealthSection } from '@/components/dashboard/ClientHealthSection'
import type { AlertSeverity } from '@/types/database'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

async function getDashboardStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Fetch client count
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Fetch alert counts
  const { data: alertsData } = await supabase
    .from('alerts')
    .select('severity, is_dismissed')
    .eq('is_dismissed', false)

  const alerts = alertsData as { severity: AlertSeverity; is_dismissed: boolean }[] | null
  const criticalCount = alerts?.filter((a) => a.severity === 'CRITICAL').length ?? 0
  const totalAlerts = alerts?.length ?? 0

  // Calculate average health score
  const { data: healthDataRaw } = await supabase
    .from('client_health_history')
    .select('health_score, client_id')
    .order('recorded_date', { ascending: false })

  const healthData = healthDataRaw as { health_score: number | null; client_id: string }[] | null

  // Get latest health score per client
  const latestScores = new Map<string, number>()
  healthData?.forEach((h) => {
    if (!latestScores.has(h.client_id) && h.health_score !== null) {
      latestScores.set(h.client_id, h.health_score)
    }
  })

  const avgHealthScore =
    latestScores.size > 0
      ? Math.round(
          Array.from(latestScores.values()).reduce((a, b) => a + b, 0) /
            latestScores.size
        )
      : 0

  return {
    clientCount: clientCount ?? 0,
    criticalCount,
    totalAlerts,
    avgHealthScore,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user profile
  let displayName = 'there'
  if (user) {
    const { data: userProfileData } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    const userProfile = userProfileData as { display_name: string } | null
    displayName = userProfile?.display_name || 'there'
  }

  // Fetch dashboard stats
  const stats = await getDashboardStats(supabase)

  const greeting = getGreeting()

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {greeting}, {displayName}
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your clients today.
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Active Clients</CardDescription>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Critical Alerts</CardDescription>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.criticalCount}
            </div>
            {stats.totalAlerts > stats.criticalCount && (
              <p className="text-xs text-muted-foreground">
                +{stats.totalAlerts - stats.criticalCount} other alerts
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Avg Health Score</CardDescription>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgHealthScore}</div>
            <p className="text-xs text-muted-foreground">across all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>This Week</CardDescription>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">alerts to review</p>
          </CardContent>
        </Card>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Morning Briefing */}
        <Suspense fallback={<MorningBriefingSkeleton />}>
          <MorningBriefing maxAlerts={5} />
        </Suspense>

        {/* Client Health Overview */}
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Health
                </CardTitle>
                <CardDescription>Clients needing attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          }
        >
          <ClientHealthSection />
        </Suspense>
      </div>
    </div>
  )
}
