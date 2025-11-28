'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { AccountManagerStyle, DefaultView } from '@/types/database'

const ACCOUNT_MANAGER_STYLES: { value: AccountManagerStyle; label: string; description: string }[] = [
  {
    value: 'SUCCINCT',
    label: 'Brief & Direct',
    description: 'Short, actionable insights',
  },
  {
    value: 'COLLABORATIVE',
    label: 'Collaborative',
    description: 'Detailed context with discussion points',
  },
  {
    value: 'EXECUTIVE',
    label: 'Executive Summary',
    description: 'High-level strategic overview',
  },
]

const DEFAULT_VIEWS: { value: DefaultView; label: string }[] = [
  { value: 'TRIAGE', label: 'Alert Triage' },
  { value: 'CALENDAR', label: 'Calendar' },
  { value: 'CLIENT_LIST', label: 'Client List' },
]

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('')
  const [accountManagerStyle, setAccountManagerStyle] = useState<AccountManagerStyle>('COLLABORATIVE')
  const [defaultView, setDefaultView] = useState<DefaultView>('TRIAGE')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (displayName.trim().length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }

    setIsLoading(true)

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Not authenticated. Please sign in again.')
      router.push('/login')
      return
    }

    // Create the user profile
    const profileData = {
      id: user.id,
      display_name: displayName.trim(),
      account_manager_style: accountManagerStyle,
      default_view: defaultView,
      notification_preferences: {},
    }

    const { error } = await supabase
      .from('user_profiles')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(profileData as any)

    setIsLoading(false)

    if (error) {
      console.error('Profile creation error:', error)
      toast.error('Failed to create profile. Please try again.')
      return
    }

    toast.success('Welcome to Stratosphere!')
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Stratosphere</CardTitle>
          <CardDescription>
            Let&apos;s set up your profile to personalize your experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountManagerStyle">Communication Style</Label>
              <Select
                value={accountManagerStyle}
                onValueChange={(value) => setAccountManagerStyle(value as AccountManagerStyle)}
                disabled={isLoading}
              >
                <SelectTrigger id="accountManagerStyle" className="w-full">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_MANAGER_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      <div className="flex flex-col">
                        <span>{style.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {style.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This determines how AI-generated content is styled for you.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultView">Default Dashboard View</Label>
              <Select
                value={defaultView}
                onValueChange={(value) => setDefaultView(value as DefaultView)}
                disabled={isLoading}
              >
                <SelectTrigger id="defaultView" className="w-full">
                  <SelectValue placeholder="Select a view" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_VIEWS.map((view) => (
                    <SelectItem key={view.value} value={view.value}>
                      {view.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The view you&apos;ll see when you first open the dashboard.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
