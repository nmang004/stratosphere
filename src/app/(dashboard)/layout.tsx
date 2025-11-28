import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopNav } from '@/components/dashboard/TopNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  // If not authenticated, redirect to login (backup to middleware)
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If no profile, redirect to onboarding
  if (!userProfile) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile */}
      <Sidebar user={userProfile} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Top navigation */}
        <TopNav user={userProfile} />

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
