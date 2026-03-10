export type Niche = 'real_estate' | 'law'

export type AdPlatform = 'meta' | 'google'

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'

export type OutreachStatus = 'pending' | 'sent' | 'replied' | 'converted'

export interface Business {
  id: string
  user_id: string
  name: string
  niche: Niche
  location: string
  website?: string
  phone?: string
  meta_access_token?: string
  meta_ad_account_id?: string
  google_customer_id?: string
  created_at: string
}

export interface Campaign {
  id: string
  business_id: string
  user_id: string
  name: string
  niche: Niche
  platform: AdPlatform
  status: CampaignStatus
  ad_copy: AdCopy
  targeting: Targeting
  meta_campaign_id?: string
  google_campaign_id?: string
  impressions: number
  clicks: number
  leads: number
  spend: number
  created_at: string
  updated_at: string
}

export interface AdCopy {
  headline: string
  primary_text: string
  description: string
  call_to_action: string
  image_prompt?: string
}

export interface Targeting {
  location: string
  radius_miles: number
  age_min: number
  age_max: number
  interests: string[]
  budget_daily: number
}

export interface Lead {
  id: string
  business_id: string
  user_id: string
  name?: string
  email?: string
  instagram_handle?: string
  platform: string
  status: OutreachStatus
  message_sent?: string
  replied_at?: string
  created_at: string
}

export interface UsageRecord {
  id: string
  user_id: string
  action: 'ad_generated' | 'ad_deployed' | 'lead_outreach'
  credits_used: number
  created_at: string
}

export interface GenerateAdRequest {
  niche: Niche
  business_name: string
  location: string
  platform: AdPlatform
  offer?: string
  unique_value?: string
}

export interface GenerateAdResponse {
  ads: AdCopy[]
  strategy_notes: string
}
