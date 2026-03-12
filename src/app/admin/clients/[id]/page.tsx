'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  business_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  niche: string
  website: string
  location: string
  status: string
  ads_remaining: number
  monthly_ad_budget: number | null
  notes: string
  client_user_id: string | null
  created_at: string
}

interface Ad {
  id: string
  title: string
  platform: string
  status: string
  ad_copy: { headline?: string; body?: string; cta?: string }
  budget_daily: number | null
  scheduled_for: string | null
  created_at: string
  client_feedback: string | null
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  useEffect(() => {
    async function load() {
      const headers = await getHeaders()

      const [clientRes, adsRes] = await Promise.all([
        fetch('/api/admin/clients', { headers }),
        fetch(`/api/admin/ads?client_id=${clientId}`, { headers }),
      ])

      const clientData = await clientRes.json()
      const adsData = await adsRes.json()

      const found = clientData.clients?.find((c: Client) => c.id === clientId)
      if (found) {
        setClient(found)
        setInviteEmail(found.contact_email || '')
      }
      if (adsData.ads) setAds(adsData.ads)
      setLoading(false)
    }
    load()
  }, [clientId])

  const handleInvite = async () => {
    if (!inviteEmail || !invitePassword) return
    setInviting(true)
    setInviteMsg('')

    const headers = await getHeaders()
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        email: inviteEmail,
        password: invitePassword,
      }),
    })
    const data = await res.json()
    setInviting(false)

    if (data.error) {
      setInviteMsg(`Error: ${data.error}`)
    } else {
      setInviteMsg('Client account created! They can now log in.')
      if (client) setClient({ ...client, client_user_id: data.user_id })
    }
  }

  const handleSendForApproval = async (adId: string) => {
    const headers = await getHeaders()
    await fetch('/api/admin/ads', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adId, status: 'pending_approval' }),
    })
    setAds(ads.map(a => a.id === adId ? { ...a, status: 'pending_approval' } : a))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-white/40">Loading...</div></div>
  }

  if (!client) {
    return <div className="p-8 text-white/40">Client not found</div>
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/admin/clients')} className="text-white/40 hover:text-white text-sm">&larr; Back</button>
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
          {client.business_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{client.business_name}</h1>
          <p className="text-white/40 text-sm">
            {client.contact_name}
            {client.niche && ` · ${client.niche.replace('_', ' ')}`}
            {client.location && ` · ${client.location}`}
          </p>
        </div>
        <span className={`ml-auto text-xs px-3 py-1 rounded-full border ${
          client.status === 'active' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
          client.status === 'paused' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
          'bg-red-400/10 text-red-400 border-red-400/20'
        }`}>
          {client.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Client Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-semibold mb-3">Details</h2>
            <div className="space-y-2 text-sm">
              {client.contact_email && <InfoRow label="Email" value={client.contact_email} />}
              {client.contact_phone && <InfoRow label="Phone" value={client.contact_phone} />}
              {client.website && <InfoRow label="Website" value={client.website} />}
              {client.monthly_ad_budget && <InfoRow label="Monthly Budget" value={`$${client.monthly_ad_budget}`} />}
              <InfoRow label="Ads Remaining" value={String(client.ads_remaining)} />
              {client.notes && <InfoRow label="Notes" value={client.notes} />}
            </div>
          </div>

          {/* Client Login */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="font-semibold mb-3">Client Portal Access</h2>
            {client.client_user_id ? (
              <div className="text-sm text-green-400/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Client has portal access
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-white/40">Create a login for this client so they can approve ads</p>
                <input
                  type="email"
                  placeholder="Client email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/60"
                />
                <input
                  type="text"
                  placeholder="Temporary password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/60"
                />
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail || !invitePassword}
                  className="w-full px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Creating...' : 'Create Client Login'}
                </button>
                {inviteMsg && (
                  <p className={`text-xs ${inviteMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                    {inviteMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ads */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Ads ({ads.length})</h2>
            <Link
              href={`/admin/clients/${clientId}/ads/new`}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
            >
              + Create Ad
            </Link>
          </div>

          {ads.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <div className="text-white/30 mb-2">No ads created yet</div>
              <Link
                href={`/admin/clients/${clientId}/ads/new`}
                className="text-sm text-white/60 underline hover:text-white"
              >
                Create the first ad for this client
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ads.map((ad) => (
                <div key={ad.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium">{ad.title}</span>
                      <span className="ml-2 text-xs text-white/40">{ad.platform}</span>
                    </div>
                    <AdStatusBadge status={ad.status} />
                  </div>
                  {ad.ad_copy?.headline && (
                    <div className="text-sm text-white/60 mb-1">{ad.ad_copy.headline}</div>
                  )}
                  {ad.ad_copy?.body && (
                    <div className="text-sm text-white/40 mb-3 line-clamp-2">{ad.ad_copy.body}</div>
                  )}
                  {ad.client_feedback && (
                    <div className="text-sm bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 mb-3">
                      <span className="text-yellow-400/80 text-xs font-medium">Client feedback:</span>
                      <div className="text-white/60 mt-1">{ad.client_feedback}</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {ad.status === 'draft' && (
                      <button
                        onClick={() => handleSendForApproval(ad.id)}
                        className="px-3 py-1.5 bg-white text-black rounded-lg text-xs font-medium hover:bg-white/90"
                      >
                        Send for Approval
                      </button>
                    )}
                    {ad.budget_daily && (
                      <span className="text-xs text-white/40">${ad.budget_daily}/day</span>
                    )}
                    {ad.scheduled_for && (
                      <span className="text-xs text-white/40">Scheduled: {ad.scheduled_for}</span>
                    )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  )
}

function AdStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-white/10 text-white/60 border-white/20',
    pending_approval: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    live: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    paused: 'bg-white/10 text-white/40 border-white/20',
    completed: 'bg-white/10 text-white/40 border-white/20',
  }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${colors[status] || colors.draft}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
