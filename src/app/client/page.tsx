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
  created_at: string
}

interface ClientInfo {
  business_name: string
  ads_remaining: number
}

export default function ClientDashboard() {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [recentAds, setRecentAds] = useState<Ad[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const headers = { Authorization: `Bearer ${session.access_token}` }

      const [adsRes, infoRes] = await Promise.all([
        fetch('/api/client/ads', { headers }),
        fetch('/api/client/billing', { headers }),
      ])

      const adsData = await adsRes.json()
      const infoData = await infoRes.json()

      if (adsData.ads) {
        setRecentAds(adsData.ads.slice(0, 5))
        setPendingCount(adsData.ads.filter((a: Ad) => a.status === 'pending_approval').length)
      }
      if (infoData.client) {
        setClientInfo(infoData.client)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-white/40">Loading...</div></div>
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {clientInfo ? `Welcome, ${clientInfo.business_name}` : 'Dashboard'}
        </h1>
        <p className="text-white/40 text-sm mt-1">View and approve your ad campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-sm text-white/40 mb-1">Ads Remaining</div>
          <div className="text-2xl font-bold">{clientInfo?.ads_remaining || 0}</div>
        </div>
        <div className={`rounded-xl p-5 border ${pendingCount > 0 ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/5 border-white/10'}`}>
          <div className="text-sm text-white/40 mb-1">Pending Approval</div>
          <div className={`text-2xl font-bold ${pendingCount > 0 ? 'text-yellow-400' : ''}`}>{pendingCount}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-sm text-white/40 mb-1">Total Ads</div>
          <div className="text-2xl font-bold">{recentAds.length}</div>
        </div>
      </div>

      {/* Recent Ads */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Ads</h2>
          <Link href="/client/ads" className="text-sm text-white/40 hover:text-white transition-colors">
            View all
          </Link>
        </div>

        {recentAds.length === 0 ? (
          <div className="text-white/30 text-sm py-8 text-center">
            No ads yet. Your agency will create ads for you to review here.
          </div>
        ) : (
          <div className="space-y-3">
            {recentAds.map((ad) => (
              <Link
                key={ad.id}
                href={`/client/ads/${ad.id}`}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm">{ad.title}</div>
                  {ad.ad_copy?.headline && (
                    <div className="text-xs text-white/40 mt-0.5">{ad.ad_copy.headline}</div>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${
                  ad.status === 'pending_approval' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  ad.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  ad.status === 'live' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  ad.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-white/10 text-white/40 border-white/20'
                }`}>
                  {ad.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="mt-6 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="font-medium text-yellow-400">You have {pendingCount} ad{pendingCount > 1 ? 's' : ''} waiting for approval</div>
            <div className="text-sm text-white/40 mt-0.5">Review and approve or request changes</div>
          </div>
          <Link
            href="/client/ads"
            className="px-4 py-2 bg-yellow-400 text-black rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors"
          >
            Review Ads
          </Link>
        </div>
      )}
    </div>
  )
}
