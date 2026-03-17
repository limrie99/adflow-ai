'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/hooks/useSession'
import Sidebar from '@/components/Sidebar'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/agency', label: 'Website Scanner' },
  { href: '/agency/spy', label: 'Ad Spy' },
  { href: '/agency/top-ads', label: 'Top Ads' },
  { href: '/agency/playbook', label: 'Playbook' },
  { href: '/agency/monitors', label: 'Monitors' },
  { href: '/agency/brand', label: 'Brand Guide' },
]

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
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
        subtitle="Agency Portal"
        homeHref="/admin"
        navItems={NAV_ITEMS}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto md:ml-0 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
