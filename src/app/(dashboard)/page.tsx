import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Users } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user profile (user is guaranteed by layout, but TypeScript needs the check)
  let displayName = 'there'
  if (user) {
    const result = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userProfile = (result as any).data as { display_name: string } | null
    displayName = userProfile?.display_name || 'there'
  }

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, {displayName}
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your clients today.
        </p>
      </div>

      {/* Content grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Morning Briefing placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Morning Briefing
            </CardTitle>
            <CardDescription>
              AI-powered summary of your day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Coming soon in Phase 2
              </p>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Clients placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Clients
            </CardTitle>
            <CardDescription>
              Overview of client health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Coming soon in Phase 3
              </p>
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats placeholder */}
      <div className="grid gap-4 md:grid-cols-4">
        {['Active Clients', 'Critical Alerts', 'Pending Tasks', 'This Week'].map((title) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardDescription>{title}</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
