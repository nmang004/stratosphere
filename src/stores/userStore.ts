import { create } from 'zustand'
import { getClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/database'

interface UserState {
  user: UserProfile | null
  isLoading: boolean
  setUser: (user: UserProfile | null) => void
  clearUser: () => void
  fetchUser: () => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),

  clearUser: () => set({ user: null, isLoading: false }),

  fetchUser: async () => {
    set({ isLoading: true })
    const supabase = getClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      set({ user: null, isLoading: false })
      return
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    set({ user: profile, isLoading: false })
  }
}))
