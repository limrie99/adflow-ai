'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  business_name: string
  niche: string
  website: string
  location: string
}

export default function NewAdPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [form, setForm] = useState({
    title: '',
    platform: 'meta',
    headline: '',
    body: '',
    cta: '',
    budget_daily: '',
    scheduled_for: '',
  })

  useEffect(() => {
    async function loadClient() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/admin/clients', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      const found = data.clients?.find((c: Client) => c.id === clientId)
      if (found) setClient(found)
      setLoading(false)
    }
    loadClient()
  }, [clientId])

  const handleGenerate = async () => {
    if (!client) return
    setGenerating(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/ad-spy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          niche: client.niche || 'local_services',
          location: client.location || '',
          competitors: client.business_name,
        }),
      })

      const data = await res.json()

      if (data.ads && data.ads.length > 0) {
        const ad = data.ads[0]
        setForm(f => ({
          ...f,
          title: `${client.business_name} - ${ad.headline?.slice(0, 30) || 'New Ad'}`,
          headline: ad.headline || '',
          body: ad.body || '',
          cta: ad.cta || 'Learn More',
        }))
      }
    } catch (err) {
      console.error('Generate failed:', err)
    }

    setGenerating(false)
  }

  const handleSave = async (sendForApproval: boolean) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/admin/ads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        title: form.title || `Ad for ${client?.business_name}`,
        platform: form.platform,
        ad_copy: {
          headline: form.headline,
          body: form.body,
          cta: form.cta,
        },
        budget_daily: form.budget_daily ? parseFloat(form.budget_daily) : null,
        scheduled_for: form.scheduled_for || null,
        status: sendForApproval ? 'pending_approval' : 'draft',
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (data.ad) {
      router.push(`/admin/clients/${clientId}`)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-white/40">Loading...</div></div>
  }

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => router.back()} className="text-white/40 hover:text-white text-sm mb-4">&larr; Back</button>

      <h1 className="text-2xl font-bold mb-1">Create Ad</h1>
      <p className="text-white/40 text-sm mb-8">
        {client ? `For ${client.business_name}` : 'New ad'}
      </p>

      {/* AI Generate */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">AI Generate</div>
            <div className="text-xs text-white/40">Let AI create ad copy based on the client&apos;s niche and real competitor ads</div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Title (internal)</label>
          <input
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Spring Sale Campaign"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Platform</label>
            <select
              value={form.platform}
              onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/60"
            >
              <option value="meta">Meta (Facebook/Instagram)</option>
              <option value="google">Google Ads</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Daily Budget ($)</label>
            <input
              type="number"
              value={form.budget_daily}
              onChange={(e) => setForm(f => ({ ...f, budget_daily: e.target.value }))}
              placeholder="25.00"
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Headline</label>
          <input
            value={form.headline}
            onChange={(e) => setForm(f => ({ ...f, headline: e.target.value }))}
            placeholder="Attention-grabbing headline"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Body Copy</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="The main ad copy..."
            rows={5}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Call to Action</label>
            <input
              value={form.cta}
              onChange={(e) => setForm(f => ({ ...f, cta: e.target.value }))}
              placeholder="Learn More, Book Now, etc."
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Scheduled Date</label>
            <input
              type="date"
              value={form.scheduled_for}
              onChange={(e) => setForm(f => ({ ...f, scheduled_for: e.target.value }))}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/60"
            />
          </div>
        </div>

        {/* Preview */}
        {(form.headline || form.body) && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mt-6">
            <div className="text-xs text-white/40 mb-3">AD PREVIEW</div>
            <div className="bg-white/[0.03] rounded-lg p-4">
              {form.headline && <div className="font-semibold mb-2">{form.headline}</div>}
              {form.body && <div className="text-sm text-white/70 mb-3 whitespace-pre-wrap">{form.body}</div>}
              {form.cta && (
                <div className="inline-block px-4 py-1.5 bg-white text-black rounded text-sm font-medium">
                  {form.cta}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-6 py-2.5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-6 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Send for Approval'}
          </button>
        </div>
      </div>
    </div>
  )
}
