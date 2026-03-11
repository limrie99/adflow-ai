import { ScrapedAd } from './types'

export function calculatePerformanceScore(ad: ScrapedAd): number {
  let score = 0

  // Signal 1: Run Duration (40% weight)
  // Ads running longer are likely profitable
  const startDate = ad.ad_delivery_start ? new Date(ad.ad_delivery_start) : null
  const endDate = ad.ad_delivery_stop ? new Date(ad.ad_delivery_stop) : new Date()

  if (startDate) {
    const runDays = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const cappedDays = Math.min(runDays, 180) // Cap at 180 days
    score += (cappedDays / 180) * 100 * 0.4
  }

  // Signal 2: Impressions/Reach (30% weight)
  if (ad.impressions_upper && ad.impressions_upper > 0) {
    const midpoint = ad.impressions_lower
      ? (ad.impressions_lower + ad.impressions_upper) / 2
      : ad.impressions_upper
    score += (Math.log10(midpoint + 1) / 7) * 100 * 0.3
  } else if (startDate) {
    // If no impressions data, redistribute weight to run duration
    const runDays = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const cappedDays = Math.min(runDays, 180)
    score += (cappedDays / 180) * 100 * 0.15 // Half the weight
  }

  // Signal 3: Spend Level (20% weight)
  if (ad.spend_upper) {
    let spendScore = 5
    if (ad.spend_upper > 10000) spendScore = 20
    else if (ad.spend_upper > 5000) spendScore = 15
    else if (ad.spend_upper > 1000) spendScore = 10
    score += spendScore * 0.2
  }

  // Signal 4: Platform Breadth (10% weight)
  // Multi-platform = more confident in ad's performance
  const platformCount = ad.platforms?.length || 1
  score += (Math.min(platformCount, 4) / 4) * 100 * 0.1

  return Math.round(score * 100) / 100
}

export function getRunDurationDays(ad: ScrapedAd): number {
  if (!ad.ad_delivery_start) return 0
  const start = new Date(ad.ad_delivery_start)
  const end = ad.ad_delivery_stop ? new Date(ad.ad_delivery_stop) : new Date()
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

export function getSpendLevel(ad: ScrapedAd): string {
  if (!ad.spend_upper) return 'unknown'
  if (ad.spend_upper > 10000) return 'high'
  if (ad.spend_upper > 5000) return 'medium-high'
  if (ad.spend_upper > 1000) return 'medium'
  return 'low'
}

export function getCurrentWeekMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}
