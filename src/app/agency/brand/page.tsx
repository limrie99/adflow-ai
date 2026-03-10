'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface BrandGuide {
  agency_name: string
  tagline: string
  color_palette: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    muted: string
  }
  typography: {
    heading_font: string
    body_font: string
    style_notes: string
  }
  tone_of_voice: {
    personality: string[]
    do: string[]
    dont: string[]
    example_headlines: string[]
  }
  visual_guidelines: {
    image_style: string
    layout_principles: string[]
    ad_format_notes: string
  }
  niche_specific: {
    industry_context: string
    target_audience: string
    emotional_triggers: string[]
  }
}

export default function BrandGuidePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [guide, setGuide] = useState<BrandGuide | null>(null)
  const [form, setForm] = useState({
    niche: '',
    agency_name: '',
    target_audience: '',
    brand_vibe: '',
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/login')
      setToken(session.access_token)
    })
  }, [router])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.niche) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/brand-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGuide(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/agency" className="text-lg font-bold">AdFlow AI</Link>
        <span className="text-xs bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-1 rounded-full font-medium">
          Brand Guide
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-10">
        {!guide ? (
          <div>
            <h1 className="text-3xl font-bold mb-2">Create your brand style guide</h1>
            <p className="text-white/50 mb-8">
              AI generates a complete brand identity — color palette, typography, tone of voice, and visual guidelines.
              All your ads will follow this consistent brand.
            </p>

            {error && (
              <div className="border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
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
                  <option value="home_services">Home Services (HVAC, Plumbing, Roofing)</option>
                  <option value="medical_dental">Medical &amp; Dental</option>
                  <option value="law">Legal Services</option>
                  <option value="local_services">Local Services (Salons, Gyms)</option>
                  <option value="wedding">Wedding Services</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5">Agency name (optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank for AI to suggest one"
                  value={form.agency_name}
                  onChange={(e) => setForm(f => ({ ...f, agency_name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5">Target audience (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Local car dealerships in the Midwest"
                  value={form.target_audience}
                  onChange={(e) => setForm(f => ({ ...f, target_audience: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5">Brand vibe (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Premium and modern, Bold and aggressive, Clean and minimal"
                  value={form.brand_vibe}
                  onChange={(e) => setForm(f => ({ ...f, brand_vibe: e.target.value }))}
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
                    Creating brand identity...
                  </span>
                ) : (
                  'Generate brand style guide — 1 credit'
                )}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">{guide.agency_name}</h1>
                <p className="text-white/50 mt-1">{guide.tagline}</p>
              </div>
              <button
                onClick={() => setGuide(null)}
                className="text-sm text-white/40 hover:text-white border border-white/20 px-3 py-1.5 rounded-lg"
              >
                Regenerate
              </button>
            </div>

            <div className="space-y-6">
              {/* Color Palette */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Color Palette</div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(guide.color_palette).map(([name, hex]) => (
                    <div key={name} className="text-center">
                      <div
                        className="w-full aspect-square rounded-lg mb-2 border border-white/10"
                        style={{ backgroundColor: hex.split(' ')[0] }}
                      />
                      <div className="text-xs font-medium capitalize">{name.replace('_', ' ')}</div>
                      <div className="text-xs text-white/40">{hex.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Typography</div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-white/40 text-xs mb-1">Heading font</div>
                    <div className="text-xl font-bold">{guide.typography.heading_font}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-1">Body font</div>
                    <div className="text-xl">{guide.typography.body_font}</div>
                  </div>
                </div>
                <div className="text-white/50 text-sm">{guide.typography.style_notes}</div>
              </div>

              {/* Tone of Voice */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Tone of Voice</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {guide.tone_of_voice.personality.map((p, i) => (
                    <span key={i} className="bg-white/10 px-3 py-1 rounded-full text-sm">{p}</span>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-green-400 text-xs font-medium mb-2">DO</div>
                    <ul className="space-y-1">
                      {guide.tone_of_voice.do.map((d, i) => (
                        <li key={i} className="text-white/60 text-sm flex gap-2"><span className="text-green-400">+</span> {d}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-red-400 text-xs font-medium mb-2">DON&apos;T</div>
                    <ul className="space-y-1">
                      {guide.tone_of_voice.dont.map((d, i) => (
                        <li key={i} className="text-white/60 text-sm flex gap-2"><span className="text-red-400">-</span> {d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <div className="text-white/30 text-xs mb-2">Example Headlines</div>
                  <div className="space-y-2">
                    {guide.tone_of_voice.example_headlines.map((h, i) => (
                      <div key={i} className="bg-white/5 rounded-lg px-4 py-2 text-sm font-medium">{h}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual Guidelines */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Visual Guidelines</div>
                <div className="mb-4">
                  <div className="text-white/40 text-xs mb-1">Image style</div>
                  <div className="text-white/70 text-sm">{guide.visual_guidelines.image_style}</div>
                </div>
                <div className="mb-4">
                  <div className="text-white/40 text-xs mb-2">Layout principles</div>
                  <ul className="space-y-1">
                    {guide.visual_guidelines.layout_principles.map((l, i) => (
                      <li key={i} className="text-white/60 text-sm flex gap-2"><span className="text-blue-400">&rarr;</span> {l}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-white/50 text-sm">{guide.visual_guidelines.ad_format_notes}</div>
              </div>

              {/* Niche Specific */}
              <div className="border border-white/10 rounded-xl p-6">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Niche Intelligence</div>
                <div className="mb-4 text-white/70 text-sm">{guide.niche_specific.industry_context}</div>
                <div className="mb-4">
                  <div className="text-white/40 text-xs mb-1">Target audience</div>
                  <div className="text-white/60 text-sm">{guide.niche_specific.target_audience}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs mb-2">Emotional triggers</div>
                  <div className="flex flex-wrap gap-2">
                    {guide.niche_specific.emotional_triggers.map((t, i) => (
                      <span key={i} className="bg-purple-500/10 text-purple-300 px-3 py-1 rounded-full text-sm">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(guide, null, 2))}
                className="flex-1 border border-white/20 py-3 rounded-lg text-white/60 hover:text-white transition-colors"
              >
                Copy as JSON
              </button>
              <Link
                href="/agency"
                className="flex-1 bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors text-center"
              >
                Back to Agency
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
