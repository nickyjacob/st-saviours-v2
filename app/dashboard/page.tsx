'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

interface Notice {
  id: string
  title: string
  body: string
  created_at: string
}

interface Fixture {
  id: string
  team_name: string
  opposition: string
  venue_name: string
  home_away: string
  fixture_date: string
  fixture_time: string
  competition: string
  sport: string
}

interface Result {
  id: string
  team_name: string
  opposition: string
  our_goals: number
  our_points: number
  our_two_pointers: number
  their_goals: number
  their_points: number
  their_two_pointers: number
  result: string
  competition: string
  match_date: string
  sport: string
}

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  pitch_name: string
  team_name: string
  status: string
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [dismissedNotices, setDismissedNotices] = useState<string[]>([])

  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedNotices') || '[]')
    setDismissedNotices(dismissed)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('full_name, role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserRole(profile.role || '')
      setFullName(profile.full_name || '')

      const today = new Date().toISOString().split('T')[0]

      const [noticeRes, fixtureRes, resultRes] = await Promise.all([
        supabase.from('notices').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('fixtures').select('*').gte('fixture_date', today).order('fixture_date', { ascending: true }).limit(2),
        supabase.from('results').select('*').order('match_date', { ascending: false }).limit(2),
      ])

      if (noticeRes.data) setNotices(noticeRes.data)
      if (fixtureRes.data) setFixtures(fixtureRes.data)
      if (resultRes.data) setResults(resultRes.data)

      if (profile.role === 'coach' || profile.role === 'admin') {
        const bookingRes = await supabase.from('bookings').select('id, booking_date, start_time, end_time, pitch_name, team_name, status').eq('status', 'approved').gte('booking_date', today).order('booking_date', { ascending: true }).limit(5)
        if (bookingRes.data) setBookings(bookingRes.data)
      }

      if (profile.role === 'admin') {
        const pendingRes = await supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'pending')
        setPendingCount(pendingRes.count || 0)
      }

      setLoading(false)
    }
    init()
  }, [])

  function dismissNotice(id: string) {
    const updated = [...dismissedNotices, id]
    setDismissedNotices(updated)
    localStorage.setItem('dismissedNotices', JSON.stringify(updated))
  }

  function fmt(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:${m}${hour >= 12 ? 'pm' : 'am'}`
  }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function formatScore(goals: number, points: number, twoPointers: number, sport: string) {
    const isAdultFootball = sport === "Men's/Boys Gaelic"
    if (isAdultFootball && twoPointers > 0) {
      return `${goals}-${points + (twoPointers * 2)} (${twoPointers}×2pt)`
    }
    return `${goals}-${points}`
  }

  const activeNotices = notices.filter(n => !dismissedNotices.includes(n.id))

  const navButtons: Record<string, { label: string; href: string; emoji: string; colour: string }[]> = {
    admin: [
      { label: 'Pitch Planner', href: '/planner', emoji: '📅', colour: '#2e7d32' },
      { label: 'New Booking', href: '/new-booking', emoji: '📋', colour: '#111' },
      { label: 'Fixtures', href: '/fixtures', emoji: '🏟', colour: '#2563eb' },
      { label: 'Results', href: '/results', emoji: '🏆', colour: '#d97706' },
      { label: 'My Bookings', href: '/my-bookings', emoji: '📁', colour: '#7c3aed' },
      { label: 'Session Plan', href: '/session-planner', emoji: '📋', colour: '#0891b2' },
      { label: 'Admin Panel', href: '/admin', emoji: '⚙️', colour: '#dc2626' },
      { label: 'Stats', href: '/stats', emoji: '📊', colour: '#374151' },
    ],
    coach: [
      { label: 'Pitch Planner', href: '/planner', emoji: '📅', colour: '#2e7d32' },
      { label: 'New Booking', href: '/new-booking', emoji: '📋', colour: '#111' },
      { label: 'Fixtures', href: '/fixtures', emoji: '🏟', colour: '#2563eb' },
      { label: 'Results', href: '/results', emoji: '🏆', colour: '#d97706' },
      { label: 'My Bookings', href: '/my-bookings', emoji: '📁', colour: '#7c3aed' },
      { label: 'Session Plan', href: '/session-planner', emoji: '📋', colour: '#0891b2' },
      { label: 'Physio', href: '/physio', emoji: '🏥', colour: '#dc2626' },
    ],
    player: [
      { label: 'Pitch Planner', href: '/planner', emoji: '📅', colour: '#2e7d32' },
      { label: 'Fixtures', href: '/fixtures', emoji: '🏟', colour: '#2563eb' },
      { label: 'Results', href: '/results', emoji: '🏆', colour: '#d97706' },
      { label: 'Physio', href: '/physio', emoji: '🏥', colour: '#dc2626' },
    ],
    viewer: [
      { label: 'Pitch Planner', href: '/planner', emoji: '📅', colour: '#2e7d32' },
      { label: 'Fixtures', href: '/fixtures', emoji: '🏟', colour: '#2563eb' },
      { label: 'Results', href: '/results', emoji: '🏆', colour: '#d97706' },
    ],
  }

  const buttons = navButtons[userRole] || navButtons.viewer

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Home" userRole={userRole} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Welcome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', backgroundColor: 'white', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <img src="/crest.png" alt="St Saviours" style={{ width: '52px', height: '52px', objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 'bold', color: '#111', margin: 0 }}>St. Saviours GAA & LGFA</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px', margin: 0 }}>Welcome back, {fullName} 👋</p>
          </div>
        </div>

        {/* Admin pending alert */}
        {userRole === 'admin' && pendingCount > 0 && (
          <a href="/admin" style={{ display: 'block', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#92400e' }}>{pendingCount} booking{pendingCount !== 1 ? 's' : ''} awaiting approval</span>
              <span style={{ fontSize: '12px', color: '#b45309', marginLeft: 'auto' }}>Review →</span>
            </div>
          </a>
        )}

        {/* Notices */}
        {activeNotices.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {activeNotices.map(n => (
              <div key={n.id} style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>📢</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e40af' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: '#1e3a8a', marginTop: '2px' }}>{n.body}</div>
                </div>
                <button onClick={() => dismissNotice(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: '16px', padding: '0', flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Quick action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {buttons.map(b => (
            <a key={b.href} href={b.href} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px 12px', textAlign: 'center', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '24px' }}>{b.emoji}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: b.colour }}>{b.label}</span>
            </a>
          ))}
        </div>

        {/* Upcoming fixtures */}
        {fixtures.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>📅 Upcoming Fixtures</h2>
              <a href="/fixtures" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>View All →</a>
            </div>
            {fixtures.map(f => (
              <div key={f.id} style={{ backgroundColor: 'white', borderLeft: `4px solid ${f.home_away === 'home' ? '#2e7d32' : '#2563eb'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: f.home_away === 'home' ? '#2e7d32' : '#2563eb', marginBottom: '2px' }}>{f.home_away === 'home' ? '🏠 Home' : '🚌 Away'} · {formatDate(f.fixture_date)}{f.fixture_time ? ` · ${fmt(f.fixture_time)}` : ''}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#111' }}>{f.team_name} vs {f.opposition}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>📍 {f.venue_name} · {f.competition}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent results */}
        {results.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>🏆 Recent Results</h2>
              <a href="/results" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>View All →</a>
            </div>
            {results.map(r => {
              const bg = r.result === 'win' ? '#f0fdf4' : r.result === 'loss' ? '#fef2f2' : '#fefce8'
              const border = r.result === 'win' ? '#2e7d32' : r.result === 'loss' ? '#dc2626' : '#f9ab2b'
              const label = r.result === 'win' ? '🟢 WIN' : r.result === 'loss' ? '🔴 LOSS' : '🟡 DRAW'
              return (
                <div key={r.id} style={{ backgroundColor: bg, borderLeft: `4px solid ${border}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: border, marginBottom: '2px' }}>{label} · {r.team_name}</div>
                  <div style={{ fontSize: '13px', color: '#111' }}>
                    <span style={{ fontWeight: '600' }}>St Saviours {formatScore(r.our_goals, r.our_points, r.our_two_pointers, r.sport)}</span>
                    {' v '}{r.opposition} {formatScore(r.their_goals, r.their_points, r.their_two_pointers, r.sport)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{r.competition} · {formatDate(r.match_date)}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* This week's bookings - coaches and admin only */}
        {(userRole === 'coach' || userRole === 'admin') && bookings.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>📋 Upcoming Bookings</h2>
              <a href="/my-bookings" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>View All →</a>
            </div>
            {bookings.map(b => (
              <div key={b.id} style={{ backgroundColor: '#f1f8f1', borderLeft: '4px solid #2e7d32', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#2e7d32', marginBottom: '2px' }}>{formatDate(b.booking_date)} · {fmt(b.start_time)} – {fmt(b.end_time)}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>{b.team_name}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>📍 {b.pitch_name}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}