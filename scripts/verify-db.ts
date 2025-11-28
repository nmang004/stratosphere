import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verify() {
  console.log('Verifying Stratosphere database...\n')

  // Check clients
  const { data: clients, error: clientErr } = await supabase
    .from('clients')
    .select('name, domain, risk_score')

  if (clientErr) {
    console.error('Clients error:', clientErr.message)
  } else {
    console.log(`Clients: ${clients?.length} records`)
    clients?.forEach(c => console.log(`  - ${c.name} (${c.domain}) - Health: ${c.risk_score}`))
  }

  // Check alerts
  const { data: alerts, error: alertErr } = await supabase
    .from('alerts')
    .select('severity, signal')
    .limit(5)

  if (alertErr) {
    console.error('Alerts error:', alertErr.message)
  } else {
    console.log(`\nAlerts: ${alerts?.length} records`)
    alerts?.forEach(a => console.log(`  - [${a.severity}] ${a.signal.substring(0, 60)}...`))
  }

  // Check service tiers
  const { data: tiers, error: tierErr } = await supabase
    .from('service_tiers')
    .select('tier_name')

  if (tierErr) {
    console.error('Tiers error:', tierErr.message)
  } else {
    console.log(`\nService Tiers: ${tiers?.map(t => t.tier_name).join(', ')}`)
  }

  // Check calendar events
  const { data: events, error: eventErr } = await supabase
    .from('calendar_events')
    .select('event_name, event_type')
    .limit(3)

  if (eventErr) {
    console.error('Events error:', eventErr.message)
  } else {
    console.log(`\nCalendar Events: ${events?.length} records`)
    events?.forEach(e => console.log(`  - ${e.event_name} [${e.event_type}]`))
  }

  // Check GSC aggregates
  const { count: gscCount, error: gscErr } = await supabase
    .from('gsc_aggregates')
    .select('*', { count: 'exact', head: true })

  if (gscErr) {
    console.error('GSC error:', gscErr.message)
  } else {
    console.log(`\nGSC Aggregates: ${gscCount} records`)
  }

  // Check health history
  const { count: healthCount, error: healthErr } = await supabase
    .from('client_health_history')
    .select('*', { count: 'exact', head: true })

  if (healthErr) {
    console.error('Health error:', healthErr.message)
  } else {
    console.log(`Health History: ${healthCount} records`)
  }

  console.log('\n✅ Database verification complete!')
}

verify().catch(console.error)
