'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Package {
  id: string
  name: string
  ad_count: number
  price: number
}

interface Payment {
  id: string
  amount: number
  description: string
  status: string
  created_at: string
}

interface ClientInfo {
  business_name: string
  ads_remaining: number
}

export default function BillingPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const headers = { Authorization: `Bearer ${session.access_token}` }

      const res = await fetch('/api/client/billing', { headers })
      const data = await res.json()

      if (data.packages) setPackages(data.packages)
      if (data.payments) setPayments(data.payments)
      if (data.client) setClientInfo(data.client)
      setLoading(false)
    }
    load()
  }, [])

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ package_id: packageId }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to start checkout')
      }
    } catch {
      alert('Failed to start checkout')
    }

    setPurchasing(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-white/40">Loading...</div></div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Billing</h1>
      <p className="text-white/40 text-sm mb-8">Buy extra ad credits and view payment history</p>

      {/* Current Balance */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <div className="text-sm text-white/40 mb-1">Ad Credits Remaining</div>
        <div className="text-3xl font-bold">{clientInfo?.ads_remaining || 0}</div>
      </div>

      {/* Packages */}
      <h2 className="font-semibold mb-4">Buy Extra Ads</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col">
            <div className="text-lg font-bold mb-1">{pkg.name}</div>
            <div className="text-sm text-white/40 mb-4">{pkg.ad_count} ad{pkg.ad_count > 1 ? 's' : ''}</div>
            <div className="text-2xl font-bold mb-4">${pkg.price}</div>
            <div className="text-xs text-white/30 mb-4">${(pkg.price / pkg.ad_count).toFixed(0)} per ad</div>
            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={purchasing === pkg.id}
              className="mt-auto px-4 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {purchasing === pkg.id ? 'Loading...' : 'Purchase'}
            </button>
          </div>
        ))}
      </div>

      {/* Payment History */}
      <h2 className="font-semibold mb-4">Payment History</h2>
      {payments.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
          No payments yet
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {payments.map((payment, i) => (
            <div
              key={payment.id}
              className={`flex items-center justify-between p-4 ${i > 0 ? 'border-t border-white/5' : ''}`}
            >
              <div>
                <div className="text-sm font-medium">{payment.description || 'Ad Package'}</div>
                <div className="text-xs text-white/40">{new Date(payment.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">${payment.amount}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  payment.status === 'paid' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                  payment.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
                  'bg-red-400/10 text-red-400 border-red-400/20'
                }`}>
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
