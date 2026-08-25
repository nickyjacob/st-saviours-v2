'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

if (signInError) {
  if (signInError.message.toLowerCase().includes('email not confirmed')) {
    window.location.href = '/pending'
    return
  }
  setError(signInError.message)
  setLoading(false)
  return
}

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Could not retrieve user. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      setError('Could not load profile. Please contact admin.')
      setLoading(false)
      return
    }

    if (!profile.is_approved) {
      window.location.href = '/pending'
      return
    }

    try {
      await supabase.from('login_history').insert({ user_id: user.id, logged_in_at: new Date().toISOString() })
    } catch (e) { console.error('Login history error:', e) }
    window.location.href = '/dashboard'
  }

  const inputClass = 'w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-4 text-sm text-ink outline-none focus:outline-none focus:ring-2 focus:ring-approved'

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
  <img
  src="/crest.png"
  alt="St. Saviours GAA Club Crest"
  className="w-36 h-36 object-contain mb-4"
/>
          <h1 className="text-2xl font-bold text-gray-900">St. Saviours GAA & LGFA</h1>
          <p className="text-gray-500 text-sm mt-1">Club App</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <div className="flex justify-between text-sm mt-2">
            <a href="/forgot-password" className="text-gray-500 hover:text-gray-900">Forgot password?</a>
            <a href="/register" className="text-gray-500 hover:text-gray-900">Create account</a>
          </div>
        </form>
      </div>
    </div>
  )
}
