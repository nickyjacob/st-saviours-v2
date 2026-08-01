'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import PitchCalendar from '@/components/PitchCalendar'

export default function DashboardPage() {
  const [userRole, setUserRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<{id: string; title: string; body: string; created_at: string}[]>([])

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
      const { data: noticeData } = await supabase.from('notices').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5)
      if (noticeData) setNotices(noticeData)
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
        {notices.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            {notices.map(n => (
              <div key={n.id} style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📢</span>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e40af' }}>{n.title}</div>
                  <div style={{ fontSize: '13px', color: '#1e3a8a', marginTop: '2px' }}>{n.body}</div>
                  <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px' }}>{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <PitchCalendar userRole={userRole} currentUserId={currentUserId} />
      </main>
    </div>
  )
}