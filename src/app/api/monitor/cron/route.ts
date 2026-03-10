import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runMonitorCheck } from '@/lib/auto-monitor'

// This endpoint is called by a cron job (or n8n workflow) to check all active monitors
// Call it every hour: GET /api/monitor/cron?key=YOUR_SECRET
export async function GET(req: NextRequest) {
  // Simple auth - check for secret key
  const key = req.nextUrl.searchParams.get('key')
  if (key !== (process.env.CRON_SECRET || 'adflow-cron-2024')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active monitors that are due for a check
  const { data: monitors } = await supabaseAdmin
    .from('website_monitors')
    .select('*')
    .eq('is_active', true)

  if (!monitors || monitors.length === 0) {
    return NextResponse.json({ checked: 0, changes: 0, ads_created: 0 })
  }

  let totalChanges = 0
  let totalAds = 0
  const results = []

  for (const monitor of monitors) {
    // Check if enough time has passed since last check
    const lastChecked = monitor.last_checked_at ? new Date(monitor.last_checked_at) : new Date(0)
    const hoursSince = (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60)

    if (hoursSince < (monitor.check_interval_hours || 1)) {
      continue
    }

    try {
      const result = await runMonitorCheck(monitor.id)
      totalChanges += result.changes.length
      totalAds += result.ads_created
      results.push({
        monitor_id: monitor.id,
        business: monitor.business_name,
        ...result,
      })
    } catch (err) {
      results.push({
        monitor_id: monitor.id,
        business: monitor.business_name,
        error: err instanceof Error ? err.message : 'Check failed',
      })
    }
  }

  return NextResponse.json({
    checked: results.length,
    total_changes: totalChanges,
    total_ads_created: totalAds,
    results,
  })
}
