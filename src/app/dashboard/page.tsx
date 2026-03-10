'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Campaign, Business } from '@/types'

export default function Dashboard() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [usage, setUsage] = useState({ total: 0, credits: 0, breakdown: { ad_generated: 0, ad_deployed: 0, lead_outreach: 0 } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [{ data: biz }, { data: camps }] = await Promise.all([
        supabase.from('businesses').select('*').eq('user_id', session.user.id).single(),
        supabase.from('campaigns').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
      ])

      const usageRes = await fetch('/api/usage', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const usageData = await usageRes.json()

      setBusiness(biz)
      setCampaigns(camps ?? [])
      setUsage(usageData)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <span className="text-lg font-bold">AdFlow AI</span>
        <div className="flex items-center gap-6">
          <Link href="/agency" className="text-white/60 hover:text-white text-sm transition-colors">Agency</Link>
          <Link href="/campaigns" className="text-white/60 hover:text-white text-sm transition-colors">Campaigns</Link>
          <Link href="/leads" className="text-white/60 hover:text-white text-sm transition-colors">Leads</Link>
          <div className="w-8 h-8 bg-white/10 rounded-full" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold mb-1">
            {business ? `Welcome back, ${business.name}` : 'Dashboard'}
          </h1>
          <p className="text-white/40 text-sm">{business?.location}</p>
        </div>

        {/* Credits banner */}
        <div className="border border-white/10 rounded-xl px-5 py-4 mb-6">
          <span className="text-white/40 text-sm">Credits remaining</span>
          <span className="ml-3 text-xl font-bold">{usage.credits}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Credits used', value: usage.total },
            { label: 'Ads generated', value: usage.breakdown.ad_generated },
            { label: 'Ads deployed', value: usage.breakdown.ad_deployed },
            { label: 'Outreach sent', value: usage.breakdown.lead_outreach },
          ].map((s) => (
            <div key={s.label} className="border border-white/10 rounded-xl p-5">
              <div className="text-2xl font-bold mb-1">{s.value}</div>
              <div className="text-white/40 text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Agency Mode CTA */}
        <Link
          href="/agency"
          className="block border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-6 mb-6 hover:border-purple-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-semibold">Agency Mode</span>
                <span className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-0.5 rounded-full">NEW</span>
              </div>
              <div className="text-white/40 text-sm">Paste any client website &rarr; AI scans real data &rarr; generates pro ads &rarr; finds prospects</div>
            </div>
            <div className="text-white/30 text-2xl">&rarr;</div>
          </div>
        </Link>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <Link
            href="/campaigns/new"
            className="border border-white/20 rounded-xl p-6 hover:border-white/40 hover:bg-white/5 transition-all"
          >
            <div className="text-lg font-semibold mb-1">Generate new ad</div>
            <div className="text-white/40 text-sm">Create AI-written ad copy for Meta or Google</div>
            <div className="mt-4 text-xs text-white/30">1 credit</div>
          </Link>
          <Link
            href="/leads"
            className="border border-white/20 rounded-xl p-6 hover:border-white/40 hover:bg-white/5 transition-all"
          >
            <div className="text-lg font-semibold mb-1">Run outreach</div>
            <div className="text-white/40 text-sm">AI-generated DMs to prospects in your area</div>
            <div className="mt-4 text-xs text-white/30">2 credits per lead</div>
          </Link>
        </div>

        {/* Recent campaigns */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent campaigns</h2>
            <Link href="/campaigns" className="text-white/40 text-sm hover:text-white transition-colors">View all</Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="border border-white/10 rounded-xl p-8 text-center text-white/30">
              No campaigns yet.{' '}
              <Link href="/campaigns/new" className="text-white/60 hover:text-white underline">Create your first one.</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-white/40 text-xs mt-0.5 capitalize">{c.platform} · {c.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{c.clicks} clicks</div>
                    <div className="text-white/40 text-xs">${c.spend} spent</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
