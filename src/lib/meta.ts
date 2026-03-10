import type { AdCopy, Targeting } from '@/types'

const META_API_VERSION = 'v21.0'
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

interface MetaApiError {
  error: { message: string; code: number }
}

async function metaFetch<T>(
  endpoint: string,
  accessToken: string,
  options?: { method?: string; body?: Record<string, unknown> }
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json()
  if ((data as MetaApiError).error) {
    throw new Error((data as MetaApiError).error.message)
  }
  return data as T
}

export async function createMetaCampaign(
  adAccountId: string,
  accessToken: string,
  name: string,
  niche: string
): Promise<string> {
  const data = await metaFetch<{ id: string }>(
    `/act_${adAccountId}/campaigns`,
    accessToken,
    {
      method: 'POST',
      body: {
        name,
        objective: 'LEAD_GENERATION',
        status: 'PAUSED',
        special_ad_categories: niche === 'real_estate' ? ['HOUSING'] : ['EMPLOYMENT'],
      },
    }
  )
  return data.id
}

export async function createMetaAdSet(
  adAccountId: string,
  accessToken: string,
  campaignId: string,
  targeting: Targeting,
  name: string
): Promise<string> {
  const data = await metaFetch<{ id: string }>(
    `/act_${adAccountId}/adsets`,
    accessToken,
    {
      method: 'POST',
      body: {
        name,
        campaign_id: campaignId,
        optimization_goal: 'LEAD_GENERATION',
        billing_event: 'IMPRESSIONS',
        bid_amount: 500,
        daily_budget: targeting.budget_daily * 100, // cents
        targeting: {
          geo_locations: {
            custom_locations: [
              {
                address_string: targeting.location,
                radius: targeting.radius_miles,
                distance_unit: 'mile',
              },
            ],
          },
          age_min: targeting.age_min,
          age_max: targeting.age_max,
          interests: targeting.interests.map((i) => ({ name: i })),
        },
        status: 'PAUSED',
      },
    }
  )
  return data.id
}

export async function createMetaAd(
  adAccountId: string,
  accessToken: string,
  adSetId: string,
  adCopy: AdCopy,
  pageId: string,
  name: string
): Promise<string> {
  // Create ad creative
  const creative = await metaFetch<{ id: string }>(
    `/act_${adAccountId}/adcreatives`,
    accessToken,
    {
      method: 'POST',
      body: {
        name: `${name} Creative`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            message: adCopy.primary_text,
            link: 'https://your-landing-page.com', // replaced during onboarding
            name: adCopy.headline,
            description: adCopy.description,
            call_to_action: {
              type: 'LEARN_MORE',
              value: { lead_gen_form_id: null },
            },
          },
        },
      },
    }
  )

  // Create the ad
  const ad = await metaFetch<{ id: string }>(
    `/act_${adAccountId}/ads`,
    accessToken,
    {
      method: 'POST',
      body: {
        name,
        adset_id: adSetId,
        creative: { creative_id: creative.id },
        status: 'PAUSED',
      },
    }
  )

  return ad.id
}

export async function getMetaCampaignInsights(
  campaignId: string,
  accessToken: string
): Promise<{ impressions: number; clicks: number; spend: number }> {
  const data = await metaFetch<{
    data: Array<{ impressions: string; clicks: string; spend: string }>
  }>(`/${campaignId}/insights?fields=impressions,clicks,spend`, accessToken)

  if (!data.data?.length) return { impressions: 0, clicks: 0, spend: 0 }

  const row = data.data[0]
  return {
    impressions: parseInt(row.impressions ?? '0'),
    clicks: parseInt(row.clicks ?? '0'),
    spend: parseFloat(row.spend ?? '0'),
  }
}
