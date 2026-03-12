'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Ad {
  id: string
  title: string
  platform: string
  status: string
  ad_copy: { headline?: string; body?: string; cta?: string }
  budget_daily: number | null
  scheduled_for: string | null
  created_at: string
}

const STATUS_FILTERS = ['all', 'pending_approval', 'approved', 'rejected', 'live', 'draft', 'completed']

export default function ClientAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/client/ads', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.ads) setAds(data.ads)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? ads : ads.filter(a => a.status === filter)

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-white/40">Loading...</div></div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">My Ads</h1>
      <p className="text-white/40 text-sm mb-6">Review and approve your ad campaigns</p>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              filter === s
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            {s !== 'all' && ` (${ads.filter(a => a.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <div className="text-white/30">No ads found</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ad) => (
            <Link
              key={ad.id}
              href={`/client/ads/${ad.id}`}
              className="block bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{ad.title}</div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${
                  ad.status === 'pending_approval' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  ad.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  ad.status === 'live' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  ad.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-white/10 text-white/40 border-white/20'
                }`}>
                  {ad.status.replace('_', ' ')}
                </span>
              </div>
              {ad.ad_copy?.headline && (
                <div className="text-sm text-white/60 mb-1">{ad.ad_copy.headline}</div>
              )}
              {ad.ad_copy?.body && (
                <div className="text-sm text-white/40 line-clamp-2">{ad.ad_copy.body}</div>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                <span>{ad.platform}</span>
                {ad.budget_daily && <span>${ad.budget_daily}/day</span>}
                <span>{new Date(ad.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
