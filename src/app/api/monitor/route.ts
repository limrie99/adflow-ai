import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { checkWebsiteForChanges, runMonitorCheck } from '@/lib/auto-monitor'

// POST - Create a new monitor
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { business_name, website_url, niche, location, platform, check_interval_hours } = await req.json()

  if (!business_name || !website_url || !niche || !location) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Take initial snapshot
  let initialSnapshot = ''
  try {
    const res = await fetch(website_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdFlowBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const html = await res.text()
      initialSnapshot = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000)
    }
  } catch {
    // Continue without snapshot
  }

  const { data, error } = await supabaseAdmin.from('website_monitors').insert({
    user_id: user.id,
    business_name,
    website_url,
    niche,
    location,
    platform: platform || 'meta',
    check_interval_hours: check_interval_hours || 1,
    is_active: true,
    last_checked_at: new Date().toISOString(),
    last_snapshot: initialSnapshot,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// GET - List user's monitors
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('website_monitors')
    .select('id, business_name, website_url, niche, location, platform, check_interval_hours, is_active, last_checked_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH - Toggle monitor on/off or trigger manual check
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { monitor_id, action } = await req.json()

  if (!monitor_id) {
    return NextResponse.json({ error: 'Monitor ID required' }, { status: 400 })
  }

  // Verify ownership
  const { data: monitor } = await supabaseAdmin
    .from('website_monitors')
    .select('*')
    .eq('id', monitor_id)
    .eq('user_id', user.id)
    .single()

  if (!monitor) {
    return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
  }

  if (action === 'toggle') {
    await supabaseAdmin
      .from('website_monitors')
      .update({ is_active: !monitor.is_active })
      .eq('id', monitor_id)
    return NextResponse.json({ is_active: !monitor.is_active })
  }

  if (action === 'check_now') {
    const result = await runMonitorCheck(monitor_id)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
