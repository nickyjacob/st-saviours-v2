'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, is_approved')
        .eq('id', session.user.id)
        .single()

      if (!profile || !profile.is_approved) {
        window.location.href = '/pending'
        return
      }

      setUserName(profile.full_name || session.user.email || 'User')
      setLoading(false)
    }

    checkAuth()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-bold text-lg">St. Saviours GAA & LGFA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{userName}</span>
          <button
            onClick={handleLogout}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Welcome back, {userName}. Phase 1 complete ✓</p>
      </main>
    </div>
  )
}