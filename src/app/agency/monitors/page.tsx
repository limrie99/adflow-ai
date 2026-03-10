'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Monitor {
  id: string
  business_name: string
  website_url: string
  niche: string
  location: string
  platform: string
  check_interval_hours: number
  is_active: boolean
  last_checked_at: string | null
  created_at: string
}

interface CheckResult {
  has_changes: boolean
  changes: {
    type: string
    description: string
    details: string
    suggested_ad: { headline: string; primary_text: string }
  }[]
  ads_created: number
}

export default function MonitorsPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [checking, setChecking] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    website_url: '',
    niche: '',
    location: '',
    platform: 'meta' as 'meta' | 'google',
    check_interval_hours: 1,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/login')
      setToken(session.access_token)
      loadMonitors(session.access_token)
    })
  }, [router])

  const headers = (t: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${t}`,
  })

  const loadMonitors = async (t: string) => {
    const res = await fetch('/api/monitor', { headers: headers(t) })
    if (res.ok) {
      const data = await res.json()
      setMonitors(data)
    }
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/monitor', {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMonitors(prev => [data, ...prev])
      setShowForm(false)
      setForm({ business_name: '', website_url: '', niche: '', location: '', platform: 'meta', check_interval_hours: 1 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create monitor')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (monitorId: string) => {
    const res = await fetch('/api/monitor', {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ monitor_id: monitorId, action: 'toggle' }),
    })
    if (res.ok) {
      const data = await res.json()
      setMonitors(prev => prev.map(m => m.id === monitorId ? { ...m, is_active: data.is_active } : m))
    }
  }

  const handleCheckNow = async (monitorId: string) => {
    setChecking(monitorId)
    setCheckResult(null)

    try {
      const res = await fetch('/api/monitor', {
        method: 'PATCH',
        headers: headers(token),
        body: JSON.stringify({ monitor_id: monitorId, action: 'check_now' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCheckResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setChecking(null)
    }
  }

  const timeAgo = (date: string | null) => {
    if (!date) return 'never'
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/agency" className="text-lg font-bold">AdFlow AI</Link>
        <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full font-medium">
          Auto-Monitor
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Website Monitors</h1>
            <p className="text-white/50 mt-1">Auto-detect new inventory, price changes, and promotions. AI creates ads instantly.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add monitor'}
          </button>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
        )}

        {/* Check result */}
        {checkResult && (
          <div className={`border rounded-xl p-5 mb-6 ${checkResult.has_changes ? 'border-green-500/30 bg-green-500/10' : 'border-white/10'}`}>
            <div className="font-medium mb-2">
              {checkResult.has_changes
                ? `Found ${checkResult.changes.length} change(s) — ${checkResult.ads_created} ad(s) auto-created`
                : 'No changes detected'}
            </div>
            {checkResult.changes.map((c, i) => (
              <div key={i} className="bg-black/30 rounded-lg p-3 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">{c.type}</span>
                  <span className="text-sm">{c.description}</span>
                </div>
                <div className="text-white/40 text-xs mb-2">{c.details}</div>
                <div className="text-xs text-white/50">Auto-created ad: &quot;{c.suggested_ad.headline}&quot;</div>
              </div>
            ))}
            <button onClick={() => setCheckResult(null)} className="mt-3 text-xs text-white/40 hover:text-white/60">Dismiss</button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="border border-white/10 rounded-xl p-6 mb-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Business name</label>
                <input type="text" required placeholder="McCarthy Auto" value={form.business_name}
                  onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60" />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Website URL</label>
                <input type="url" required placeholder="https://example.com" value={form.website_url}
                  onChange={(e) => setForm(f => ({ ...f, website_url: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60" />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Niche</label>
                <select value={form.niche} onChange={(e) => setForm(f => ({ ...f, niche: e.target.value }))} required
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/60">
                  <option value="">Select...</option>
                  <option value="automotive">Automotive</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="home_services">Home Services</option>
                  <option value="medical_dental">Medical &amp; Dental</option>
                  <option value="law">Legal</option>
                  <option value="local_services">Local Services</option>
                  <option value="wedding">Wedding</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Location</label>
                <input type="text" required placeholder="Kansas City, MO" value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60" />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['meta', 'google'] as const).map(p => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, platform: p }))}
                      className={`py-2.5 rounded-lg border text-sm ${form.platform === p ? 'border-white bg-white/10' : 'border-white/20 text-white/50'}`}>
                      {p === 'meta' ? 'Meta' : 'Google'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Check every</label>
                <select value={form.check_interval_hours} onChange={(e) => setForm(f => ({ ...f, check_interval_hours: Number(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/60">
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={creating}
              className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 disabled:opacity-50">
              {creating ? 'Creating...' : 'Start monitoring'}
            </button>
          </form>
        )}

        {/* Monitor list */}
        {loading ? (
          <div className="text-white/40 text-center py-12">Loading monitors...</div>
        ) : monitors.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-12 text-center">
            <div className="text-white/30 mb-4">No monitors yet</div>
            <p className="text-white/50 text-sm mb-6">
              Add a client&apos;s website and AI will check it automatically.
              When new inventory, price changes, or promotions appear, ads are created instantly.
            </p>
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-white/90">
                + Add your first monitor
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {monitors.map((m) => (
              <div key={m.id} className="border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${m.is_active ? 'bg-green-400' : 'bg-white/20'}`} />
                      <span className="font-medium">{m.business_name}</span>
                    </div>
                    <div className="text-white/40 text-xs mt-0.5">{m.website_url}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCheckNow(m.id)}
                      disabled={checking === m.id}
                      className="text-xs border border-white/20 px-3 py-1.5 rounded-lg hover:border-white/40 disabled:opacity-50"
                    >
                      {checking === m.id ? 'Checking...' : 'Check now'}
                    </button>
                    <button
                      onClick={() => handleToggle(m.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg ${m.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}
                    >
                      {m.is_active ? 'Active' : 'Paused'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-white/40">
                  <span>{m.niche}</span>
                  <span>{m.location}</span>
                  <span>Every {m.check_interval_hours}h</span>
                  <span>{m.platform}</span>
                  <span>Last check: {timeAgo(m.last_checked_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cron setup note */}
        <div className="border border-white/10 rounded-xl p-5 mt-8">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Auto-checking setup</div>
          <p className="text-white/50 text-sm">
            For automatic hourly checks, set up a cron job or n8n workflow that calls:<br />
            <code className="bg-white/10 px-2 py-0.5 rounded text-xs mt-1 inline-block">
              GET /api/monitor/cron?key=adflow-cron-2024
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}
