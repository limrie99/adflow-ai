'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '/' },
  { href: '/admin/clients', label: 'Clients', icon: '/' },
  { href: '/agency', label: 'Website Scanner', icon: '/' },
  { href: '/agency/spy', label: 'Ad Spy', icon: '/' },
  { href: '/agency/top-ads', label: 'Top Ads', icon: '/' },
  { href: '/agency/playbook', label: 'Playbook', icon: '/' },
  { href: '/agency/monitors', label: 'Monitors', icon: '/' },
  { href: '/agency/brand', label: 'Brand Guide', icon: '/' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; max-age=0'
    document.cookie = 'user-role=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col">
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/admin" className="text-lg font-bold tracking-tight">
            AdFlow AI
          </Link>
          <div className="text-xs text-white/40 mt-0.5">Agency Portal</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
