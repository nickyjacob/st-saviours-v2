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
  const [recentResults, setRecentResults] = useState<{id: string; team_name: string; opposition: string; our_goals: number; our_points: number; our_two_pointers: number; their_goals: number; their_points: number; their_two_pointers: number; result: string; competition: string; match_date: string; sport: string}[]>([])

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
      const { data: resultData } = await supabase.from('results').select('*').order('match_date', { ascending: false }).limit(3)
      if (resultData) setRecentResults(resultData)
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
        {recentResults.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>🏆 Recent Results</h2>
              <a href="/results" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>View All →</a>
            </div>
            {recentResults.map(r => {
              const isAdultFootball = r.sport === "Men's/Boys Gaelic"
              const ourScore = isAdultFootball && r.our_two_pointers > 0 ? `${r.our_goals}-${r.our_points + (r.our_two_pointers * 2)} (${r.our_two_pointers}×2pt)` : `${r.our_goals}-${r.our_points}`
              const theirScore = isAdultFootball && r.their_two_pointers > 0 ? `${r.their_goals}-${r.their_points + (r.their_two_pointers * 2)} (${r.their_two_pointers}×2pt)` : `${r.their_goals}-${r.their_points}`
              const bg = r.result === 'win' ? '#f0fdf4' : r.result === 'loss' ? '#fef2f2' : '#fefce8'
              const border = r.result === 'win' ? '#2e7d32' : r.result === 'loss' ? '#dc2626' : '#f9ab2b'
              const label = r.result === 'win' ? '🟢 WIN' : r.result === 'loss' ? '🔴 LOSS' : '🟡 DRAW'
              return (
                <div key={r.id} style={{ backgroundColor: bg, borderLeft: `4px solid ${border}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: border, marginBottom: '2px' }}>{label} · {r.team_name}</div>
                      <div style={{ fontSize: '13px', color: '#111' }}>
                        <span style={{ fontWeight: '600' }}>St Saviours {ourScore}</span> v {r.opposition} {theirScore}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{r.competition} · {new Date(r.match_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <PitchCalendar userRole={userRole} currentUserId={currentUserId} />
      </main>
    </div>
  )
}