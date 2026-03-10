import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface MonitorConfig {
  id?: string
  user_id: string
  business_name: string
  website_url: string
  niche: string
  location: string
  platform: 'meta' | 'google'
  check_interval_hours: number
  is_active: boolean
  last_checked_at?: string
  last_snapshot?: string
  created_at?: string
}

export interface WebsiteChange {
  type: 'new_inventory' | 'price_change' | 'new_service' | 'new_promotion' | 'content_update'
  description: string
  details: string
  suggested_ad: {
    headline: string
    primary_text: string
    description: string
    call_to_action: string
    image_prompt: string
  }
}

export async function checkWebsiteForChanges(
  config: MonitorConfig
): Promise<{ has_changes: boolean; changes: WebsiteChange[] }> {
  // Fetch current website content
  const res = await fetch(config.website_url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdFlowBot/1.0)' },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)

  const html = await res.text()
  const currentText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000)

  // If no previous snapshot, save this one and return no changes
  if (!config.last_snapshot) {
    return { has_changes: false, changes: [] }
  }

  // Compare with Claude
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are a business intelligence monitor. Compare these two snapshots of the same website and identify meaningful changes that should trigger new ads.

Business: ${config.business_name}
Industry: ${config.niche}
Location: ${config.location}

PREVIOUS SNAPSHOT:
${config.last_snapshot.slice(0, 5000)}

CURRENT SNAPSHOT:
${currentText.slice(0, 5000)}

Look for:
- New products/inventory listings (new vehicles, new services, new menu items)
- Price changes (sales, discounts, new pricing)
- New services added
- New promotions or seasonal offers
- Significant content updates

If there are meaningful changes, return JSON:
{
  "has_changes": true,
  "changes": [
    {
      "type": "new_inventory|price_change|new_service|new_promotion|content_update",
      "description": "brief description of the change",
      "details": "specific details - actual prices, product names, etc.",
      "suggested_ad": {
        "headline": "ad headline using the new info (max 60 chars)",
        "primary_text": "compelling ad copy referencing the change, 2-3 sentences",
        "description": "supporting detail, 1-2 sentences",
        "call_to_action": "CTA button text",
        "image_prompt": "image generation prompt for this ad"
      }
    }
  ]
}

If no meaningful changes, return:
{"has_changes": false, "changes": []}

Only flag REAL changes that would justify creating a new ad. Ignore minor text tweaks or layout changes.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found')

  const result = JSON.parse(jsonMatch[0]) as { has_changes: boolean; changes: WebsiteChange[] }

  return { ...result, _currentSnapshot: currentText } as typeof result & { _currentSnapshot: string }
}

export async function runMonitorCheck(monitorId: string): Promise<{
  has_changes: boolean
  changes: WebsiteChange[]
  ads_created: number
}> {
  // Get monitor config from DB
  const { data: monitor } = await supabaseAdmin
    .from('website_monitors')
    .select('*')
    .eq('id', monitorId)
    .single()

  if (!monitor || !monitor.is_active) {
    return { has_changes: false, changes: [], ads_created: 0 }
  }

  const result = await checkWebsiteForChanges(monitor as MonitorConfig)

  // Update last checked time and snapshot
  const currentSnapshot = (result as unknown as { _currentSnapshot: string })._currentSnapshot
  await supabaseAdmin
    .from('website_monitors')
    .update({
      last_checked_at: new Date().toISOString(),
      last_snapshot: currentSnapshot || monitor.last_snapshot,
    })
    .eq('id', monitorId)

  // Auto-create campaigns for each change
  let adsCreated = 0
  if (result.has_changes) {
    for (const change of result.changes) {
      // Map niche string to valid enum
      const nicheMap: Record<string, string> = {
        automotive: 'automotive', car_dealership: 'automotive',
        real_estate: 'real_estate', home_services: 'home_services',
        medical_dental: 'medical_dental', law: 'law',
        local_services: 'local_services', wedding: 'wedding',
      }
      const niche = nicheMap[monitor.niche] || 'local_services'

      await supabaseAdmin.from('campaigns').insert({
        user_id: monitor.user_id,
        name: `[Auto] ${monitor.business_name} - ${change.type} - ${new Date().toLocaleDateString()}`,
        niche,
        platform: monitor.platform,
        status: 'draft',
        ad_copy: change.suggested_ad,
        targeting: {
          location: monitor.location,
          radius_miles: 25,
          age_min: 25,
          age_max: 65,
          interests: [],
          budget_daily: 20,
        },
        impressions: 0,
        clicks: 0,
        leads: 0,
        spend: 0,
      })
      adsCreated++
    }
  }

  return { has_changes: result.has_changes, changes: result.changes, ads_created: adsCreated }
}
