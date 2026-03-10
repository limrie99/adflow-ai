'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Step = 'niche' | 'details' | 'connect'

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('niche')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    niche: '' as string,
    business_name: '',
    location: '',
    website: '',
    phone: '',
  })

  const handleNicheSelect = (niche: string) => {
    setForm((f) => ({ ...f, niche }))
    setStep('details')
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.from('businesses').insert({
      user_id: user.id,
      name: form.business_name,
      niche: form.niche,
      location: form.location,
      website: form.website,
      phone: form.phone,
    })

    setLoading(false)
    if (!error) {
      setStep('connect')
    }
  }

  const handleFinish = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {(['niche', 'details', 'connect'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                ['niche', 'details', 'connect'].indexOf(step) >= i
                  ? 'bg-white'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {step === 'niche' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">What type of business?</h1>
            <p className="text-white/50 mb-8">We'll tailor your ads and outreach to your niche.</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'home_services', label: 'Home Services', desc: 'Plumbers, roofers, HVAC, electricians' },
                { value: 'medical_dental', label: 'Medical & Dental', desc: 'Dentists, med spas, chiropractors' },
                { value: 'real_estate', label: 'Real Estate', desc: 'Agents, brokers, property managers' },
                { value: 'law', label: 'Legal', desc: 'Personal injury, divorce, immigration' },
                { value: 'local_services', label: 'Local Services', desc: 'Salons, gyms, massage studios' },
                { value: 'automotive', label: 'Automotive', desc: 'Auto repair, dealerships, detailing' },
                { value: 'wedding', label: 'Wedding', desc: 'Photographers, venues, planners' },
              ].map((n) => (
                <button
                  key={n.value}
                  onClick={() => handleNicheSelect(n.value)}
                  className="border border-white/20 rounded-xl p-6 text-left hover:border-white/60 hover:bg-white/5 transition-all"
                >
                  <div className="font-semibold mb-1">{n.label}</div>
                  <div className="text-white/40 text-sm">{n.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'details' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Your business details</h1>
            <p className="text-white/50 mb-8">This powers your ad targeting and copy.</p>
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              {[
                { name: 'business_name', label: 'Business name', placeholder: 'Smith & Associates', required: true },
                { name: 'location', label: 'City & State', placeholder: 'Austin, TX', required: true },
                { name: 'website', label: 'Website', placeholder: 'https://yoursite.com', required: false },
                { name: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000', required: false },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm text-white/60 mb-1.5">{field.label}</label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    required={field.required}
                    value={form[field.name as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {step === 'connect' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Connect your ad accounts</h1>
            <p className="text-white/50 mb-8">Connect Meta or Google to deploy ads. You can skip and connect later.</p>
            <div className="space-y-3 mb-8">
              {[
                { name: 'Meta (Facebook & Instagram)', desc: 'Deploy to Facebook and Instagram feeds', status: 'Connect' },
                { name: 'Google Ads', desc: 'Deploy to Google Search and Display', status: 'Connect' },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between border border-white/10 rounded-xl p-4">
                  <div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-white/40 text-xs mt-0.5">{p.desc}</div>
                  </div>
                  <button className="text-xs border border-white/30 px-3 py-1.5 rounded-lg hover:border-white/60 transition-colors">
                    {p.status}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleFinish}
              className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
