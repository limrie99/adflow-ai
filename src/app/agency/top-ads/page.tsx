'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface TopAd {
  id: string
  rank: number
  advertiser_name: string
  headline: string
  body_text: string
  cta: string
  platforms: string[]
  media_type: string
  ad_delivery_start: string
  performance_score: number
  run_duration_days: number
  spend_lower: number
  spend_upper: number
  impressions_lower: number
  impressions_upper: number
  source: string
}

const NICHES = [
  { value: 'automotive', label: 'Automotive / Car Dealers' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'home_services', label: 'Home Services' },
  { value: 'medical_dental', label: 'Medical / Dental' },
  { value: 'law', label: 'Law Firms' },
  { value: 'local_services', label: 'Local Services' },
  { value: 'wedding', label: 'Wedding' },
]

export default function TopAdsPage() {
  const [niche, setNiche] = useState('automotive')
  const [ads, setAds] = useState<TopAd[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTopAds = async (selectedNiche: string) => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/top-ads?niche=${selectedNiche}&limit=20`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAds(data.ads || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopAds(niche)
  }, [niche])

  const getSpendLabel = (ad: TopAd) => {
    if (!ad.spend_upper) return null
    if (ad.spend_upper > 10000) return { label: 'High Spend', color: 'text-red-400 bg-red-500/10' }
    if (ad.spend_upper > 5000) return { label: 'Med-High', color: 'text-orange-400 bg-orange-500/10' }
    if (ad.spend_upper > 1000) return { label: 'Medium', color: 'text-yellow-400 bg-yellow-500/10' }
    return { label: 'Low', color: 'text-green-400 bg-green-500/10' }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-black'
    if (rank === 2) return 'bg-gray-300 text-black'
    if (rank === 3) return 'bg-amber-600 text-white'
    return 'bg-white/10 text-white/60'
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">🏆 Best Ads This Week</h1>
            <p className="text-white/50">
              Real ads from Meta Ad Library, ranked by performance. Longer-running ads = proven winners.
            </p>
          </div>
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm"
          >
            {NICHES.map(n => (
              <option key={n.value} value={n.value} className="bg-black">{n.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-white/40">
            <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4" />
            Loading real ads...
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-xl font-semibold mb-2">No ads scraped yet</h2>
            <p className="text-white/50 mb-4">
              Set up your Meta App credentials and run the first scrape to see real ads here.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-w-lg mx-auto text-left text-sm text-white/60">
              <p className="font-semibold text-white mb-2">Quick setup:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to developers.facebook.com → Create App</li>
                <li>Copy your App ID and App Secret</li>
                <li>Add to VPS environment: META_APP_ID, META_APP_SECRET</li>
                <li>Hit <code className="bg-white/10 px-1 rounded">/api/scrape/run?key=YOUR_SECRET</code></li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{ads.length}</div>
                <div className="text-xs text-white/50">Ads Ranked</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{new Set(ads.map(a => a.advertiser_name)).size}</div>
                <div className="text-xs text-white/50">Advertisers</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{ads[0]?.run_duration_days || 0}d</div>
                <div className="text-xs text-white/50">Top Ad Run Time</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{Math.round(ads[0]?.performance_score || 0)}</div>
                <div className="text-xs text-white/50">Top Score</div>
              </div>
            </div>

            {/* Ad cards */}
            {ads.map((ad) => {
              const spend = getSpendLabel(ad)
              return (
                <div key={ad.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Rank badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getRankBadge(ad.rank)}`}>
                      #{ad.rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-lg">{ad.advertiser_name}</span>
                        <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">
                          Real Ad
                        </span>
                        {spend && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${spend.color}`}>
                            {spend.label}
                          </span>
                        )}
                      </div>

                      {/* Headline */}
                      {ad.headline && (
                        <h3 className="font-semibold text-white/90 mb-1">{ad.headline}</h3>
                      )}

                      {/* Body text */}
                      {ad.body_text && (
                        <p className="text-sm text-white/60 mb-3 line-clamp-3">{ad.body_text}</p>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-3 text-xs text-white/40">
                        <span>📅 Running {ad.run_duration_days} days</span>
                        {ad.platforms?.length > 0 && (
                          <span>📱 {ad.platforms.join(', ')}</span>
                        )}
                        {ad.media_type && <span>🎨 {ad.media_type}</span>}
                        {ad.cta && <span>👆 CTA: {ad.cta}</span>}
                        <span>⭐ Score: {ad.performance_score}</span>
                      </div>
                    </div>

                    {/* Performance bar */}
                    <div className="w-20 shrink-0 text-right">
                      <div className="text-2xl font-bold text-white/80">{Math.round(ad.performance_score)}</div>
                      <div className="w-full bg-white/10 rounded-full h-2 mt-1">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                          style={{ width: `${Math.min(ad.performance_score, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Link to playbook */}
        {ads.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href={`/agency/playbook?niche=${niche}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition"
            >
              📋 Generate Full Ad Playbook Report
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
