'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/types'

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [inputHandles, setInputHandles] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const [{ data: biz }, { data: leadsData }] = await Promise.all([
        supabase.from('businesses').select('id').eq('user_id', session.user.id).single(),
        supabase.from('leads').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ])
      setBusinessId(biz?.id ?? null)
      setLeads(leadsData ?? [])
      setLoading(false)
    })
  }, [])

  const handleOutreach = async () => {
    if (!businessId || !inputHandles.trim()) return
    setGenerating(true)

    const handles = inputHandles
      .split('\n')
      .map((h) => h.trim().replace('@', ''))
      .filter(Boolean)
      .map((h) => ({ instagram_handle: h }))

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/outreach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ business_id: businessId, leads: handles }),
    })

    const data = await res.json()
    const newLeads = data.results?.map((r: { lead: string; message: string; lead_id: string }) => ({
      id: r.lead_id,
      instagram_handle: r.lead,
      message_sent: r.message,
      status: 'pending',
      platform: 'instagram',
      created_at: new Date().toISOString(),
    })) ?? []

    setLeads((prev) => [...newLeads, ...prev])
    setInputHandles('')
    setGenerating(false)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Lead outreach</h1>
          <p className="text-white/40 text-sm">AI generates personalized DMs. You send them.</p>
        </div>

        {/* Input */}
        <div className="border border-white/10 rounded-xl p-6 mb-8">
          <label className="block text-sm text-white/60 mb-2">
            Instagram handles (one per line)
          </label>
          <textarea
            rows={4}
            placeholder="@johnsmith_realty&#10;@smithlaw&#10;@austinhomesagent"
            value={inputHandles}
            onChange={(e) => setInputHandles(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors resize-none font-mono text-sm"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-white/30 text-xs">2 credits per lead</span>
            <button
              onClick={handleOutreach}
              disabled={generating || !inputHandles.trim()}
              className="bg-white text-black px-5 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating messages...' : 'Generate outreach'}
            </button>
          </div>
        </div>

        {/* Leads list */}
        {loading ? (
          <div className="text-white/30 text-sm">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
            No leads yet. Add Instagram handles above to generate outreach messages.
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-sm">@{lead.instagram_handle}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    lead.status === 'replied' ? 'border-green-500/50 text-green-400' :
                    lead.status === 'sent' ? 'border-blue-500/50 text-blue-400' :
                    'border-white/20 text-white/40'
                  }`}>
                    {lead.status}
                  </span>
                </div>
                {lead.message_sent && (
                  <p className="text-white/50 text-sm leading-relaxed border-l border-white/10 pl-3">
                    {lead.message_sent}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
