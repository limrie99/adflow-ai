export interface ScrapedAd {
  external_id?: string
  advertiser_name: string
  niche: string
  location_query: string
  country_code: string
  headline?: string
  body_text?: string
  cta?: string
  platforms: string[]
  media_type?: string
  ad_delivery_start?: string // ISO date
  ad_delivery_stop?: string | null
  is_active: boolean
  spend_lower?: number
  spend_upper?: number
  impressions_lower?: number
  impressions_upper?: number
  raw_data: Record<string, unknown>
  source: 'api' | 'scrape'
}

export interface ScrapeRunConfig {
  niche: string
  location: string
  countryCode: string
  searchTerms: string[]
}

export interface ScrapeRunResult {
  ads_found: number
  ads_new: number
  ads_updated: number
}

export interface RankedAd extends ScrapedAd {
  id: string
  performance_score: number
  run_duration_days: number
  week_of: string
  scraped_at: string
}

export interface PlaybookData {
  niche: string
  location: string
  generated_at: string
  total_ads_analyzed: number
  total_advertisers: number
  top_brands: string[]
  stats: {
    most_common_price_anchor: string
    urgency_usage_percent: number
    avg_run_duration_days: number
    top_platform: string
  }
  pattern_analysis: {
    hooks: string[]
    offers: string[]
    ctas: string[]
    formats: string[]
    urgency_tactics: string[]
  }
  top_ads: {
    rank: number
    advertiser: string
    headline: string
    body_text: string
    cta: string
    platforms: string[]
    media_type: string
    run_days: number
    spend_level: string
    performance_score: number
    targeting_suggestion: string
    placement_suggestion: string
    daily_budget_suggestion: string
    ab_variant: {
      headline: string
      body_text: string
    }
  }[]
  executive_summary: string
  recommendations: string[]
}
