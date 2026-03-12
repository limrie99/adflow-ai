'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface ClientSummary {
  id: string
  business_name: string
  contact_name: string
  status: string
  ads_remaining: number
}

interface AdSummary {
  id: string
  title: string
  status: string
  client_name: string
  created_at: string
}

export default function AdminDashboard() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [pendingAds, setPendingAds] = useState<AdSummary[]>([])
  const [stats, setStats] = useState({ totalClients: 0, activeAds: 0, pendingApprovals: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const headers = { Authorization: `Bearer ${session.access_token}` }

      // Fetch clients
      const clientsRes = await fetch('/api/admin/clients', { headers })
      const clientsData = await clientsRes.json()

      // Fetch pending ads
      const adsRes = await fetch('/api/admin/ads?status=pending_approval', { headers })
      const adsData = await adsRes.json()

      if (clientsData.clients) {
        setClients(clientsData.clients.slice(0, 5))
        const active = clientsData.clients.filter((c: ClientSummary) => c.status === 'active').length
        setStats(prev => ({ ...prev, totalClients: clientsData.clients.length, activeAds: active }))
      }

      if (adsData.ads) {
        setPendingAds(adsData.ads.slice(0, 5))
        setStats(prev => ({ ...prev, pendingApprovals: adsData.ads.length }))
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/40">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Manage your agency clients and campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Clients" value={stats.totalClients} />
        <StatCard label="Active Clients" value={stats.activeAds} />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} highlight />
        <StatCard label="This Month" value={`$${stats.revenue}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Clients */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Clients</h2>
            <Link href="/admin/clients" className="text-sm text-white/40 hover:text-white transition-colors">
              View all
            </Link>
          </div>
          {clients.length === 0 ? (
            <div className="text-white/30 text-sm py-8 text-center">
              No clients yet.{' '}
              <Link href="/admin/clients" className="text-white/60 underline">Add your first client</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">{client.business_name}</div>
                    <div className="text-xs text-white/40">{client.contact_name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/40">{client.ads_remaining} ads left</span>
                    <StatusBadge status={client.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pending Approvals</h2>
          </div>
          {pendingAds.length === 0 ? (
            <div className="text-white/30 text-sm py-8 text-center">
              No ads pending approval
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAds.map((ad) => (
                <div
                  key={ad.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10"
                >
                  <div>
                    <div className="font-medium text-sm">{ad.title}</div>
                    <div className="text-xs text-white/40">{ad.client_name}</div>
                  </div>
                  <div className="text-xs text-yellow-400/80">Waiting for approval</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/admin/clients"
          className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Add Client
        </Link>
        <Link
          href="/agency"
          className="px-5 py-2.5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
        >
          Scan Website
        </Link>
        <Link
          href="/agency/spy"
          className="px-5 py-2.5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
        >
          Ad Spy
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${highlight ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/5 border-white/10'}`}>
      <div className="text-sm text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-yellow-400' : ''}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-400/10 text-green-400 border-green-400/20',
    paused: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    churned: 'bg-red-400/10 text-red-400 border-red-400/20',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[status] || colors.active}`}>
      {status}
    </span>
  )
}
