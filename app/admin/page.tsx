'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  Check,
  CheckCircle,
  Clock,
  History,
  Lock,
  Megaphone,
  Settings,
  Stethoscope,
  Trophy,
  User,
  X,
} from 'lucide-react'
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
  const [bookingFilter, setBookingFilter] = useState('pending')
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
  const [notices, setNotices] = useState<{id: string; title: string; body: string; created_at: string; is_pinned: boolean; expires_at: string | null}[]>([])
  const [adminResults, setAdminResults] = useState<{id: string; team_name: string; opposition: string; our_goals: number; our_points: number; our_two_pointers: number; their_goals: number; their_points: number; their_two_pointers: number; result: string; competition: string; match_date: string; sport: string; notes: string}[]>([])
  const [physioRequests, setPhysioRequests] = useState<{id: string; player_id: string; injury_description: string; body_part: string; date_of_injury: string; urgency: string; status: string; admin_note: string; requested_at: string}[]>([])
  const [physioFilter, setPhysioFilter] = useState('pending')
  const [physioNote, setPhysioNote] = useState('')
  const [physioProfiles, setPhysioProfiles] = useState<Record<string, string>>({})
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeBody, setNoticeBody] = useState('')
  const [noticePinned, setNoticePinned] = useState(false)
  const [noticeExpiry, setNoticeExpiry] = useState('')
  const [noticeModal, setNoticeModal] = useState(false)
  const [editingNotice, setEditingNotice] = useState<{id: string} | null>(null)
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
      await Promise.all([fetchBookings(), fetchProfiles(), fetchClosures(), fetchPitches(), fetchNotices()])
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

  async function fetchNotices() {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false })
    if (data) setNotices(data)
  }

  async function fetchPhysioRequests() {
    const { data } = await supabase.from('physio_requests').select('*').order('requested_at', { ascending: false })
    if (data) {
      setPhysioRequests(data)
      const ids = Array.from(new Set(data.map((r: {player_id: string}) => r.player_id)))
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
        if (profiles) {
          const map: Record<string, string> = {}
          profiles.forEach((p: {id: string; full_name: string; email: string}) => { map[p.id] = p.full_name || p.email })
          setPhysioProfiles(map)
        }
      }
    }
  }

  async function handlePhysioDecision(id: string, status: string) {
    await supabase.from('physio_requests').update({ status, admin_note: physioNote, decided_at: new Date().toISOString(), decided_by: currentUserId }).eq('id', id)
    try {
      const req = physioRequests.find(r => r.id === id)
      if (req) {
        const { data: profile } = await supabase.from('profiles').select('email').eq('id', req.player_id).single()
        if (profile?.email) {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: status === 'approved' ? 'physio_approved' : 'physio_declined',
              userEmail: profile.email,
              booking: {
                team_name: req.body_part,
                pitch_name: req.body_part,
                date_display: new Date(req.date_of_injury + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                time_display: physioNote || '',
                purpose: req.injury_description,
              }
            })
          })
        }
        fetch('/api/notify-physio-decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: req.player_id,
            decision: status,
            body_part: req.body_part,
            injury_description: req.injury_description,
          }),
        }).catch(err => console.error('Push notify failed:', err))
      }
    } catch (e) { console.error('Email failed:', e) }
    setPhysioNote('')
    await fetchPhysioRequests()
  }

  async function fetchAdminResults() {
    const { data } = await supabase.from('results').select('*').order('match_date', { ascending: false })
    if (data) setAdminResults(data)
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
        fetch('/api/notify-booking-decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: booking.user_id,
            decision: 'approved',
            team_name: booking.team_name,
            pitch_name: booking.pitch_name,
            date_display: new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
            time_display: `${fmt(booking.start_time)}–${fmt(booking.end_time)}`,
          }),
        }).catch(err => console.error('Push notify failed:', err))
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
      fetch('/api/notify-booking-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: rejectModal.user_id,
          decision: 'rejected',
          team_name: rejectModal.team_name,
          pitch_name: rejectModal.pitch_name,
          date_display: new Date(rejectModal.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
          time_display: `${fmt(rejectModal.start_time)}–${fmt(rejectModal.end_time)}`,
        }),
      }).catch(err => console.error('Push notify failed:', err))
    } catch (emailErr) { console.error('Email failed:', emailErr) }
    setRejectModal(null)
    setRejectReason('')
  }

    async function handleNoticeSubmit() {
    if (!noticeTitle || !noticeBody) return
    if (editingNotice) {
      await supabase.from('notices').update({
        title: noticeTitle,
        body: noticeBody,
        is_pinned: noticePinned,
        expires_at: noticeExpiry ? new Date(noticeExpiry + 'T23:59:59').toISOString() : null
      }).eq('id', editingNotice.id)
    } else {
      await supabase.from('notices').insert({
        title: noticeTitle,
        body: noticeBody,
        created_by: currentUserId,
        is_pinned: noticePinned,
        expires_at: noticeExpiry ? new Date(noticeExpiry + 'T23:59:59').toISOString() : null
      })
      fetch('/api/notify-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noticeTitle }),
      }).catch(err => console.error('Push notify failed:', err))
    }
    setNoticeModal(false)
    setNoticeTitle('')
    setNoticeBody('')
    setNoticePinned(false)
    setNoticeExpiry('')
    setEditingNotice(null)
    fetchNotices()
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
    // Email all coaches about the closure
    try {
      const pitchName = pitches.find(p => String(p.id) === newClosure.pitch_id)?.name || 'Pitch'
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pitch_closure',
          booking: {
            pitch_name: pitchName,
            date_display: `${new Date(newClosure.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${newClosure.start_date !== newClosure.end_date ? ` to ${new Date(newClosure.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`,
            purpose: newClosure.reason || 'Closed',
          }
        })
      })
    } catch (e) { console.error('Closure email failed:', e) }
  }

  async function handleRemoveClosure(id: string) {
    if (!confirm('Remove this closure?')) return
    await supabase.from('pitch_closures').delete().eq('id', id)
    setClosures(prev => prev.filter(c => c.id !== id))
  }

  const pending = bookings.filter(b => b.status === 'pending')
  const approved = bookings.filter(b => b.status === 'approved')
  const rejected = bookings.filter(b => b.status === 'rejected')
  const today = new Date().toISOString().split('T')[0]
  const upcomingClosures = closures.filter(c => c.end_date >= today)
  const pastClosures = closures.filter(c => c.end_date < today)

  const isBookingsTab = ['pending', 'approved', 'rejected'].includes(tab)
  const tabBookings = tab === 'pending' ? pending : tab === 'approved' ? approved : tab === 'rejected' ? rejected : []

  const inputStyle = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', backgroundColor: 'white' }

  if (loading) return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Admin" userRole="admin" />
      <div className="p-12 text-center text-neutral">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Admin" userRole="admin" />
      <div className="mx-auto max-w-[1100px] px-4 py-6">

        <h1 className="mb-5 flex items-center gap-2 text-[22px] font-bold text-ink">
          <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
          Admin Panel
        </h1>

        <div className={`flex flex-wrap gap-1.5 ${isBookingsTab ? 'mb-2' : 'mb-5'}`}>
          {[
            { key: 'bookings', label: 'Bookings', dot: 'bg-ink', selectedClass: 'border-ink bg-ink text-white' },
            { key: 'users', label: `Users (${profiles.length})`, dot: 'bg-neutral', selectedClass: 'border-neutral bg-neutral text-white' },
            { key: 'closures', label: 'Closures', dot: 'bg-ink', selectedClass: 'border-neutral bg-neutral text-white' },
            { key: 'notices', label: 'Notices', dot: 'bg-info', selectedClass: 'border-info bg-info text-white' },
            { key: 'results', label: 'Results', dot: 'bg-approved', selectedClass: 'border-approved bg-approved text-white' },
            { key: 'physio', label: 'Physio', dot: 'bg-rejected', selectedClass: 'border-rejected bg-rejected text-white' },
            { key: 'history', label: 'History', dot: 'bg-ink', selectedClass: 'border-neutral bg-neutral text-white' },
          ].map(t => {
            const selected = t.key === 'bookings' ? isBookingsTab : tab === t.key
            return (
              <button key={t.key} onClick={() => { if (t.key === 'bookings') { if (!isBookingsTab) setTab(bookingFilter) } else { setTab(t.key); if (t.key === 'history' && !historyLoaded) loadHistory(); if (t.key === 'results') fetchAdminResults(); if (t.key === 'physio') fetchPhysioRequests() } }} className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${selected ? t.selectedClass : 'border-gray-200 bg-white text-ink'}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${selected ? 'bg-white' : t.dot}`}></span>
                {t.label}
              </button>
            )
          })}
        </div>
        {isBookingsTab && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {[
              { key: 'pending', label: `Pending (${pending.length})`, dot: 'bg-pending', selectedClass: 'border-pending bg-pending text-white' },
              { key: 'approved', label: `Approved (${approved.length})`, dot: 'bg-approved', selectedClass: 'border-approved bg-approved text-white' },
              { key: 'rejected', label: `Rejected (${rejected.length})`, dot: 'bg-rejected', selectedClass: 'border-rejected bg-rejected text-white' },
            ].map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setBookingFilter(t.key) }} className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tab === t.key ? t.selectedClass : 'border-gray-200 bg-white text-ink'}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${tab === t.key ? 'bg-white' : t.dot}`}></span>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {isBookingsTab && (
          <div>
            {tabBookings.length === 0 ? (
              <div className="rounded-[10px] bg-white px-4 py-10 text-center text-neutral">No {tab} bookings</div>
            ) : tabBookings.map(b => (
              <div key={b.id} className={`mb-2 flex items-center justify-between rounded-lg border-l-4 bg-white px-4 py-3 shadow-sm ${b.status === 'pending' ? 'border-l-pending' : b.status === 'approved' ? 'border-l-approved' : 'border-l-rejected'}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-semibold text-ink">{b.full_name}</span>
                    <span className="text-[13px] text-ink">{formatDate(b.booking_date)}</span>
                    <span className="text-[13px] text-ink">{fmt(b.start_time)} – {fmt(b.end_time)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.pitch_colour || '#888' }} aria-hidden="true" />
                    {b.pitch_name}
                  </div>
                  <div className="text-xs text-neutral">{b.team_name} · {b.purpose}</div>
                </div>
                <div className="ml-3 flex gap-1.5">
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(b.id)} className="cursor-pointer rounded-md border-none bg-approved px-3.5 py-1.5 text-[13px] font-semibold text-white">Approve</button>
                      <button onClick={() => { setRejectModal(b); setRejectReason('') }} className="cursor-pointer rounded-md border-none bg-rejected px-3.5 py-1.5 text-[13px] font-semibold text-white">Reject</button>
                    </>
                  )}
                  {b.status === 'approved' && (
                    <button onClick={() => { setRejectModal(b); setRejectReason('') }} className="cursor-pointer rounded-md border border-rejected bg-white px-3.5 py-1.5 text-[13px] text-rejected">Reject</button>
                  )}
                  <a href={`/edit-booking/${b.id}`} className="rounded-md border border-gray-200 px-3.5 py-1.5 text-[13px] text-ink no-underline">Edit</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div>
            {profiles.map(p => (
              <div key={p.id} className="mb-2 flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
                <div>
                  <div className="text-sm font-semibold text-ink">{p.full_name || p.email}</div>
                  <div className="text-xs text-neutral">{p.email}</div>
                  <div className="mt-1.5 flex gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[11px] font-medium ${p.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-neutral/10 text-neutral'}`}>
                      {p.role === 'admin' ? <Settings className="h-3 w-3" aria-hidden="true" /> : <User className="h-3 w-3" aria-hidden="true" />}
                      {p.role === 'admin' ? 'Admin' : 'Coach'}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[11px] font-medium ${p.is_approved ? 'bg-approved/10 text-approved' : 'bg-pending/10 text-pending'}`}>
                      {p.is_approved ? <CheckCircle className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
                      {p.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {p.id === currentUserId ? (
                    <span className="px-3 py-1.5 text-xs text-neutral">You</span>
                  ) : (
                    <>
                      {!p.is_approved && <button onClick={() => handleApproveUser(p.id)} className="cursor-pointer rounded-md border-none bg-approved px-3 py-1.5 text-xs font-semibold text-white">Approve</button>}
                      {p.is_approved && <button onClick={() => handleSuspendUser(p.id)} className="cursor-pointer rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-ink">Suspend</button>}
                      <button onClick={() => handleToggleAdmin(p.id, p.role)} className="cursor-pointer rounded-md border border-accent bg-white px-3 py-1.5 text-xs text-accent">{p.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'closures' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Pitch Closures
                </h2>
                <p className="text-xs text-neutral">Block pitches during maintenance, match days or events</p>
              </div>
              <button onClick={() => setClosureModal(true)} className="cursor-pointer rounded-lg border-none bg-ink px-4 py-2 text-[13px] font-semibold text-white">+ Add Closure</button>
            </div>
            {upcomingClosures.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-bold tracking-widest text-neutral">UPCOMING & ACTIVE ({upcomingClosures.length})</p>
                {upcomingClosures.map(c => (
                  <div key={c.id} className="mb-1.5 flex items-center justify-between rounded-lg border-l-4 border-l-neutral bg-gray-50 px-3.5 py-2.5">
                    <div>
                      <div className="text-[13px] font-semibold text-ink">{c.pitch_name}</div>
                      <div className="flex items-center gap-1 text-xs text-ink">
                        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {c.reason}
                      </div>
                      <div className="text-xs text-ink">{formatDate(c.start_date)} → {formatDate(c.end_date)}</div>
                    </div>
                    <button onClick={() => handleRemoveClosure(c.id)} className="cursor-pointer rounded-md border border-rejected/40 bg-white px-2.5 py-1 text-xs text-rejected">Remove</button>
                  </div>
                ))}
              </div>
            )}
            {pastClosures.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold tracking-widest text-neutral">PAST ({pastClosures.length})</p>
                {pastClosures.map(c => (
                  <div key={c.id} className="mb-1.5 flex items-center justify-between rounded-lg border-l-4 border-l-gray-200 bg-white px-3.5 py-2.5 opacity-60">
                    <div>
                      <div className="text-[13px] font-semibold text-ink">{c.pitch_name}</div>
                      <div className="text-xs text-ink">{c.reason}</div>
                      <div className="text-xs text-neutral">{formatDate(c.start_date)} → {formatDate(c.end_date)}</div>
                    </div>
                    <button onClick={() => handleRemoveClosure(c.id)} className="cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-neutral">Remove</button>
                  </div>
                ))}
              </div>
            )}
            {closures.length === 0 && <div className="rounded-[10px] bg-white px-4 py-10 text-center text-neutral">No closures added</div>}
          </div>
        )}

        {tab === 'physio' && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
              <Stethoscope className="h-4 w-4 shrink-0" aria-hidden="true" />
              Physio Requests
            </h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {['pending', 'approved', 'declined'].map(s => {
                const count = physioRequests.filter(r => r.status === s).length
                const selected = physioFilter === s
                const toneClass = s === 'approved'
                  ? (selected ? 'border-approved bg-approved text-white' : 'border-approved bg-white text-approved')
                  : s === 'declined'
                    ? (selected ? 'border-rejected bg-rejected text-white' : 'border-rejected bg-white text-rejected')
                    : (selected ? 'border-pending bg-pending text-white' : 'border-pending bg-white text-pending')
                return (
                  <button key={s} onClick={() => setPhysioFilter(s)} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold ${toneClass}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                  </button>
                )
              })}
            </div>
            {physioRequests.filter(r => r.status === physioFilter).length === 0 && (
              <div className="rounded-[10px] bg-white px-4 py-10 text-center text-neutral">No {physioFilter} requests</div>
            )}
            {physioRequests.filter(r => r.status === physioFilter).map(r => (
              <div key={r.id} className={`mb-2 rounded-lg border-l-4 px-4 py-3 ${r.status === 'approved' ? 'border-l-approved bg-approved/10' : r.status === 'declined' ? 'border-l-rejected bg-rejected/10' : 'border-l-pending bg-pending/10'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="mb-0.5 text-[13px] font-bold text-ink">{physioProfiles[r.player_id] || r.player_id}</div>
                    <div className="mb-1 text-[13px] text-ink"><span className="font-semibold">{r.body_part}</span> — {r.injury_description}</div>
                    <div className="flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral">
                        <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {new Date(r.date_of_injury + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] ${r.urgency === 'urgent' ? 'font-bold text-rejected' : 'text-neutral'}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${r.urgency === 'urgent' ? 'bg-rejected' : 'bg-pending'}`} />
                        {r.urgency === 'urgent' ? 'Urgent' : 'Routine'}
                      </span>
                      <span className="text-[11px] text-neutral">Submitted: {new Date(r.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {r.status === 'pending' && (
                      <div className="mt-2.5">
                        <input value={physioNote} onChange={e => setPhysioNote(e.target.value)} placeholder="Optional note to player..." className="mb-2 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-ink outline-none" />
                        <div className="flex gap-2">
                          <button onClick={() => handlePhysioDecision(r.id, 'approved')} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border-none bg-approved px-1.5 py-1.5 text-xs font-semibold text-white">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Approve
                          </button>
                          <button onClick={() => handlePhysioDecision(r.id, 'declined')} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border-none bg-rejected px-1.5 py-1.5 text-xs font-semibold text-white">
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            Decline
                          </button>
                        </div>
                      </div>
                    )}
                    {r.admin_note && <div className="mt-2 text-xs italic text-ink">Note: {r.admin_note}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'results' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                Match Results
              </h2>
              <a href="/results" className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white no-underline">+ Post Result</a>
            </div>
            {adminResults.length === 0 && (
              <div className="rounded-[10px] bg-white px-4 py-10 text-center text-neutral">No results yet</div>
            )}
            {adminResults.map(r => {
              const isAdultFootball = r.sport === "Men's/Boys Gaelic"
              const ourScore = isAdultFootball && r.our_two_pointers > 0 ? `${r.our_goals}-${r.our_points + (r.our_two_pointers * 2)} (${r.our_two_pointers}×2pt)` : `${r.our_goals}-${r.our_points}`
              const theirScore = isAdultFootball && r.their_two_pointers > 0 ? `${r.their_goals}-${r.their_points + (r.their_two_pointers * 2)} (${r.their_two_pointers}×2pt)` : `${r.their_goals}-${r.their_points}`
              const tone = r.result === 'win' ? 'approved' : r.result === 'loss' ? 'rejected' : 'pending'
              const label = r.result === 'win' ? 'WIN' : r.result === 'loss' ? 'LOSS' : 'DRAW'
              const cardClass = tone === 'approved'
                ? 'border-l-approved bg-approved/10 text-approved'
                : tone === 'rejected'
                  ? 'border-l-rejected bg-rejected/10 text-rejected'
                  : 'border-l-pending bg-pending/10 text-pending'
              const dotClass = tone === 'approved' ? 'bg-approved' : tone === 'rejected' ? 'bg-rejected' : 'bg-pending'
              return (
                <div key={r.id} className={`mb-2 flex items-center justify-between rounded-lg border-l-4 px-3.5 py-2.5 ${cardClass}`}>
                  <div>
                    <div className="mb-0.5 flex items-center gap-1.5 text-xs font-bold">
                      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
                      {label} · {r.team_name}
                    </div>
                    <div className="text-[13px] text-ink"><span className="font-semibold">St Saviours {ourScore}</span> v {r.opposition} {theirScore}</div>
                    <div className="mt-0.5 text-[11px] text-neutral">{r.competition} · {new Date(r.match_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <button onClick={async () => { if (!confirm('Delete this result?')) return; await supabase.from('results').delete().eq('id', r.id); fetchAdminResults() }} className="cursor-pointer rounded-md border border-rejected/40 bg-white px-2.5 py-1 text-xs text-rejected">Delete</button>
                </div>
              )
            })}
          </div>
        )}
        {tab === 'notices' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
                Notices & Announcements
              </h2>
              <button onClick={() => setNoticeModal(true)} className="cursor-pointer rounded-lg border-none bg-ink px-4 py-2 text-[13px] font-semibold text-white">+ Add Notice</button>
            </div>
            {notices.length === 0 && (
              <div className="rounded-[10px] bg-white px-4 py-10 text-center text-neutral">No notices yet</div>
            )}
            {notices.map(n => (
              <div key={n.id} className="mb-2 rounded-lg border-l-4 border-l-info bg-white px-4 py-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink">{n.title}</div>
                    <div className="mt-1 text-[13px] text-ink">{n.body}</div>
                    <div className="mt-1.5 text-[11px] text-neutral">{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div className="ml-3 flex gap-1.5">
                    <button onClick={() => { setEditingNotice({ id: n.id }); setNoticeTitle(n.title); setNoticeBody(n.body); setNoticePinned(n.is_pinned || false); setNoticeExpiry(n.expires_at ? n.expires_at.split('T')[0] : ''); setNoticeModal(true) }} className="cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-ink">Edit</button>
                    <button onClick={async () => { await supabase.from('notices').delete().eq('id', n.id); fetchNotices() }} className="cursor-pointer rounded-md border border-rejected/40 bg-white px-2.5 py-1 text-xs text-rejected">Remove</button>
                  </div>
                </div>
              </div>
            ))}
            {noticeModal && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111' }}>{editingNotice ? '📢 Edit Notice' : '📢 Add Notice'}</h2>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#111', display: 'block', marginBottom: '6px' }}>Title</label>
                    <input type="text" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} placeholder="e.g. Pitch closed this Saturday" style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#111', outline: 'none', backgroundColor: 'white' }} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#111', display: 'block', marginBottom: '6px' }}>Message</label>
                    <textarea value={noticeBody} onChange={e => setNoticeBody(e.target.value)} placeholder="Enter your announcement here..." rows={2} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#111', outline: 'none', backgroundColor: 'white', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#111', display: 'block', marginBottom: '6px' }}>Expiry Date (optional)</label>
                      <input type="date" value={noticeExpiry} onChange={e => setNoticeExpiry(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#111', outline: 'none', backgroundColor: 'white' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '24px' }}>
                      <input type="checkbox" id="pinned" checked={noticePinned} onChange={e => setNoticePinned(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                      <label htmlFor="pinned" style={{ fontSize: '13px', fontWeight: '600', color: '#111', cursor: 'pointer' }}>📌 Pin this notice</label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={() => { setNoticeModal(false); setNoticeTitle(''); setNoticeBody(''); setNoticePinned(false); setNoticeExpiry(''); setEditingNotice(null) }} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: '600', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleNoticeSubmit} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#111', color: 'white', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>{editingNotice ? 'Update Notice' : 'Post Notice'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'history' && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <History className="h-4 w-4 shrink-0" aria-hidden="true" />
                Usage & Login History
              </h2>
              {historyLoaded && (
                <div className="flex flex-wrap gap-2">
                  <select
                    value={historyUserFilter}
                    onChange={e => setHistoryUserFilter(e.target.value)}
                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-ink"
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
                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-ink"
                  />
                  {(historyUserFilter || historyDateFilter) && (
                    <button onClick={() => { setHistoryUserFilter(''); setHistoryDateFilter('') }} className="cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-ink">Clear</button>
                  )}
                </div>
              )}
            </div>
            {!historyLoaded ? (
              <div className="rounded-[10px] bg-white px-4 py-10 text-center">
                <p className="mb-3 text-[13px] text-neutral">Login history is not loaded by default to keep things fast.</p>
                <button onClick={loadHistory} className="cursor-pointer rounded-lg border-none bg-ink px-4 py-2 text-[13px] text-white">Load Last 15 Logins</button>
              </div>
            ) : historyLoading ? (
              <div className="px-4 py-10 text-center text-neutral">Loading...</div>
            ) : (
              <div>
                <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                  <table className="w-full border-collapse">
                    <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-neutral">User</th>
                      <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-neutral">Email</th>
                      <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-neutral">Logged In</th>
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
                      <tr key={h.id} className={i < arr.length - 1 ? 'border-b border-gray-100' : ''}>
                        <td className="px-3.5 py-2.5 text-[13px] font-medium text-ink">{h.full_name || '—'}</td>
                        <td className="px-3.5 py-2.5 text-[13px] text-neutral">{h.email}</td>
                        <td className="px-3.5 py-2.5 text-[13px] text-ink">{formatDateTime(h.logged_in_at)}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-center text-xs text-neutral">Showing last 20 logins</p>
              </div>
            )}
          </div>
        )}
      </div>

      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>Reject Booking</h2>
            <p style={{ fontSize: '13px', color: '#111', marginBottom: '4px' }}>{rejectModal.full_name} — {rejectModal.pitch_name}</p>
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
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111' }}>&#x1f512; Add Pitch Closure</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px', color: '#111' }}>Pitch</label>
              <select value={newClosure.pitch_id} onChange={e => setNewClosure(p => ({ ...p, pitch_id: e.target.value }))} style={{ ...inputStyle }}>
                <option value="">Select pitch...</option>
                {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px', color: '#111' }}>Reason</label>
              <input value={newClosure.reason} onChange={e => setNewClosure(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Maintenance, Match Day" style={{ ...inputStyle }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px', color: '#111' }}>Start Date</label>
                <input type="date" value={newClosure.start_date} onChange={e => setNewClosure(p => ({ ...p, start_date: e.target.value, end_date: e.target.value }))} style={{ ...inputStyle }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px', color: '#111' }}>End Date</label>
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