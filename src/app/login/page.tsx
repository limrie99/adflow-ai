'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function Login() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Auto-confirmed signup (ENABLE_EMAIL_AUTOCONFIRM=true)
      if (data.session) {
        // Set token cookie
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`

        // Check role (handle_new_user trigger assigns role automatically)
        await routeByRole(data.session.access_token)
        return
      }

      setSuccess('Account created! You can now sign in.')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Set token cookie
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`

      // Route based on role
      await routeByRole(data.session.access_token)
      return
    }

    setLoading(false)
  }

  const routeByRole = async (token: string) => {
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) {
        router.push('/dashboard')
        return
      }

      // Check user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const role = roleData?.role || 'saas_user'

      // Set role cookie for middleware
      document.cookie = `user-role=${role}; path=/; max-age=${60 * 60 * 24 * 7}`

      if (role === 'admin') {
        router.push('/admin')
      } else if (role === 'client') {
        router.push('/client')
      } else {
        // saas_user — check if they have a business (onboarding)
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single()

        router.push(business ? '/dashboard' : '/onboarding')
      }
    } catch {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          AdFlow AI
        </Link>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-white/40 text-sm mb-8">
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-white/70 hover:text-white underline transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Password</label>
              <input
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            {success && (
              <div className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {loading
                ? mode === 'login' ? 'Signing in...' : 'Creating account...'
                : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              onClick={async () => {
                if (!email) {
                  setError('Enter your email first')
                  return
                }
                setLoading(true)
                await supabase.auth.resetPasswordForEmail(email)
                setSuccess('Password reset email sent.')
                setLoading(false)
              }}
              className="w-full text-center text-white/30 text-sm mt-4 hover:text-white/60 transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
