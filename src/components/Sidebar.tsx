'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
}

interface SidebarProps {
  title: string
  subtitle: string
  homeHref: string
  navItems: NavItem[]
  onLogout: () => void
}

export default function Sidebar({ title, subtitle, homeHref, navItems, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const nav = (
    <>
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <Link href={homeHref} className="text-lg font-bold tracking-tight">
            {title}
          </Link>
          <div className="text-xs text-white/40 mt-0.5">{subtitle}</div>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-white/40 hover:text-white text-xl"
          aria-label="Close menu"
        >
          &times;
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== homeHref && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
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
          onClick={onLogout}
          className="w-full px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-white/10 p-2 rounded-lg"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile slide-over */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-white/10 flex flex-col transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {nav}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/10 flex-col">
        {nav}
      </aside>
    </>
  )
}
