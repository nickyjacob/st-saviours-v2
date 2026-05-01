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
  pitch_id: number
  pitch_name: string
  pitch_colour: string
}

const fmt = (t: string) => { const parts = t.slice(0,5).split(':'); const hr = parseInt(parts[0]); const mn = parts[1]; return `${hr > 12 ? hr-12 : hr === 0 ? 12 : hr}:${mn}${hr >= 12 ? 'pm' : 'am'}` }
const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('upcoming')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserRole(profile.role || '')
      const { data } = await supabase
        .from('public_planner')
        .select('*')
        .eq('user_id', session.user.id)
        .not('status', 'eq', 'cancelled')
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
      if (data) setBookings(data as Booking[])
      setLoading(false)
    }
    init()
  }, [])

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    setCancelling(id)
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    if (error) { alert('Failed to cancel. Please try again.'); setCancelling(null); return }
    setBookings(prev => prev.filter(b => b.id !== id))
    setCancelling(null)
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = bookings.filter(b => {
    if (timeFilter === 'upcoming' && b.booking_date < today) return false
    if (timeFilter === 'past' && b.booking_date >= today) return false
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    return true
  })

  function BookingCard({ b }: { b: Booking }) {
    const isApproved = b.status === 'approved'
    const isPending = b.status === 'pending'
    const bg = isApproved ? '#f1f8f1' : isPending ? '#fff8e1' : '#f5f5f5'
    const borderColour = isApproved ? '#2e7d32' : isPending ? '#f9ab2b' : '#9e9e9e'
    const borderStyle = isPending ? 'dashed' : 'solid'
    const pitchColour = isApproved ? '#2e7d32' : isPending ? '#f9ab2b' : '#9e9e9e'
    const cardStyle = { backgroundColor: bg, borderRadius: '8px', borderLeft: '4px ' + borderStyle + ' ' + borderColour, padding: '8px 12px', marginBottom: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#111' }}>{formatDate(b.booking_date)}</div>
            <div style={{ fontSize: '12px', color: '#374151', marginTop: '1px' }}>{fmt(b.start_time)} – {fmt(b.end_time)}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: pitchColour, marginTop: '1px' }}>{b.pitch_name}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{b.team_name} · {b.purpose}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: isApproved ? '#16a34a' : '#d97706' }}>{isApproved ? '● Booked' : '● Awaiting'}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <a href={`/edit-booking/${b.id}`} style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '11px', color: '#374151', textDecoration: 'none' }}>Edit</a>
              <button onClick={() => handleCancel(b.id)} disabled={cancelling === b.id} style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '11px', color: '#dc2626', backgroundColor: 'white', cursor: 'pointer' }}>
                {cancelling === b.id ? '...' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="My Bookings" userRole={userRole} />
      <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="My Bookings" userRole={userRole} />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111' }}>&#x1f4cb; My Bookings</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>View, edit or cancel your pitch requests</p>
          </div>
          <a href="/new-booking" style={{ backgroundColor: '#111', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>+ New Booking</a>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
            {['upcoming', 'past', 'all'].map(f => (
              <button key={f} onClick={() => setTimeFilter(f)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '500', backgroundColor: timeFilter === f ? '#111' : 'white', color: timeFilter === f ? 'white' : '#374151', border: 'none', cursor: 'pointer', textTransform: 'capitalize' }}>{f === 'all' ? 'All Dates' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
            {[['all', 'All Status'], ['approved', 'Booked'], ['pending', 'Awaiting']].map(([val, label]) => (
              <button key={val} onClick={() => setStatusFilter(val)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '500', backgroundColor: statusFilter === val ? '#111' : 'white', color: statusFilter === val ? 'white' : '#374151', border: 'none', cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#6b7280', alignSelf: 'center' }}>{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#888', backgroundColor: 'white', borderRadius: '10px' }}>
            <p style={{ fontSize: '15px', marginBottom: '12px' }}>No bookings found</p>
            <a href="/new-booking" style={{ backgroundColor: '#111', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>Make a booking</a>
          </div>
        ) : (
          <div>{filtered.map(b => <BookingCard key={b.id} b={b} />)}</div>
        )}
      </div>
    </div>
  )
}