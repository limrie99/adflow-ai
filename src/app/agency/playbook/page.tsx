'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface PlaybookAd {
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
}

interface PlaybookInsights {
  executive_summary: string
  total_analyzed: number
  total_advertisers: number
  patterns: {
    top_hooks: string[]
    top_offers: string[]
    top_ctas: string[]
    urgency_tactics: string[]
    avg_run_days: number
  }
  recommendations: string[]
  ad_breakdowns: {
    advertiser: string
    headline: string
    body_text: string
    targeting_suggestion: string
    placement_suggestion: string
    daily_budget_suggestion: string
    ab_variant_headline: string
    ab_variant_body: string
  }[]
}

const NICHES: Record<string, string> = {
  automotive: 'Car Dealership',
  real_estate: 'Real Estate',
  home_services: 'Home Services',
  medical_dental: 'Medical / Dental',
  law: 'Law Firm',
  local_services: 'Local Services',
  wedding: 'Wedding',
}

function PlaybookContent() {
  const searchParams = useSearchParams()
  const initialNiche = searchParams.get('niche') || 'automotive'

  const [niche, setNiche] = useState(initialNiche)
  const [ads, setAds] = useState<PlaybookAd[]>([])
  const [insights, setInsights] = useState<PlaybookInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const fetchAds = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/top-ads?niche=${niche}&limit=30`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAds(data.ads || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = async () => {
    if (ads.length === 0) return
    setGenerating(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Send ads to Ad Spy endpoint for Claude analysis
      const res = await fetch('/api/ad-spy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          niche,
          location: '',
          real_ads: ads.slice(0, 20),
          playbook_mode: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Map the ad spy response to playbook insights
      const uniqueAdvertisers = new Set(ads.map(a => a.advertiser_name))
      const avgRunDays = ads.reduce((s, a) => s + (a.run_duration_days || 0), 0) / ads.length

      setInsights({
        executive_summary: data.strategy_deck?.executive_summary || 'Analysis of active Meta ads in this niche.',
        total_analyzed: ads.length,
        total_advertisers: uniqueAdvertisers.size,
        patterns: {
          top_hooks: data.pattern_analysis?.most_common_hooks?.slice(0, 6) || [],
          top_offers: data.pattern_analysis?.most_common_offers?.slice(0, 6) || [],
          top_ctas: data.pattern_analysis?.most_common_ctas?.slice(0, 6) || [],
          urgency_tactics: data.pattern_analysis?.urgency_patterns?.slice(0, 5) || [],
          avg_run_days: Math.round(avgRunDays),
        },
        recommendations: data.strategy_deck?.top_performing_tactics?.map(
          (t: { tactic: string; how_to_implement: string }) => `${t.tactic}: ${t.how_to_implement}`
        ) || [],
        ad_breakdowns: data.competitor_ads?.slice(0, 10).map(
          (a: Record<string, string>) => ({
            advertiser: a.advertiser || '',
            headline: a.headline || '',
            body_text: a.body_text || '',
            targeting_suggestion: `25mi radius | ${niche} intenders`,
            placement_suggestion: 'FB Feed, IG Feed, Stories',
            daily_budget_suggestion: '$15/day (suggested)',
            ab_variant_headline: `Variant: ${a.headline?.substring(0, 40) || 'Test'}...`,
            ab_variant_body: a.body_text?.substring(0, 100) || '',
          })
        ) || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    fetchAds()
  }, [niche])

  const nicheLabel = NICHES[niche] || niche
  const today = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10 print:hidden">
        <Link href="/dashboard" className="text-lg font-bold">AdFlow AI</Link>
        <div className="flex items-center gap-3">
          <Link href="/agency" className="text-xs text-white/50 hover:text-white">Workflow</Link>
          <Link href="/agency/top-ads" className="text-xs text-white/50 hover:text-white">Top Ads</Link>
          <Link href="/agency/spy" className="text-xs text-white/50 hover:text-white">Ad Spy</Link>
          <span className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full font-medium">
            📋 Playbook
          </span>
        </div>
      </nav>

      {/* Report header — styled like the video */}
      <div className="bg-gradient-to-b from-slate-900 to-black py-16 px-8 text-center border-b border-white/10">
        <p className="text-blue-400 text-xs uppercase tracking-[0.3em] font-semibold mb-4">
          AdFlow Research Intelligence
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          Local {nicheLabel}<br />Meta Ad Playbook
        </h1>
        <p className="text-white/50 max-w-xl mx-auto mb-8">
          A comprehensive analysis of active Facebook &amp; Instagram ad tactics —
          revealing the exact patterns, copy formulas, and offer structures that dominate the market.
        </p>
        <div className="flex items-center justify-center gap-8 text-xs text-white/40">
          <span>📊 {ads.length}+ Ads Analyzed</span>
          <span>🏢 {new Set(ads.map(a => a.advertiser_name)).size} Advertisers</span>
          <span>📅 {today}</span>
        </div>

        {/* Niche selector + generate */}
        <div className="flex items-center justify-center gap-3 mt-8 print:hidden">
          <select
            value={niche}
            onChange={(e) => { setNiche(e.target.value); setInsights(null) }}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm"
          >
            {Object.entries(NICHES).map(([val, label]) => (
              <option key={val} value={val} className="bg-black">{label}</option>
            ))}
          </select>
          <button
            onClick={generateInsights}
            disabled={generating || ads.length === 0}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition"
          >
            {generating ? 'Generating...' : '✨ Generate Playbook'}
          </button>
          {insights && (
            <button
              onClick={() => window.print()}
              className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition"
            >
              🖨️ Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-8 mt-6">
          <div className="border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        </div>
      )}

      {loading && (
        <div className="text-center py-20 text-white/40">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          Loading ad data...
        </div>
      )}

      {/* Stats cards */}
      {ads.length > 0 && !loading && (
        <div className="max-w-4xl mx-auto px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-3xl font-bold">{ads.length}+</div>
              <div className="text-xs text-white/50 mt-1">Individual Ads Scanned</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-3xl font-bold">{new Set(ads.map(a => a.advertiser_name)).size}</div>
              <div className="text-xs text-white/50 mt-1">Brands Represented</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-3xl font-bold">{Math.round(ads.reduce((s, a) => s + (a.run_duration_days || 0), 0) / Math.max(ads.length, 1))}d</div>
              <div className="text-xs text-white/50 mt-1">Avg. Ad Run Time</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-3xl font-bold">{Math.round(ads[0]?.performance_score || 0)}</div>
              <div className="text-xs text-white/50 mt-1">Top Performance Score</div>
            </div>
          </div>

          {/* If no insights yet, show ad list preview */}
          {!insights && !generating && (
            <div>
              <h2 className="text-xl font-bold mb-4">Preview: Top Ads Found</h2>
              <div className="space-y-3 mb-8">
                {ads.slice(0, 5).map((ad, i) => (
                  <div key={ad.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-yellow-500">#{i + 1}</span>
                      <span className="font-semibold">{ad.advertiser_name}</span>
                      <span className="text-xs text-white/40">Running {ad.run_duration_days}d</span>
                    </div>
                    {ad.headline && <p className="text-sm font-semibold text-white/80">{ad.headline}</p>}
                    {ad.body_text && <p className="text-sm text-white/50 line-clamp-2">{ad.body_text}</p>}
                  </div>
                ))}
              </div>
              <p className="text-center text-white/40 text-sm">
                Click &quot;Generate Playbook&quot; above to get the full analysis with patterns, tactics, and ad breakdowns.
              </p>
            </div>
          )}

          {generating && (
            <div className="text-center py-16 text-white/40">
              <div className="animate-spin w-8 h-8 border-2 border-purple-400/40 border-t-purple-400 rounded-full mx-auto mb-4" />
              <p className="font-semibold text-white/60">Generating your Ad Playbook...</p>
              <p className="text-sm">Analyzing {ads.length} real ads with AI</p>
            </div>
          )}

          {/* Full playbook report */}
          {insights && (
            <div className="space-y-12">
              {/* Executive Summary */}
              <section>
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-2">Section 01</h2>
                <h3 className="text-2xl font-bold mb-4">Executive Summary</h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{insights.executive_summary}</p>
                </div>
              </section>

              {/* Pattern Analysis */}
              <section>
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-2">Section 02</h2>
                <h3 className="text-2xl font-bold mb-4">Pattern Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="font-semibold text-blue-400 mb-3">🎯 Top Hooks</h4>
                    <ul className="space-y-2">
                      {insights.patterns.top_hooks.map((h, i) => (
                        <li key={i} className="text-sm text-white/60 flex gap-2">
                          <span className="text-white/30">{i + 1}.</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="font-semibold text-green-400 mb-3">💰 Top Offers</h4>
                    <ul className="space-y-2">
                      {insights.patterns.top_offers.map((o, i) => (
                        <li key={i} className="text-sm text-white/60 flex gap-2">
                          <span className="text-white/30">{i + 1}.</span> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="font-semibold text-purple-400 mb-3">👆 Top CTAs</h4>
                    <ul className="space-y-2">
                      {insights.patterns.top_ctas.map((c, i) => (
                        <li key={i} className="text-sm text-white/60 flex gap-2">
                          <span className="text-white/30">{i + 1}.</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="font-semibold text-red-400 mb-3">⏰ Urgency Tactics</h4>
                    <ul className="space-y-2">
                      {insights.patterns.urgency_tactics.map((u, i) => (
                        <li key={i} className="text-sm text-white/60 flex gap-2">
                          <span className="text-white/30">{i + 1}.</span> {u}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Ad Breakdowns */}
              <section>
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-2">Section 03</h2>
                <h3 className="text-2xl font-bold mb-4">Detailed Ad Breakdowns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {insights.ad_breakdowns.slice(0, 8).map((ad, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      {/* Ad preview header */}
                      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 px-5 py-3 border-b border-white/10">
                        <span className="text-xs font-bold text-blue-300 uppercase">{ad.advertiser}</span>
                      </div>
                      <div className="p-5 space-y-3">
                        <h4 className="font-bold text-white/90">{ad.headline}</h4>
                        <p className="text-sm text-white/60 line-clamp-3">{ad.body_text}</p>

                        {/* Meta details grid */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                          <div>
                            <span className="text-xs text-white/30">Targeting</span>
                            <p className="text-xs text-white/60">{ad.targeting_suggestion}</p>
                          </div>
                          <div>
                            <span className="text-xs text-white/30">Placement</span>
                            <p className="text-xs text-white/60">{ad.placement_suggestion}</p>
                          </div>
                          <div>
                            <span className="text-xs text-white/30">Daily Budget</span>
                            <p className="text-xs text-white/60">{ad.daily_budget_suggestion}</p>
                          </div>
                        </div>

                        {/* A/B variant */}
                        <div className="bg-white/5 rounded-lg p-3 mt-3">
                          <span className="text-xs font-semibold text-white/40 uppercase">A/B Variant Copy</span>
                          <p className="text-sm text-white/70 mt-1 font-semibold">{ad.ab_variant_headline}</p>
                          <p className="text-xs text-white/50 mt-1">{ad.ab_variant_body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <section>
                  <h2 className="text-xs uppercase tracking-widest text-white/30 mb-2">Section 04</h2>
                  <h3 className="text-2xl font-bold mb-4">Top Recommendations</h3>
                  <div className="space-y-3">
                    {insights.recommendations.map((rec, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3">
                        <span className="text-lg">💡</span>
                        <p className="text-sm text-white/70">{rec}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Footer */}
              <div className="text-center py-8 border-t border-white/10 text-xs text-white/20">
                Generated by AdFlow AI — {today}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PlaybookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <PlaybookContent />
    </Suspense>
  )
}
