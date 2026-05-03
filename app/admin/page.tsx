'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  team_name: string
  purpose: string
  status: string
  pitch_name: string
  pitch_colour: string
  full_name: string
  user_id: string
  pitch_id: number
}

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  is_approved: boolean
}

interface Closure {
  id: string
  pitch_id: number
  reason: string
  start_date: string
  end_date: string
  pitch_name?: string
  pitch_colour?: string
}

interface LoginRecord {
  id: string
  logged_in_at: string
  user_id: string
  full_name?: string
  email?: string
}

const fmt = (t: string) => { const parts = t.slice(0,5).split(':'); const hr = parseInt(parts[0]); const mn = parts[1]; return `${hr > 12 ? hr-12 : hr === 0 ? 12 : hr}:${mn}${hr >= 12 ? 'pm' : 'am'}` }
const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const formatDateTime = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminPage() {
  const [tab, setTab] = useState('pending')
  const [currentUserId, setCurrentUserId] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [closures, setClosures] = useState<Closure[]>([])
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<Booking | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [closureModal, setClosureModal] = useState(false)
  const [pitches, setPitches] = useState<{id: number; name: string; colour: string}[]>([])
  const [newClosure, setNewClosure] = useState({ pitch_id: '', reason: '', start_date: '', end_date: '' })
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyUserFilter, setHistoryUserFilter] = useState('')
  const [historyDateFilter, setHistoryDateFilter] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved || profile.role !== 'admin') { window.location.href = '/dashboard'; return }
      setCurrentUserId(session.user.id)
      await Promise.all([fetchBookings(), fetchProfiles(), fetchClosures(), fetchPitches()])
      setLoading(false)
    }
    init()
  }, [])

  async function fetchBookings() {
    const { data } = await supabase.from('admin_bookings').select('*').order('booking_date').order('start_time')
    if (data) setBookings(data.map((b: Record<string, unknown>) => ({ ...b, pitch_name: b.pitch_name, pitch_colour: b.pitch_colour, full_name: b.full_name })) as Booking[])
  }

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('id, full_name, email, role, is_approved').order('full_name')
    if (data) setProfiles([...data].sort((a, b) => {
      if (!a.is_approved && b.is_approved) return -1
      if (a.is_approved && !b.is_approved) return 1
      return (a.full_name || '').localeCompare(b.full_name || '')
    }) as Profile[])
  }

  async function fetchClosures() {
    const { data } = await supabase.from('pitch_closures').select('*, pitches(name, colour)').order('start_date')
    if (data) setClosures(data.map((c: Record<string, unknown>) => {
      const p = c.pitches as {name: string; colour: string} | null
      return { ...c, pitch_name: p?.name || '', pitch_colour: p?.colour || '#888' }
    }) as Closure[])
  }

  async function fetchPitches() {
    const { data } = await supabase.from('pitches').select('id, name, colour').eq('is_active', true).order('sort_order')
    if (data) setPitches(data)
  }

  async function loadHistory() {
    setHistoryLoading(true)
    const { data: histData } = await supabase.from('login_history').select('id, logged_in_at, user_id').order('logged_in_at', { ascending: false }).limit(15)
    if (histData) {
      const enriched = histData.map(h => {
        const p = profiles.find(p => p.id === h.user_id)
        return { ...h, full_name: p?.full_name || '', email: p?.email || h.user_id }
      })
      setLoginHistory(enriched)
    }
    setHistoryLoaded(true)
    setHistoryLoading(false)
  }

  async function handleApprove(id: string) {
    await supabase.from('bookings').update({ status: 'approved', decided_by: currentUserId, decided_at: new Date().toISOString() }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'approved' } : b))
    try {
      const booking = bookings.find(b => b.id === id)
      if (booking) {
        const { data: profile } = await supabase.from('profiles').select('email').eq('id', booking.user_id).single()
        if (profile?.email) {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'booking_approved',
              userEmail: profile.email,
              booking: {
                team_name: booking.team_name,
                pitch_name: booking.pitch_name,
                date_display: new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                time_display: `${fmt(booking.start_time)} – ${fmt(booking.end_time)}`,
                purpose: booking.purpose,
              }
            })
          })
        }
      }
    } catch (emailErr) { console.error('Email failed:', emailErr) }
  }

  async function handleReject() {
    if (!rejectModal) return
    await supabase.from('bookings').update({ status: 'rejected', decided_by: currentUserId, decided_at: new Date().toISOString(), rejection_reason: rejectReason }).eq('id', rejectModal.id)
    setBookings(prev => prev.map(b => b.id === rejectModal.id ? { ...b, status: 'rejected' } : b))
    try {
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', rejectModal.user_id).single()
      if (profile?.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_rejected',
            userEmail: profile.email,
            booking: {
              team_name: rejectModal.team_name,
              pitch_name: rejectModal.pitch_name,
              date_display: new Date(rejectModal.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              time_display: `${fmt(rejectModal.start_time)} – ${fmt(rejectModal.end_time)}`,
              purpose: rejectModal.purpose,
            }
          })
        })
      }
    } catch (emailErr) { console.error('Email failed:', emailErr) }
    setRejectModal(null)
    setRejectReason('')
  }

  async function handleApproveUser(id: string) {
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_approved: true } : p))
  }

  async function handleSuspendUser(id: string) {
    await supabase.from('profiles').update({ is_approved: false }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_approved: false } : p))
  }

  async function handleToggleAdmin(id: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, role: newRole } : p))
  }

  async function handleAddClosure() {
    if (!newClosure.pitch_id || !newClosure.start_date || !newClosure.end_date) return
    const { data } = await supabase.from('pitch_closures').insert([{
      pitch_id: parseInt(newClosure.pitch_id),
      reason: newClosure.reason || 'Closed',
      start_date: newClosure.start_date,
      end_date: newClosure.end_date,
    }]).select('*, pitches(name, colour)').single()
    if (data) {
      const p = data.pitches as {name: string; colour: string} | null
      setClosures(prev => [...prev, { ...data, pitch_name: p?.name || '', pitch_colour: p?.colour || '#888' }])
    }
    setClosureModal(false)
    setNewClosure({ pitch_id: '', reason: '', start_date: '', end_date: '' })
  }

  async function handleRemoveClosure(id: string) {
    if (!confirm('Remove this closure?')) return
    await supabase.from('pitch_closures').delete().eq('id', id)
    setClosures(prev => prev.filter(c => c.id !== id))
  }

  const pending = bookings.filter(b => b.status === 'pending')
  const approved = bookings.filter(b => b.status === 'approved')
  const rejected = bookings.filter(b => b.status === 'rejected')
  const awaitingUsers = profiles.filter(p => !p.is_approved)
  const today = new Date().toISOString().split('T')[0]
  const upcomingClosures = closures.filter(c => c.end_date >= today)
  const pastClosures = closures.filter(c => c.end_date < today)

  const tabBookings = tab === 'pending' ? pending : tab === 'approved' ? approved : tab === 'rejected' ? rejected : []

  const inputStyle = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', backgroundColor: 'white' }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Admin" userRole="admin" />
      <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Admin" userRole="admin" />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>

        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>&#9881; Admin Panel</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Pending', value: pending.length, colour: '#f59e0b', border: '#f59e0b' },
            { label: 'Approved', value: approved.length, colour: '#16a34a', border: '#16a34a' },
            { label: 'Rejected', value: rejected.length, colour: '#dc2626', border: '#dc2626' },
            { label: 'Awaiting', value: awaitingUsers.length, colour: '#7c3aed', border: '#7c3aed' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '10px 6px', textAlign: 'center', border: `1px solid ${card.border}22`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: card.colour }}>{card.value}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { key: 'pending', label: `Pending (${pending.length})`, dot: '#f59e0b' },
            { key: 'approved', label: `Approved (${approved.length})`, dot: '#16a34a' },
            { key: 'rejected', label: `Rejected (${rejected.length})`, dot: '#dc2626' },
            { key: 'users', label: `Users (${profiles.length})`, dot: '#6b7280' },
            { key: 'closures', label: 'Closures', dot: '#111' },
            { key: 'history', label: 'History', dot: '#111' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'history' && !historyLoaded) loadHistory() }} style={{ padding: '4px 10px', borderRadius: '20px', border: '1px solid #d1d5db', fontSize: '11px', fontWeight: '500', backgroundColor: tab === t.key ? '#111' : 'white', color: tab === t.key ? 'white' : '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.dot, display: 'inline-block' }}></span>
              {t.label}
            </button>
          ))}
        </div>

        {['pending','approved','rejected'].includes(tab) && (
          <div>
            {tabBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888', backgroundColor: 'white', borderRadius: '10px' }}>No {tab} bookings</div>
            ) : tabBookings.map(b => (
              <div key={b.id} style={{ backgroundColor: 'white', borderRadius: '8px', borderLeft: `4px solid ${b.status === 'pending' ? '#f59e0b' : b.status === 'approved' ? '#16a34a' : '#dc2626'}`, padding: '12px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#111' }}>{b.full_name}</span>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{formatDate(b.booking_date)}</span>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{fmt(b.start_time)} – {fmt(b.end_time)}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: b.pitch_colour || '#2e7d32', fontWeight: '600', marginTop: '2px' }}>{b.pitch_name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{b.team_name} · {b.purpose}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(b.id)} style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#16a34a', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => { setRejectModal(b); setRejectReason('') }} style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                    </>
                  )}
                  {b.status === 'approved' && (
                    <button onClick={() => { setRejectModal(b); setRejectReason('') }} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #dc2626', color: '#dc2626', backgroundColor: 'white', fontSize: '13px', cursor: 'pointer' }}>Reject</button>
                  )}
                  <a href={`/edit-booking/${b.id}`} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #d1d5db', color: '#374151', fontSize: '13px', textDecoration: 'none' }}>Edit</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div>
            {profiles.map(p => (
              <div key={p.id} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111' }}>{p.full_name || p.email}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.email}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: p.role === 'admin' ? '#f3e8ff' : '#f1f5f9', color: p.role === 'admin' ? '#7c3aed' : '#475569', fontWeight: '500' }}>{p.role === 'admin' ? '⚙ Admin' : '👤 Coach'}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: p.is_approved ? '#f0fdf4' : '#fef9c3', color: p.is_approved ? '#16a34a' : '#854d0e', fontWeight: '500' }}>{p.is_approved ? '✅ Approved' : '⏳ Pending'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {p.id === currentUserId ? (
                    <span style={{ fontSize: '12px', color: '#6b7280', padding: '6px 12px' }}>You</span>
                  ) : (
                    <>
                      {!p.is_approved && <button onClick={() => handleApproveUser(p.id)} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#16a34a', color: 'white', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Approve</button>}
                      {p.is_approved && <button onClick={() => handleSuspendUser(p.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', color: '#374151', backgroundColor: 'white', fontSize: '12px', cursor: 'pointer' }}>Suspend</button>}
                      <button onClick={() => handleToggleAdmin(p.id, p.role)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #7c3aed', color: '#7c3aed', backgroundColor: 'white', fontSize: '12px', cursor: 'pointer' }}>{p.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'closures' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '600' }}>&#x1f512; Pitch Closures</h2>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Block pitches during maintenance, match days or events</p>
              </div>
              <button onClick={() => setClosureModal(true)} style={{ backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Add Closure</button>
            </div>
            {upcomingClosures.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.1em', marginBottom: '8px' }}>UPCOMING & ACTIVE ({upcomingClosures.length})</p>
                {upcomingClosures.map(c => (
                  <div key={c.id} style={{ backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #4b5563', padding: '10px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#111' }}>{c.pitch_name}</div>
                      <div style={{ fontSize: '12px', color: '#111' }}>&#x1f512; {c.reason}</div>
                      <div style={{ fontSize: '12px', color: '#374151' }}>{formatDate(c.start_date)} → {formatDate(c.end_date)}</div>
                    </div>
                    <button onClick={() => handleRemoveClosure(c.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', color: '#dc2626', backgroundColor: 'white', fontSize: '12px', cursor: 'pointer' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {pastClosures.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.1em', marginBottom: '8px' }}>PAST ({pastClosures.length})</p>
                {pastClosures.map(c => (
                  <div key={c.id} style={{ backgroundColor: 'white', borderRadius: '8px', borderLeft: '4px solid #d1d5db', padding: '10px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{c.pitch_name}</div>
                      <div style={{ fontSize: '12px', color: '#374151' }}>{c.reason}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(c.start_date)} → {formatDate(c.end_date)}</div>
                    </div>
                    <button onClick={() => handleRemoveClosure(c.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', color: '#6b7280', backgroundColor: 'white', fontSize: '12px', cursor: 'pointer' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {closures.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#888', backgroundColor: 'white', borderRadius: '10px' }}>No closures added</div>}
          </div>
        )}

        {tab === 'history' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111' }}>&#x1f4ca; Usage & Login History</h2>
              {historyLoaded && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    value={historyUserFilter}
                    onChange={e => setHistoryUserFilter(e.target.value)}
                    style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', color: '#111', backgroundColor: 'white' }}
                  >
                    <option value="">All Users</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.full_name || p.email}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={e => setHistoryDateFilter(e.target.value)}
                    style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', color: '#111', backgroundColor: 'white' }}
                  />
                  {(historyUserFilter || historyDateFilter) && (
                    <button onClick={() => { setHistoryUserFilter(''); setHistoryDateFilter('') }} style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'white' }}>Clear</button>
                  )}
                </div>
              )}
            </div>
            {!historyLoaded ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '10px' }}>
                <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '13px' }}>Login history is not loaded by default to keep things fast.</p>
                <button onClick={loadHistory} style={{ backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>Load Last 15 Logins</button>
              </div>
            ) : historyLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading...</div>
            ) : (
              <div>
                <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>User</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Email</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Logged In</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loginHistory
                      .filter(h => {
                        if (historyUserFilter && (h.full_name || h.email) !== historyUserFilter) return false
                        if (historyDateFilter && !h.logged_in_at.startsWith(historyDateFilter)) return false
                        return true
                      })
                      .map((h, i, arr) => (
                      <tr key={h.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#111', fontWeight: '500' }}>{h.full_name || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280' }}>{h.email}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#111' }}>{formatDateTime(h.logged_in_at)}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', textAlign: 'center' }}>Showing last 20 logins</p>
              </div>
            )}
          </div>
        )}
      </div>

      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>Reject Booking</h2>
            <p style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>{rejectModal.full_name} — {rejectModal.pitch_name}</p>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>{formatDate(rejectModal.booking_date)}, {fmt(rejectModal.start_time)}–{fmt(rejectModal.end_time)}</p>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#111', display: 'block', marginBottom: '6px' }}>Reason (will be emailed to the coach)</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Pitch already in use, maintenance scheduled..." rows={3} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setRejectModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', cursor: 'pointer', backgroundColor: 'white' }}>Cancel</button>
              <button onClick={handleReject} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Reject & Notify Coach</button>
            </div>
          </div>
        </div>
      )}

      {closureModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>&#x1f512; Add Pitch Closure</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Pitch</label>
              <select value={newClosure.pitch_id} onChange={e => setNewClosure(p => ({ ...p, pitch_id: e.target.value }))} style={{ ...inputStyle }}>
                <option value="">Select pitch...</option>
                {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Reason</label>
              <input value={newClosure.reason} onChange={e => setNewClosure(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Maintenance, Match Day" style={{ ...inputStyle }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Start Date</label>
                <input type="date" value={newClosure.start_date} onChange={e => setNewClosure(p => ({ ...p, start_date: e.target.value, end_date: e.target.value }))} style={{ ...inputStyle }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>End Date</label>
                <input type="date" value={newClosure.end_date} onChange={e => setNewClosure(p => ({ ...p, end_date: e.target.value }))} style={{ ...inputStyle }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setClosureModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', cursor: 'pointer', backgroundColor: 'white' }}>Cancel</button>
              <button onClick={handleAddClosure} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#111', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Add Closure</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}