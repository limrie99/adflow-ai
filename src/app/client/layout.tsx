'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/hooks/useSession'
import Sidebar from '@/components/Sidebar'

const NAV_ITEMS = [
  { href: '/client', label: 'Dashboard' },
  { href: '/client/ads', label: 'My Ads' },
  { href: '/client/billing', label: 'Billing' },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useSession()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    await fetch('/api/auth/session', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar
        title="AdFlow AI"
        subtitle="Client Portal"
        homeHref="/client"
        navItems={NAV_ITEMS}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto md:ml-0 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
