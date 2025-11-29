import { createClient } from '@/lib/supabase/server'

/**
 * Assigns all active clients to a user (for development/testing)
 * This is called automatically in dev mode if a user has no client assignments
 */
export async function assignAllClientsToUser(userId: string) {
  const supabase = await createClient()

  // Call the database function we created
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('assign_all_clients_to_user', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error assigning clients:', error)
    return 0
  }

  return data as number
}

/**
 * Check if user has any client assignments, if not assign all clients (dev mode)
 */
export async function ensureClientAssignments(userId: string) {
  const supabase = await createClient()

  // Check if user has any assignments
  const { count } = await supabase
    .from('user_client_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('ended_at', null)

  if (count === 0) {
    console.log('No client assignments found, assigning all clients...')
    const assigned = await assignAllClientsToUser(userId)
    console.log(`Assigned ${assigned} clients to user`)
    return assigned
  }

  return count
}
