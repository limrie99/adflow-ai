import { supabaseAdmin } from './supabase'

export const CREDIT_COSTS = {
  ad_generated: 1,
  ad_deployed: 5,
  lead_outreach: 2,
} as const

export type UsageAction = keyof typeof CREDIT_COSTS

export async function getCredits(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single()
  return data?.credits ?? 0
}

export async function deductCredits(userId: string, action: UsageAction): Promise<{ ok: boolean; message?: string }> {
  const cost = CREDIT_COSTS[action]
  const balance = await getCredits(userId)

  if (balance < cost) {
    return { ok: false, message: `Insufficient credits. Need ${cost}, have ${balance}.` }
  }

  await supabaseAdmin
    .from('user_credits')
    .update({ credits: balance - cost, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  await supabaseAdmin.from('usage_records').insert({
    user_id: userId,
    action,
    credits_used: cost,
  })

  return { ok: true }
}

export async function trackUsage(userId: string, action: UsageAction) {
  const credits = CREDIT_COSTS[action]

  await supabaseAdmin.from('usage_records').insert({
    user_id: userId,
    action,
    credits_used: credits,
  })

  return credits
}

export async function getUsageThisMonth(userId: string) {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const { data } = await supabaseAdmin
    .from('usage_records')
    .select('action, credits_used')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())

  const total = data?.reduce((sum, r) => sum + r.credits_used, 0) ?? 0
  const breakdown = {
    ad_generated: 0,
    ad_deployed: 0,
    lead_outreach: 0,
  }

  data?.forEach((r) => {
    breakdown[r.action as UsageAction] += r.credits_used
  })

  return { total, breakdown }
}
