import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const redirectTo = searchParams.get('redirectTo') || '/'

  // Log all params for debugging
  console.log('Callback params:', {
    code: code ? 'present' : 'missing',
    error: error_param,
    error_description,
    redirectTo,
  })

  // If there's an error from the OAuth provider
  if (error_param) {
    console.error('OAuth provider error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/login?error=${error_param}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Code exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=code_exchange_failed`)
    }

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('Get user error:', userError.message)
      return NextResponse.redirect(`${origin}/login?error=user_fetch_failed`)
    }

    if (!user) {
      console.error('No user returned after code exchange')
      return NextResponse.redirect(`${origin}/login?error=no_user`)
    }

    console.log('User authenticated:', user.id, user.email)

    // Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new users)
      console.error('Profile fetch error:', profileError.message)
    }

    // If no profile, redirect to onboarding
    if (!profile) {
      console.log('No profile found, redirecting to onboarding')
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    // Profile exists, redirect to intended destination
    console.log('Profile exists, redirecting to:', redirectTo)
    return NextResponse.redirect(`${origin}${redirectTo}`)
  }

  // No code provided, redirect to login with error
  console.error('No code provided in callback')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
