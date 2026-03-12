'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  business_name: string
  contact_name: string
  contact_email: string
  niche: string
  website: string
  location: string
  status: string
  ads_remaining: number
  monthly_ad_budget: number | null
  created_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    niche: 'local_services',
    website: '',
    location: '',
    monthly_ad_budget: '',
    notes: '',
  })

  const fetchClients = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/admin/clients', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (data.clients) setClients(data.clients)
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await fetch('/api/admin/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...form,
        monthly_ad_budget: form.monthly_ad_budget ? parseFloat(form.monthly_ad_budget) : null,
      }),
    })

    setSaving(false)
    setShowForm(false)
    setForm({ business_name: '', contact_name: '', contact_email: '', contact_phone: '', niche: 'local_services', website: '', location: '', monthly_ad_budget: '', notes: '' })
    fetchClients()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-white/40">Loading...</div></div>
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-white/40 text-sm mt-1">{clients.length} total clients</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Client'}
        </button>
      </div>

      {/* New Client Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="font-semibold mb-4">New Client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Business Name *" value={form.business_name} onChange={(v) => setForm(f => ({ ...f, business_name: v }))} required />
            <Input label="Contact Name" value={form.contact_name} onChange={(v) => setForm(f => ({ ...f, contact_name: v }))} />
            <Input label="Contact Email" value={form.contact_email} onChange={(v) => setForm(f => ({ ...f, contact_email: v }))} type="email" />
            <Input label="Phone" value={form.contact_phone} onChange={(v) => setForm(f => ({ ...f, contact_phone: v }))} />
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Niche</label>
              <select
                value={form.niche}
                onChange={(e) => setForm(f => ({ ...f, niche: e.target.value }))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/60 transition-colors"
              >
                <option value="real_estate">Real Estate</option>
                <option value="law">Law</option>
                <option value="home_services">Home Services</option>
                <option value="medical_dental">Medical / Dental</option>
                <option value="local_services">Local Services</option>
                <option value="automotive">Automotive</option>
                <option value="wedding">Wedding</option>
              </select>
            </div>
            <Input label="Website" value={form.website} onChange={(v) => setForm(f => ({ ...f, website: v }))} />
            <Input label="Location" value={form.location} onChange={(v) => setForm(f => ({ ...f, location: v }))} />
            <Input label="Monthly Budget ($)" value={form.monthly_ad_budget} onChange={(v) => setForm(f => ({ ...f, monthly_ad_budget: v }))} type="number" />
          </div>
          <div className="mt-4">
            <Input label="Notes" value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} />
          </div>
          <button
            type="submit"
            disabled={saving || !form.business_name}
            className="mt-4 px-6 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Client'}
          </button>
        </form>
      )}

      {/* Clients List */}
      {clients.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <div className="text-white/30 text-lg mb-2">No clients yet</div>
          <div className="text-white/20 text-sm mb-4">Add your first client to get started</div>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
          >
            + Add Client
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/admin/clients/${client.id}`}
              className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                  {client.business_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{client.business_name}</div>
                  <div className="text-sm text-white/40">
                    {client.contact_name && `${client.contact_name} · `}
                    {client.niche?.replace('_', ' ')}
                    {client.location && ` · ${client.location}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm font-medium">{client.ads_remaining}</div>
                  <div className="text-xs text-white/40">ads remaining</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${
                  client.status === 'active' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                  client.status === 'paused' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
                  'bg-red-400/10 text-red-400 border-red-400/20'
                }`}>
                  {client.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm text-white/60 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
      />
    </div>
  )
}
