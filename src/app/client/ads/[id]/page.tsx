'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Ad {
  id: string
  title: string
  platform: string
  status: string
  ad_copy: { headline?: string; body?: string; cta?: string }
  targeting: { audience?: string; location?: string; age_range?: string; interests?: string[] }
  budget_daily: number | null
  scheduled_for: string | null
  client_feedback: string | null
  created_at: string
}

export default function AdDetailPage() {
  const params = useParams()
  const router = useRouter()
  const adId = params.id as string

  const [ad, setAd] = useState<Ad | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/client/ads', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      const found = data.ads?.find((a: Ad) => a.id === adId)
      if (found) {
        setAd(found)
        setFeedback(found.client_feedback || '')
      }
      setLoading(false)
    }
    load()
  }, [adId])

  const handleAction = async (action: 'approve' | 'reject') => {
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const updates: Record<string, string> = {
      id: adId,
      status: action === 'approve' ? 'approved' : 'rejected',
    }

    if (feedback.trim()) {
      updates.client_feedback = feedback
    }

    if (action === 'approve') {
      updates.approved_at = new Date().toISOString()
    } else {
      updates.rejected_at = new Date().toISOString()
    }

    const res = await fetch('/api/client/ads', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(updates),
    })

    const data = await res.json()
    setSubmitting(false)

    if (data.ad) {
      setAd(data.ad)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-white/40">Loading...</div></div>
  }

  if (!ad) {
    return <div className="p-8 text-white/40">Ad not found</div>
  }

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => router.push('/client/ads')} className="text-white/40 hover:text-white text-sm mb-6">&larr; Back to Ads</button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{ad.title}</h1>
          <div className="text-sm text-white/40 mt-0.5">
            {ad.platform} · Created {new Date(ad.created_at).toLocaleDateString()}
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full border ${
          ad.status === 'pending_approval' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
          ad.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
          ad.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          ad.status === 'live' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
          'bg-white/10 text-white/40 border-white/20'
        }`}>
          {ad.status.replace('_', ' ')}
        </span>
      </div>

      {/* Ad Preview */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <div className="text-xs text-white/40 mb-4 uppercase tracking-wider">Ad Preview</div>
        <div className="bg-white/[0.03] rounded-xl p-6">
          {ad.ad_copy?.headline && (
            <h2 className="text-lg font-semibold mb-3">{ad.ad_copy.headline}</h2>
          )}
          {ad.ad_copy?.body && (
            <p className="text-white/70 mb-4 whitespace-pre-wrap leading-relaxed">{ad.ad_copy.body}</p>
          )}
          {ad.ad_copy?.cta && (
            <div className="inline-block px-5 py-2 bg-white text-black rounded-lg text-sm font-medium">
              {ad.ad_copy.cta}
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {ad.budget_daily && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-white/40 mb-1">Daily Budget</div>
            <div className="font-semibold">${ad.budget_daily}</div>
          </div>
        )}
        {ad.scheduled_for && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-white/40 mb-1">Scheduled For</div>
            <div className="font-semibold">{ad.scheduled_for}</div>
          </div>
        )}
      </div>

      {/* Approve/Reject Section */}
      {ad.status === 'pending_approval' && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
          <h3 className="font-semibold mb-3 text-yellow-400">Review Required</h3>
          <p className="text-sm text-white/40 mb-4">Approve this ad to go live, or reject it with feedback for changes.</p>

          <div className="mb-4">
            <label className="block text-sm text-white/60 mb-1.5">Feedback (optional)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add any notes or requested changes..."
              rows={3}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAction('approve')}
              disabled={submitting}
              className="px-6 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Approve Ad'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={submitting}
              className="px-6 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              Request Changes
            </button>
          </div>
        </div>
      )}

      {/* Previous feedback */}
      {ad.client_feedback && ad.status !== 'pending_approval' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mt-4">
          <div className="text-xs text-white/40 mb-2">Your Feedback</div>
          <div className="text-sm text-white/60">{ad.client_feedback}</div>
        </div>
      )}
    </div>
  )
}
