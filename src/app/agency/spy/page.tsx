'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface AdSpyResult {
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

export default function AdSpyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [result, setResult] = useState<AdSpyResult | null>(null)
  const [form, setForm] = useState({ niche: '', location: '', competitors: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/login')
      setToken(session.access_token)
    })
  }, [router])

  const handleSpy = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/ad-spy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          niche: form.niche,
          location: form.location,
          competitors: form.competitors ? form.competitors.split(',').map(c => c.trim()) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spy failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/agency" className="text-lg font-bold">AdFlow AI</Link>
        <span className="text-xs bg-gradient-to-r from-red-500 to-yellow-500 text-white px-3 py-1 rounded-full font-medium">
          Ad Spy
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-10">
        {!result ? (
          <div>
            <h1 className="text-3xl font-bold mb-2">Meta Ad Library Spy</h1>
            <p className="text-white/50 mb-8">
              AI analyzes competitor ads from the Meta Ad Library — hooks, offers, CTAs, formats, and spend patterns.
              Get a full strategy deck like a $5K agency would deliver.
            </p>

            {error && (
              <div className="border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSpy} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Industry / Niche</label>
                <select
                  value={form.niche}
                  onChange={(e) => setForm(f => ({ ...f, niche: e.target.value }))}
                  required
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/60"
                >
                  <option value="">Select niche...</option>
                  <option value="automotive">Automotive / Car Dealerships</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="home_services">Home Services</option>
                  <option value="medical_dental">Medical &amp; Dental</option>
                  <option value="law">Legal Services</option>
                  <option value="local_services">Local Services</option>
                  <option value="wedding">Wedding Services</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Austin, TX or Kansas City, MO"
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  required
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5">Competitor names (optional, comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. McCarthy Auto, Smith Dental, Jones Realty"
                  value={form.competitors}
                  onChange={(e) => setForm(f => ({ ...f, competitors: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-lg font-semibold text-lg hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Analyzing competitor ads...
                  </span>
                ) : (
                  'Run Ad Spy — 1 credit'
                )}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Ad Intelligence Report</h1>
                <p className="text-white/50 mt-1">{result.ads_found} ads analyzed</p>
              </div>
              <button onClick={() => setResult(null)} className="text-sm text-white/40 hover:text-white border border-white/20 px-3 py-1.5 rounded-lg">
                New search
              </button>
            </div>

            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Executive Summary</div>
                <div className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{result.strategy_deck.executive_summary}</div>
              </div>

              {/* Pattern Analysis */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Pattern Analysis</div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-white/40 text-xs mb-2">Most common hooks</div>
                    <ul className="space-y-1">{result.pattern_analysis.most_common_hooks.map((h, i) => (
                      <li key={i} className="text-white/60 text-sm">&bull; {h}</li>
                    ))}</ul>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-2">Most common offers</div>
                    <ul className="space-y-1">{result.pattern_analysis.most_common_offers.map((o, i) => (
                      <li key={i} className="text-white/60 text-sm">&bull; {o}</li>
                    ))}</ul>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-2">Top CTAs</div>
                    <ul className="space-y-1">{result.pattern_analysis.most_common_ctas.map((c, i) => (
                      <li key={i} className="text-white/60 text-sm">&bull; {c}</li>
                    ))}</ul>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-2">Urgency patterns</div>
                    <ul className="space-y-1">{result.pattern_analysis.urgency_patterns.map((u, i) => (
                      <li key={i} className="text-white/60 text-sm">&bull; {u}</li>
                    ))}</ul>
                  </div>
                </div>
              </div>

              {/* Competitor Ads */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Competitor Ads ({result.competitor_ads.length})</div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.competitor_ads.map((ad, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{ad.advertiser}</span>
                        <div className="flex gap-2">
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded">{ad.media_type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            ad.estimated_spend === 'high' ? 'bg-green-500/20 text-green-400' :
                            ad.estimated_spend === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-white/10 text-white/40'
                          }`}>{ad.estimated_spend} spend</span>
                        </div>
                      </div>
                      <div className="font-medium text-sm mb-1">{ad.headline}</div>
                      <div className="text-white/50 text-xs mb-2">{ad.body_text}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs border border-white/20 px-2 py-0.5 rounded">{ad.cta}</span>
                        <span className="text-xs text-white/30">Tactic: {ad.key_tactic}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Tactics */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Top Performing Tactics</div>
                <div className="space-y-4">
                  {result.strategy_deck.top_performing_tactics.map((t, i) => (
                    <div key={i}>
                      <div className="font-medium text-sm mb-1">{t.tactic}</div>
                      <div className="text-white/50 text-xs mb-1">{t.why_it_works}</div>
                      <div className="text-white/40 text-xs bg-white/5 rounded px-3 py-2">{t.how_to_implement}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Calendar */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">4-Week Content Calendar</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {result.strategy_deck.content_calendar.map((w, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-4">
                      <div className="font-medium text-sm mb-1">{w.week}</div>
                      <div className="text-white/50 text-xs mb-2">{w.theme}</div>
                      <div className="flex flex-wrap gap-1">
                        {w.ad_types.map((t, j) => (
                          <span key={j} className="text-xs bg-white/10 px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget Split */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Recommended Budget Split</div>
                <div className="space-y-3">
                  {result.strategy_deck.recommended_budget_split.map((b, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-16 text-right font-bold text-lg">{b.percentage}%</div>
                      <div className="flex-1">
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-1">
                          <div className="h-full bg-white/40 rounded-full" style={{ width: `${b.percentage}%` }} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs font-medium capitalize">{b.platform}</span>
                          <span className="text-xs text-white/40">{b.reasoning}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                className="flex-1 border border-white/20 py-3 rounded-lg text-white/60 hover:text-white transition-colors"
              >
                Copy full report
              </button>
              <Link href="/agency" className="flex-1 bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors text-center">
                Back to Agency
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
