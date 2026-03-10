'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Step = 'scan' | 'review' | 'strategy' | 'ads' | 'prospects'

interface ScannedData {
  business_name: string
  industry: string
  location: string
  services: string[]
  pricing: { item: string; price: string }[]
  unique_selling_points: string[]
  contact: { phone?: string; email?: string; address?: string }
  inventory_highlights: string[]
  website_url: string
  raw_summary: string
}

interface Strategy {
  tactics: { name: string; description: string; effectiveness: string }[]
  ad_patterns: string[]
  seasonal_opportunities: string[]
  recommended_offers: string[]
  recommended_ctas: string[]
  strategy_summary: string
}

interface GeneratedAd {
  headline: string
  primary_text: string
  description: string
  call_to_action: string
  image_prompt: string
}

interface Prospect {
  business_name: string
  likely_services: string[]
  outreach_angle: string
  suggested_message: string
}

export default function AgencyPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('scan')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')

  // Data from each step
  const [scannedData, setScannedData] = useState<ScannedData | null>(null)
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [ads, setAds] = useState<GeneratedAd[]>([])
  const [strategyNotes, setStrategyNotes] = useState('')
  const [selectedAd, setSelectedAd] = useState(0)
  const [platform, setPlatform] = useState<'meta' | 'google'>('meta')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [searchTips, setSearchTips] = useState<string[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/login')
      setToken(session.access_token)
    })
  }, [router])

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  // Step 1: Scan website
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/scan-website', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScannedData(data)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 → 3: Generate strategy
  const handleStrategy = async () => {
    if (!scannedData) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/competitor-research', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          niche: scannedData.industry,
          location: scannedData.location,
          business_context: scannedData.raw_summary,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStrategy(data)
      setStep('strategy')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed')
    } finally {
      setLoading(false)
    }
  }

  // Step 3 → 4: Generate ads
  const handleGenerateAds = async () => {
    if (!scannedData || !strategy) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/agency-generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scanned_data: scannedData,
          strategy: {
            recommended_offers: strategy.recommended_offers,
            recommended_ctas: strategy.recommended_ctas,
            strategy_summary: strategy.strategy_summary,
          },
          platform,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAds(data.ads ?? [])
      setStrategyNotes(data.strategy_notes ?? '')
      setStep('ads')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  // Step 5: Find prospects
  const handleFindProspects = async () => {
    if (!scannedData) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/find-prospects', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          niche: scannedData.industry,
          location: scannedData.location,
          count: 15,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProspects(data.prospects ?? [])
      setSearchTips(data.search_tips ?? [])
      setStep('prospects')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prospect search failed')
    } finally {
      setLoading(false)
    }
  }

  const stepIndex = ['scan', 'review', 'strategy', 'ads', 'prospects'].indexOf(step)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/dashboard" className="text-lg font-bold">AdFlow AI</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full font-medium">
            Agency Mode
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {['Scan Website', 'Review Data', 'Strategy', 'Generate Ads', 'Find Prospects'].map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 rounded-full mb-2 transition-colors ${stepIndex >= i ? 'bg-white' : 'bg-white/15'}`} />
              <div className={`text-xs transition-colors ${stepIndex >= i ? 'text-white/70' : 'text-white/25'}`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Scan */}
        {step === 'scan' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Paste a client&apos;s website</h1>
            <p className="text-white/50 mb-8">
              AI will scan the website and extract real business data — services, pricing, inventory, and more.
              Just like the video: paste a URL, get professional ads with real data.
            </p>
            <form onSubmit={handleScan} className="space-y-4">
              <input
                type="url"
                placeholder="https://example-business.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/20 rounded-lg px-5 py-4 text-lg text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-lg font-semibold text-lg hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Scanning website...
                  </span>
                ) : (
                  'Scan Website'
                )}
              </button>
            </form>

            <div className="mt-10 border border-white/10 rounded-xl p-6">
              <h3 className="font-semibold mb-3">How it works</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  { num: '1', text: 'Paste any business website' },
                  { num: '2', text: 'AI extracts real data' },
                  { num: '3', text: 'Get competitor strategy' },
                  { num: '4', text: 'Generate ads with real info' },
                ].map((s) => (
                  <div key={s.num} className="text-center">
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-xs mx-auto mb-2">{s.num}</div>
                    <div className="text-white/50">{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review scanned data */}
        {step === 'review' && scannedData && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Website scan complete</h1>
            <p className="text-white/50 mb-8">Here&apos;s what AI found. This real data powers your ads.</p>

            <div className="space-y-4 mb-8">
              {/* Business header */}
              <div className="border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Business</div>
                <div className="text-xl font-bold">{scannedData.business_name}</div>
                <div className="text-white/50 mt-1">{scannedData.industry} &middot; {scannedData.location}</div>
                <div className="text-white/40 text-sm mt-2">{scannedData.raw_summary}</div>
              </div>

              {/* Services */}
              {scannedData.services.length > 0 && (
                <div className="border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Services</div>
                  <div className="flex flex-wrap gap-2">
                    {scannedData.services.map((s, i) => (
                      <span key={i} className="bg-white/10 px-3 py-1 rounded-full text-sm">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              {scannedData.pricing.length > 0 && (
                <div className="border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Pricing found</div>
                  <div className="grid grid-cols-2 gap-2">
                    {scannedData.pricing.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-white/60">{p.item}</span>
                        <span className="font-medium">{p.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* USPs */}
              {scannedData.unique_selling_points.length > 0 && (
                <div className="border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Unique selling points</div>
                  <ul className="space-y-1">
                    {scannedData.unique_selling_points.map((u, i) => (
                      <li key={i} className="text-white/60 text-sm flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">+</span> {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inventory */}
              {scannedData.inventory_highlights.length > 0 && (
                <div className="border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Featured inventory / items</div>
                  <ul className="space-y-1">
                    {scannedData.inventory_highlights.map((item, i) => (
                      <li key={i} className="text-white/60 text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact */}
              {(scannedData.contact.phone || scannedData.contact.email || scannedData.contact.address) && (
                <div className="border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Contact info</div>
                  <div className="space-y-1 text-sm text-white/60">
                    {scannedData.contact.phone && <div>Phone: {scannedData.contact.phone}</div>}
                    {scannedData.contact.email && <div>Email: {scannedData.contact.email}</div>}
                    {scannedData.contact.address && <div>Address: {scannedData.contact.address}</div>}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStrategy}
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-lg font-semibold text-lg hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Researching competitor strategies...
                </span>
              ) : (
                'Research competitor strategy'
              )}
            </button>
          </div>
        )}

        {/* Step 3: Strategy */}
        {step === 'strategy' && strategy && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Competitor strategy ready</h1>
            <p className="text-white/50 mb-8">AI analyzed top-performing ads in this niche. Here&apos;s your playbook.</p>

            <div className="space-y-4 mb-8">
              {/* Summary */}
              <div className="border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Strategy summary</div>
                <div className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{strategy.strategy_summary}</div>
              </div>

              {/* Tactics */}
              <div className="border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Top tactics</div>
                <div className="space-y-3">
                  {strategy.tactics.slice(0, 5).map((t, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{t.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.effectiveness === 'high' ? 'bg-green-500/20 text-green-400' :
                          t.effectiveness === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-white/10 text-white/40'
                        }`}>{t.effectiveness}</span>
                      </div>
                      <div className="text-white/40 text-sm">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Offers & CTAs */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Recommended offers</div>
                  <ul className="space-y-1">
                    {strategy.recommended_offers.map((o, i) => (
                      <li key={i} className="text-white/60 text-sm flex items-start gap-2">
                        <span className="text-green-400">+</span> {o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Best CTAs</div>
                  <ul className="space-y-1">
                    {strategy.recommended_ctas.map((c, i) => (
                      <li key={i} className="text-white/60 text-sm flex items-start gap-2">
                        <span className="text-blue-400">&rarr;</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Seasonal */}
              {strategy.seasonal_opportunities.length > 0 && (
                <div className="border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Seasonal opportunities</div>
                  <div className="flex flex-wrap gap-2">
                    {strategy.seasonal_opportunities.map((s, i) => (
                      <span key={i} className="bg-purple-500/10 text-purple-300 px-3 py-1 rounded-full text-sm">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Platform selector + generate */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Ad platform</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['meta', 'google'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                        platform === p
                          ? 'border-white bg-white/10 text-white'
                          : 'border-white/20 text-white/50 hover:border-white/40'
                      }`}
                    >
                      {p === 'meta' ? 'Meta (Facebook/Instagram)' : 'Google Ads'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateAds}
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-lg font-semibold text-lg hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Generating ads with real data...
                  </span>
                ) : (
                  'Generate ads — 1 credit'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Generated Ads */}
        {step === 'ads' && ads.length > 0 && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Your ads are ready</h1>
            <p className="text-white/50 mb-8">
              Generated with real data from {scannedData?.business_name}. Pick one to deploy.
            </p>

            {/* Strategy note */}
            {strategyNotes && (
              <div className="border border-white/10 rounded-xl p-4 mb-6 text-white/50 text-sm">
                <div className="text-white/30 text-xs mb-1 uppercase tracking-wider">Why these will convert</div>
                {strategyNotes}
              </div>
            )}

            {/* Ad variants */}
            <div className="space-y-4 mb-6">
              {ads.map((ad, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAd(i)}
                  className={`w-full text-left border rounded-xl p-5 transition-all ${
                    selectedAd === i ? 'border-white bg-white/5' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-wider">Ad {i + 1}</span>
                    {selectedAd === i && (
                      <span className="text-xs bg-white text-black px-2 py-0.5 rounded-full">Selected</span>
                    )}
                  </div>
                  <div className="font-semibold mb-2">{ad.headline}</div>
                  <div className="text-white/60 text-sm mb-2">{ad.primary_text}</div>
                  <div className="text-white/40 text-xs mb-3">{ad.description}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs border border-white/20 px-2 py-1 rounded">{ad.call_to_action}</span>
                    {ad.image_prompt && (
                      <span className="text-xs text-white/30 truncate flex-1">Image: {ad.image_prompt}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => { setAds([]); setStep('strategy') }}
                className="flex-1 border border-white/20 py-3 rounded-lg text-white/60 hover:text-white transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleFindProspects}
                disabled={loading}
                className="flex-1 bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Finding prospects...' : 'Find prospects — 2 credits'}
              </button>
            </div>

            <Link
              href="/dashboard"
              className="block text-center text-white/40 text-sm hover:text-white/60 transition-colors"
            >
              Skip to dashboard
            </Link>
          </div>
        )}

        {/* Step 5: Prospects */}
        {step === 'prospects' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Prospects found</h1>
            <p className="text-white/50 mb-8">
              {prospects.length} businesses to pitch in the {scannedData?.location} area. Each has a tailored outreach message.
            </p>

            {/* Search tips */}
            {searchTips.length > 0 && (
              <div className="border border-white/10 rounded-xl p-5 mb-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Where to find them</div>
                <ul className="space-y-1">
                  {searchTips.map((tip, i) => (
                    <li key={i} className="text-white/50 text-sm flex items-start gap-2">
                      <span className="text-blue-400">&rarr;</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prospect cards */}
            <div className="space-y-3 mb-8">
              {prospects.map((p, i) => (
                <div key={i} className="border border-white/10 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium">{p.business_name}</div>
                      <div className="text-white/40 text-xs mt-0.5">{p.likely_services.join(' · ')}</div>
                    </div>
                    <span className="text-xs text-white/30">#{i + 1}</span>
                  </div>
                  <div className="text-white/50 text-sm mb-3">
                    <span className="text-white/30 text-xs uppercase tracking-wider">Angle: </span>
                    {p.outreach_angle}
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70">
                    <div className="text-white/30 text-xs mb-1">Suggested DM:</div>
                    {p.suggested_message}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(p.suggested_message)}
                    className="mt-2 text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    Copy message
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('scan')}
                className="flex-1 border border-white/20 py-3 rounded-lg text-white/60 hover:text-white transition-colors"
              >
                Scan another website
              </button>
              <Link
                href="/dashboard"
                className="flex-1 bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors text-center"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
