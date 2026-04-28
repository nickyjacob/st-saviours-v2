'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function DashboardPage() {
  const [userRole, setUserRole] = useState('')
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

      setUserRole(profile.role || '')
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Planner" userRole={userRole} />
      <main className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Pitch Planner</h1>
        <p className="text-gray-500 text-sm mt-1">St. Saviours GAA & LGFA</p>
        <p className="text-gray-400 mt-8">Calendar coming in next step...</p>
      </main>
    </div>
  )
}