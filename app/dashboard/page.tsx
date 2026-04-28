'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import PitchCalendar from '@/components/PitchCalendar'

export default function DashboardPage() {
  const [userRole, setUserRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
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
      setCurrentUserId(session.user.id)
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
      <main className="p-6">
        <PitchCalendar userRole={userRole} currentUserId={currentUserId} />
      </main>
    </div>
  )
}