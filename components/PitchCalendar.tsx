'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  team_name: string
  purpose: string
  status: string
  pitch_id: number
  user_id: string
  pitch_name: string
  pitch_colour: string
  full_name: string
}

interface Pitch {
  id: number
  name: string
  colour: string
}

const fmt = (t: string) => { const parts = t.slice(0,5).split(':'); const hr = parseInt(parts[0]); const mn = parts[1]; return `${hr > 12 ? hr-12 : hr === 0 ? 12 : hr}:${mn}${hr >= 12 ? 'pm' : 'am'}` }
function BookingModal({ booking, onClose, currentUserId, userRole }: { booking: Booking; onClose: () => void; currentUserId: string; userRole: string }) {
  const canEdit = booking.user_id === currentUserId || userRole === 'admin'
  const statusColour = booking.status === 'approved' ? 'bg-green-100 text-green-800' : booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{booking.team_name}</h2>
            <p className="text-gray-500 text-sm mt-1">{booking.purpose}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{fmt(booking.start_time)} - {fmt(booking.end_time)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Pitch</span><span className="font-medium">{booking.pitch_name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Booked by</span><span className="font-medium">{booking.full_name}</span></div>
          <div className="flex justify-between items-center"><span className="text-gray-500">Status</span><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColour}`}>{booking.status}</span></div>
        </div>
        {canEdit && (
          <div className="mt-6">
            <a href={`/edit-booking/${booking.id}`} className="block w-full bg-gray-900 text-white text-center py-3 rounded-lg font-semibold text-sm hover:bg-gray-700 transition-colors">Edit Booking</a>
          </div>
        )}
      </div>
    </div>
  )
}

function BookingCard({ booking, onClick, compact }: { booking: Booking; onClick: () => void; compact?: boolean }) {
  const isApproved = booking.status === 'approved'
  const isPending = booking.status === 'pending'
  const bg = isApproved ? '#f1f8f1' : isPending ? '#fff8e1' : '#f5f5f5'
  const borderColour = isApproved ? '#2e7d32' : isPending ? '#f9ab2b' : '#9e9e9e'
  const borderStyle = isPending ? 'dashed' : 'solid'
  const timeColour = isApproved ? '#2e7d32' : isPending ? '#f9ab2b' : '#9e9e9e'

  if (compact) {
    return (
      <div onClick={onClick} style={{ backgroundColor: bg, borderLeft: `3px ${borderStyle} ${borderColour}`, borderRadius: '4px', padding: '3px 5px', cursor: 'pointer' }}>
        <div style={{ color: timeColour, fontWeight: 'bold', fontSize: '10px' }}>{fmt(booking.start_time)}-{fmt(booking.end_time)}</div>
        <div style={{ color: '#111', fontWeight: 'bold', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.team_name}</div>
        <div style={{ color: '#888', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.full_name} - {booking.pitch_name}</div>
      </div>
    )
  }
  return (
    <div onClick={onClick} style={{ backgroundColor: bg, borderLeft: `4px ${borderStyle} ${borderColour}`, borderRadius: '6px', padding: '5px 7px', cursor: 'pointer' }}>
      <div style={{ color: timeColour, fontWeight: 'bold', fontSize: '11px' }}>{fmt(booking.start_time)}-{fmt(booking.end_time)}</div>
      <div style={{ color: '#111', fontWeight: 'bold', fontSize: '12px', marginTop: '1px' }}>{booking.team_name}</div>
      <div style={{ color: '#888', fontSize: '11px', marginTop: '1px', lineHeight: '1.3' }}>{booking.full_name} - {booking.pitch_name}</div>
    </div>
  )
}

export default function PitchCalendar({ userRole, currentUserId }: { userRole: string; currentUserId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [selectedPitch, setSelectedPitch] = useState('all')
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchPitches() }, [])
  useEffect(() => { fetchBookings() }, [currentDate, view])

  async function fetchPitches() {
    const { data } = await supabase.from('pitches').select('id, name, colour').eq('is_active', true).order('sort_order')
    if (data) setPitches(data)
  }

  async function fetchBookings() {
    setLoading(true)
    let start: Date, end: Date
    if (view === 'month') {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    } else {
      start = startOfWeek(currentDate, { weekStartsOn: 1 })
      end = endOfWeek(currentDate, { weekStartsOn: 1 })
    }
    const { data, error } = await supabase
      .from('public_planner')
      .select('*')
      .gte('booking_date', format(start, 'yyyy-MM-dd'))
      .lte('booking_date', format(end, 'yyyy-MM-dd'))
      .order('booking_date')
      .order('start_time')
    if (error) console.error('Planner fetch error:', error)
    if (data) setBookings(data as Booking[])
    setLoading(false)
  }

  function getBookingsForDay(date: Date) {
    return bookings.filter(b => {
      if (!isSameDay(new Date(b.booking_date + 'T00:00:00'), date)) return false
      if (selectedPitch !== 'all' && b.pitch_id !== parseInt(selectedPitch)) return false
      if (selectedTeam !== 'all' && b.team_name !== selectedTeam) return false
      return true
    })
  }

  const uniqueTeams = Array.from(new Set(bookings.map(b => b.team_name))).sort()

  function getWeekLabel() {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
    const we = endOfWeek(currentDate, { weekStartsOn: 1 })
    const sameMonth = format(ws, 'MMM') === format(we, 'MMM')
    return sameMonth ? `${format(ws, 'd')} - ${format(we, 'd MMM yyyy')}` : `${format(ws, 'd MMM')} - ${format(we, 'd MMM yyyy')}`
  }

  function renderWeekDayHeader(day: Date, i: number) {
    const today = isToday(day)
    return (
      <div key={i} style={{ textAlign: 'center', padding: '6px 2px', backgroundColor: today ? '#111' : '#1f2937', borderLeft: i > 0 ? '1px solid #374151' : 'none' }}>
        <div style={{ fontSize: '10px', fontWeight: '600', color: today ? '#9ca3af' : '#6b7280', letterSpacing: '0.05em' }}>{format(day, 'EEE').toUpperCase()}</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: today ? '#111' : 'white', backgroundColor: today ? 'white' : 'transparent', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto' }}>{format(day, 'd')}</div>
        <div style={{ fontSize: '10px', color: today ? '#9ca3af' : '#6b7280' }}>{format(day, 'MMM')}</div>
      </div>
    )
  }

  function renderMonthView() {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days: Date[] = []
    let day = startDate
    while (day <= endDate) { days.push(day); day = addDays(day, 1) }
    const weeks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
    return (
      <div className="month-grid-wrapper" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#111' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: '11px', fontWeight: '600', color: 'white' }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #e5e7eb' }}>
            {week.map((day, di) => {
              const dayBookings = getBookingsForDay(day)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              return (
                <div key={di} style={{ minHeight: '90px', padding: '4px', backgroundColor: inMonth ? 'white' : '#f9fafb', borderLeft: di > 0 ? '1px solid #e5e7eb' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '500', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: today ? '#111' : 'transparent', color: today ? 'white' : inMonth ? '#374151' : '#9ca3af' }}>{format(day, 'd')}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayBookings.slice(0,3).map(b => <BookingCard key={b.id} booking={b} onClick={() => setSelectedBooking(b)} compact />)}
                    {dayBookings.length > 3 && <div style={{ fontSize: '10px', color: '#9ca3af', paddingLeft: '4px' }}>+{dayBookings.length - 3} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  function renderWeekView() {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    return (
      <div className="week-grid-wrapper" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: '700px' }}>
          {days.map((day, i) => renderWeekDayHeader(day, i))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: '700px', borderTop: '1px solid #e5e7eb' }}>
          {days.map((day, di) => {
            const dayBookings = getBookingsForDay(day)
            return (
              <div key={di} style={{ minHeight: '180px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: isToday(day) ? '#f0fdf4' : 'white', borderLeft: di > 0 ? '1px solid #e5e7eb' : 'none' }}>
                {dayBookings.map(b => <BookingCard key={b.id} booking={b} onClick={() => setSelectedBooking(b)} />)}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>Pitch Planner</h1><p style={{ color: '#6b7280', fontSize: '13px' }}>St. Saviours GAA & LGFA</p></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', backgroundColor: 'white' }}>Print / Save</button>
          <a href="/new-booking" style={{ backgroundColor: '#111', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>+ New Booking</a>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', fontSize: '13px', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2e7d32', display: 'inline-block' }}></span>Booked</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px dashed #f9ab2b', display: 'inline-block' }}></span>Awaiting Approval</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#9e9e9e', display: 'inline-block' }}></span>Pitch Closed</span>
      
        <select value={selectedPitch} onChange={e => setSelectedPitch(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 12px', fontSize: '13px' }}>
          <option value="all">All Pitches</option>
          {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
        </select>
        <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 12px', fontSize: '13px' }}>
          <option value="all">All Teams</option>
          {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
          <button onClick={() => setView('week')} style={{ padding: '7px 16px', fontSize: '13px', fontWeight: '500', backgroundColor: view === 'week' ? '#111' : 'white', color: view === 'week' ? 'white' : '#374151', border: 'none', cursor: 'pointer' }}>Week</button>
          <button onClick={() => setView('month')} style={{ padding: '7px 16px', fontSize: '13px', fontWeight: '500', backgroundColor: view === 'month' ? '#111' : 'white', color: view === 'month' ? 'white' : '#374151', border: 'none', cursor: 'pointer' }}>Month</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))} style={{ border: '1px solid #d1d5db', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', backgroundColor: 'white' }}>&larr; Prev</button>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111', minWidth: '200px', textAlign: 'center' }}>{view === 'month' ? format(currentDate, 'MMMM yyyy') : getWeekLabel()}</h2>
          <button onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))} style={{ border: '1px solid #d1d5db', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', backgroundColor: 'white' }}>Next &rarr;</button>
        </div>
        <div style={{ width: '120px' }}></div>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading bookings...</div> : view === 'month' ? renderMonthView() : renderWeekView()}
      {selectedBooking && <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} currentUserId={currentUserId} userRole={userRole} />}
    </div>
  )
}