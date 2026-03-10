'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { AdCopy, Niche, AdPlatform } from '@/types'

export default function NewCampaign() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generatedAds, setGeneratedAds] = useState<AdCopy[]>([])
  const [strategyNotes, setStrategyNotes] = useState('')
  const [selectedAd, setSelectedAd] = useState<number>(0)
  const [deploying, setDeploying] = useState(false)
  const [business, setBusiness] = useState<{ name: string; niche: Niche; location: string } | null>(null)

  const [form, setForm] = useState({
    platform: 'meta' as AdPlatform,
    offer: '',
    unique_value: '',
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/login')
      supabase
        .from('businesses')
        .select('name, niche, location')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => setBusiness(data))
    })
  }, [router])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/generate-ad', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        niche: business.niche,
        business_name: business.name,
        location: business.location,
        platform: form.platform,
        offer: form.offer,
        unique_value: form.unique_value,
      }),
    })

    const data = await res.json()
    setGeneratedAds(data.ads ?? [])
    setStrategyNotes(data.strategy_notes ?? '')
    setLoading(false)
  }

  const handleDeploy = async () => {
    setDeploying(true)
    const { data: { session } } = await supabase.auth.getSession()

    // Get the most recent draft campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', session!.user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!campaign) {
      setDeploying(false)
      return
    }

    const endpoint = form.platform === 'meta' ? '/api/deploy-meta' : '/api/deploy-google'
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ campaign_id: campaign.id }),
    })

    setDeploying(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Generate new campaign</h1>
          <p className="text-white/40 text-sm">
            AI will write 3 ad variations. Pick one to deploy.
          </p>
        </div>

        {!generatedAds.length ? (
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Platform */}
            <div>
              <label className="block text-sm text-white/60 mb-2">Platform</label>
              <div className="grid grid-cols-2 gap-3">
                {(['meta', 'google'] as AdPlatform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, platform: p }))}
                    className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                      form.platform === p
                        ? 'border-white bg-white/10 text-white'
                        : 'border-white/20 text-white/50 hover:border-white/40'
                    }`}
                  >
                    {p === 'meta' ? 'Meta (Facebook/Instagram)' : 'Google Ads'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Special offer (optional)</label>
              <input
                type="text"
                placeholder="e.g. Free home valuation, Free consultation"
                value={form.offer}
                onChange={(e) => setForm((f) => ({ ...f, offer: e.target.value }))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Unique value (optional)</label>
              <input
                type="text"
                placeholder="e.g. 15 years experience, No win no fee"
                value={form.unique_value}
                onChange={(e) => setForm((f) => ({ ...f, unique_value: e.target.value }))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating ads...' : 'Generate ads — 1 credit'}
            </button>
          </form>
        ) : (
          <div>
            {/* Strategy notes */}
            {strategyNotes && (
              <div className="border border-white/10 rounded-xl p-4 mb-6 text-white/50 text-sm">
                <div className="text-white/30 text-xs mb-1 uppercase tracking-wider">Strategy</div>
                {strategyNotes}
              </div>
            )}

            {/* Ad variants */}
            <div className="space-y-4 mb-6">
              {generatedAds.map((ad, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAd(i)}
                  className={`w-full text-left border rounded-xl p-5 transition-all ${
                    selectedAd === i ? 'border-white bg-white/5' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-wider">Variant {i + 1}</span>
                    {selectedAd === i && (
                      <span className="text-xs bg-white text-black px-2 py-0.5 rounded-full">Selected</span>
                    )}
                  </div>
                  <div className="font-semibold mb-1">{ad.headline}</div>
                  <div className="text-white/60 text-sm mb-2">{ad.primary_text}</div>
                  <div className="text-white/40 text-xs">{ad.description}</div>
                  <div className="mt-3 inline-block text-xs border border-white/20 px-2 py-1 rounded">
                    {ad.call_to_action}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setGeneratedAds([])}
                className="flex-1 border border-white/20 py-3 rounded-lg text-white/60 hover:text-white transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="flex-1 bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {deploying ? 'Deploying...' : `Deploy to ${form.platform === 'meta' ? 'Meta' : 'Google'} — 5 credits`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
