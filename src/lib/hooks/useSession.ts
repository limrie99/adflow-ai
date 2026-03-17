'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const REFRESH_INTERVAL_MS = 50 * 60 * 1000 // 50 minutes

/**
 * Auto-refreshes the Supabase session token and updates the signed session cookie.
 * Call this once in each authenticated layout.
 */
export function useSession() {
  const refreshing = useRef(false)

  useEffect(() => {
    const refresh = async () => {
      if (refreshing.current) return
      refreshing.current = true

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Refresh the Supabase session
        const { data } = await supabase.auth.refreshSession()
        if (data.session) {
          // Update the signed server-side session cookie with the new token
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: data.session.access_token }),
          })
        }
      } catch {
        // Silent fail — next interval will retry
      } finally {
        refreshing.current = false
      }
    }

    // Refresh on mount
    refresh()

    // Then every 50 minutes
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
