'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SidebarContent } from './Sidebar'
import { toast } from 'sonner'
import {
  Menu,
  Search,
  Bell,
  LogOut,
  User,
  Loader2,
} from 'lucide-react'
import type { UserProfile } from '@/types/database'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Clients',
  '/triage': 'Triage',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

interface TopNavProps {
  user: UserProfile
}

export function TopNav({ user }: TopNavProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Get page title based on current path
  const getPageTitle = () => {
    // Exact match first
    if (PAGE_TITLES[pathname]) {
      return PAGE_TITLES[pathname]
    }
    // Check for partial matches (for nested routes like /clients/[id])
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (path !== '/' && pathname.startsWith(path)) {
        return title
      }
    }
    return 'Dashboard'
  }

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      setIsLoggingOut(false)
      toast.error('Failed to sign out. Please try again.')
      return
    }

    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* Mobile menu button */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent user={user} />
          </SheetContent>
        </Sheet>

        {/* Page title */}
        <h1 className="text-lg font-semibold">{getPageTitle()}</h1>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search (placeholder) */}
        <div className="hidden sm:block relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-8"
            disabled
          />
        </div>

        {/* Notifications (placeholder) */}
        <Button variant="ghost" size="icon" className="relative" disabled>
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
          {/* Placeholder badge */}
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.display_name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.account_manager_style.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                className="w-full cursor-pointer"
                onClick={() => router.push('/settings')}
              >
                <User className="mr-2 h-4 w-4" />
                Settings
              </button>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isLoggingOut}
              variant="destructive"
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
