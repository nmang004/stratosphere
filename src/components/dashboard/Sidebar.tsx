'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Home,
  Users,
  AlertTriangle,
  FileText,
  Settings,
} from 'lucide-react'
import type { UserProfile } from '@/types/database'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: Home, path: '/' },
  { label: 'Clients', icon: Users, path: '/clients' },
  { label: 'Triage', icon: AlertTriangle, path: '/triage' },
  { label: 'Reports', icon: FileText, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

interface SidebarProps {
  user: UserProfile
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-sidebar-background">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="px-4 py-6 border-b">
          <h1 className="text-xl font-bold text-sidebar-foreground">Stratosphere</h1>
          <p className="text-xs text-sidebar-foreground/60">Strategy from above.</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                isActive(item.path) && 'bg-sidebar-accent text-sidebar-foreground font-medium'
              )}
              asChild
            >
              <Link href={item.path}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">
                {user.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.display_name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

// Mobile sidebar content (used in Sheet)
export function SidebarContent({ user }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-6 border-b">
        <h1 className="text-xl font-bold">Stratosphere</h1>
        <p className="text-xs text-muted-foreground">Strategy from above.</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3',
              isActive(item.path) && 'bg-accent font-medium'
            )}
            asChild
          >
            <Link href={item.path}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
            <span className="text-sm font-medium">
              {user.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.display_name}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
