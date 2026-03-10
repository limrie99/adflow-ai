import { NextRequest, NextResponse } from 'next/server'
import { createMetaCampaign, createMetaAdSet, createMetaAd } from '@/lib/meta'
import { trackUsage } from '@/lib/usage'
import { supabase } from '@/lib/supabase'

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

  const { campaign_id } = await req.json()
  if (!campaign_id) {
    return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
  }

  // Fetch campaign + business
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, businesses(*)')
    .eq('id', campaign_id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const business = campaign.businesses
  if (!business?.meta_access_token || !business?.meta_ad_account_id) {
    return NextResponse.json({ error: 'Meta account not connected' }, { status: 400 })
  }

  const { meta_access_token, meta_ad_account_id } = business

  // Deploy to Meta
  const metaCampaignId = await createMetaCampaign(
    meta_ad_account_id,
    meta_access_token,
    campaign.name,
    campaign.niche
  )

  const adSetId = await createMetaAdSet(
    meta_ad_account_id,
    meta_access_token,
    metaCampaignId,
    campaign.targeting,
    `${campaign.name} - Ad Set`
  )

  await createMetaAd(
    meta_ad_account_id,
    meta_access_token,
    adSetId,
    campaign.ad_copy,
    business.meta_page_id ?? '',
    `${campaign.name} - Ad`
  )

  // Update campaign record
  await supabase
    .from('campaigns')
    .update({ meta_campaign_id: metaCampaignId, status: 'active' })
    .eq('id', campaign_id)

  await trackUsage(user.id, 'ad_deployed')

  return NextResponse.json({ success: true, meta_campaign_id: metaCampaignId })
}
