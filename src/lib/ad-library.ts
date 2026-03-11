import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface AdLibraryResult {
  ads_found: number
  competitor_ads: {
    advertiser: string
    headline: string
    body_text: string
    cta: string
    platform: string
    status: string
    media_type: string
    estimated_spend: string
    key_tactic: string
  }[]
  pattern_analysis: {
    most_common_hooks: string[]
    most_common_offers: string[]
    most_common_ctas: string[]
    most_common_formats: string[]
    average_copy_length: string
    urgency_patterns: string[]
  }
  strategy_deck: {
    executive_summary: string
    top_performing_tactics: { tactic: string; why_it_works: string; how_to_implement: string }[]
    seasonal_patterns: string[]
    recommended_budget_split: { platform: string; percentage: number; reasoning: string }[]
    content_calendar: { week: string; theme: string; ad_types: string[] }[]
  }
}

export async function scrapeAdLibrary(
  niche: string,
  location: string,
  competitors?: string[],
  realAdContext?: string
): Promise<AdLibraryResult> {
  // Step 1: Try to get real ads (from passed context, or from Meta API)
  let adDataSection = ''

  if (realAdContext && realAdContext.length > 100) {
    // Real ads passed in from scraped_ads database
    adDataSection = `Here are REAL ads currently running in the Meta Ad Library. Analyze ONLY these real ads:\n\n${realAdContext}`
  } else {
    // Try Meta API directly
    const realAds = await fetchMetaAdLibrary(niche, location, competitors)
    if (realAds.length > 0) {
      adDataSection = `Here are real ads scraped from the Meta Ad Library:\n${JSON.stringify(realAds, null, 2)}`
    } else {
      adDataSection = `No live ads could be fetched from the API. Use your deep knowledge of current ${niche} advertising trends to create a realistic competitive analysis.`
    }
  }

  // Step 2: Analyze with Claude
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `You are a world-class paid media analyst. Analyze the competitive ad landscape for ${niche} businesses${location ? ` in ${location}` : ''}.

${adDataSection}

${competitors?.length ? `Key competitors to focus on: ${competitors.join(', ')}` : ''}

Create a comprehensive competitive intelligence report. Analyze at least 15-20 ad patterns.

Return JSON:
{
  "ads_found": 20,
  "competitor_ads": [
    {
      "advertiser": "business name",
      "headline": "actual or representative headline",
      "body_text": "ad body copy",
      "cta": "call to action used",
      "platform": "facebook/instagram",
      "status": "active",
      "media_type": "image/video/carousel",
      "estimated_spend": "low/medium/high based on ad longevity and reach",
      "key_tactic": "the main conversion tactic used"
    }
  ],
  "pattern_analysis": {
    "most_common_hooks": ["opening lines that grab attention - list 8+"],
    "most_common_offers": ["offers being used - list 8+"],
    "most_common_ctas": ["CTAs being used - list 8+"],
    "most_common_formats": ["ad formats - image/video/carousel breakdown"],
    "average_copy_length": "short/medium/long with word count range",
    "urgency_patterns": ["urgency/scarcity tactics used - list 5+"]
  },
  "strategy_deck": {
    "executive_summary": "3-4 paragraph analysis of the competitive landscape, what's working, and gaps/opportunities",
    "top_performing_tactics": [
      {"tactic": "name", "why_it_works": "psychology behind it", "how_to_implement": "step by step"}
    ],
    "seasonal_patterns": ["time-based opportunities"],
    "recommended_budget_split": [
      {"platform": "facebook/instagram/google", "percentage": 50, "reasoning": "why this split"}
    ],
    "content_calendar": [
      {"week": "Week 1", "theme": "launch theme", "ad_types": ["specific ad formats to create"]}
    ]
  }
}

Be extremely specific and actionable. This should read like a $5,000 agency strategy deck.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  return JSON.parse(jsonMatch[0]) as AdLibraryResult
}

async function fetchMetaAdLibrary(
  niche: string,
  location: string,
  competitors?: string[]
): Promise<{ page_name: string; ad_text: string; cta: string }[]> {
  const results: { page_name: string; ad_text: string; cta: string }[] = []

  // Try Meta Ad Library API if credentials exist
  const accessToken = process.env.META_APP_ID && process.env.META_APP_SECRET
    ? await getMetaAccessToken()
    : null

  if (!accessToken) return results

  // Search terms based on niche + competitors
  const searchTerms = competitors?.length
    ? competitors
    : getNicheSearchTerms(niche, location)

  for (const term of searchTerms.slice(0, 5)) {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        search_terms: term,
        ad_type: 'ALL',
        ad_reached_countries: '["US"]',
        ad_active_status: 'ACTIVE',
        fields: 'page_name,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions',
        limit: '10',
      })

      const res = await fetch(
        `https://graph.facebook.com/v19.0/ads_archive?${params}`,
        { signal: AbortSignal.timeout(10000) }
      )

      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          for (const ad of data.data) {
            results.push({
              page_name: ad.page_name || '',
              ad_text: (ad.ad_creative_bodies || []).join(' ') || '',
              cta: (ad.ad_creative_link_titles || []).join(' ') || '',
            })
          }
        }
      }
    } catch {
      // Continue with next search term
    }
  }

  return results
}

async function getMetaAccessToken(): Promise<string | null> {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) return null

  try {
    const res = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&grant_type=client_credentials`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      return data.access_token || null
    }
  } catch {
    // Fall through
  }
  return null
}

function getNicheSearchTerms(niche: string, location: string): string[] {
  const city = location.split(',')[0]?.trim() || location

  const nicheTerms: Record<string, string[]> = {
    automotive: [`${city} car dealership`, `${city} auto dealer`, 'car sale near me', 'new car deals', 'used cars'],
    car_dealership: [`${city} car dealership`, `${city} auto dealer`, 'car sale near me', 'new car deals'],
    real_estate: [`${city} realtor`, `${city} homes for sale`, 'real estate agent', 'home buying'],
    home_services: [`${city} plumber`, `${city} HVAC`, `${city} roofing`, 'home repair near me'],
    medical_dental: [`${city} dentist`, `${city} dental`, 'teeth whitening', 'dental implants'],
    law: [`${city} lawyer`, `${city} attorney`, 'personal injury lawyer', 'legal help'],
    local_services: [`${city} salon`, `${city} gym`, `${city} spa`, 'near me deals'],
    wedding: [`${city} wedding`, 'wedding photographer', 'wedding venue', 'wedding planner'],
  }

  return nicheTerms[niche] || [`${city} ${niche}`, `${niche} near me`, `best ${niche} ${city}`]
}
