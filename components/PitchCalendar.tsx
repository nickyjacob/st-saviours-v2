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
  pitch_name?: string
  pitch_colour?: string
  booked_by?: string
}

interface Pitch {
  id: number
  name: string
  colour: string
}

interface BookingModalProps {
  booking: Booking
  onClose: () => void
  currentUserId: string
  userRole: string
}

function BookingModal({ booking, onClose, currentUserId, userRole }: BookingModalProps) {
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
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-medium">{booking.booking_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span className="font-medium">{booking.start_time.slice(0,5)} - {booking.end_time.slice(0,5)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Pitch</span>
            <span className="font-medium">{booking.pitch_name || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Booked by</span>
            <span className="font-medium">{booking.booked_by || 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColour}`}>{booking.status}</span>
          </div>
        </div>
        {canEdit && (
          <div className="mt-6">
            <a href={`/edit-booking/${booking.id}`} className="block w-full bg-gray-900 text-white text-center py-3 rounded-lg font-semibold text-sm hover:bg-gray-700 transition-colors">
              Edit Booking
            </a>
          </div>
        )}
      </div>
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
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, team_name, purpose, status, pitch_id, user_id')
      .gte('booking_date', format(start, 'yyyy-MM-dd'))
      .lte('booking_date', format(end, 'yyyy-MM-dd'))
      .order('start_time')
    if (!bookingData) { setLoading(false); return }
    const { data: profileData } = await supabase.from('profiles').select('id, full_name')
    const { data: pitchData } = await supabase.from('pitches').select('id, name, colour')
    const enriched = bookingData.map(b => ({
      ...b,
      pitch_name: pitchData?.find(p => p.id === b.pitch_id)?.name || '',
      pitch_colour: pitchData?.find(p => p.id === b.pitch_id)?.colour || '#1a5c2e',
      booked_by: profileData?.find(p => p.id === b.user_id)?.full_name || '',
    }))
    setBookings(enriched)
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

  function getCardStyle(booking: Booking): React.CSSProperties {
    if (booking.status === 'approved') {
      const colour = booking.pitch_colour || '#1a5c2e'
      return { backgroundColor: colour + '22', borderLeft: `4px solid ${colour}`, color: '#1a3a1a' }
    }
    if (booking.status === 'pending') {
      return { backgroundColor: '#fffbeb', borderLeft: '4px dashed #f59e0b', color: '#92400e' }
    }
    return { backgroundColor: '#f9fafb', borderLeft: '4px solid #d1d5db', color: '#6b7280' }
  }

  function getMonthCardStyle(booking: Booking): React.CSSProperties {
    if (booking.status === 'approved') {
      const colour = booking.pitch_colour || '#1a5c2e'
      return { backgroundColor: colour, borderLeft: `3px solid ${colour}`, color: 'white' }
    }
    if (booking.status === 'pending') {
      return { backgroundColor: '#fffbeb', borderLeft: '3px dashed #f59e0b', color: '#92400e' }
    }
    return { backgroundColor: '#f3f4f6', borderLeft: '3px solid #9ca3af', color: '#6b7280' }
  }

  const uniqueTeams = Array.from(new Set(bookings.map(b => b.team_name))).sort()

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
      <div className="month-grid-wrapper border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-900">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-white py-3">{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-gray-200">
            {week.map((day, di) => {
              const dayBookings = getBookingsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const todayClass = isToday(day) ? 'bg-gray-900 text-white' : ''
              return (
                <div key={di} className={`min-h-24 p-1 border-l border-gray-200 ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="flex justify-end">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${todayClass} ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayBookings.slice(0,3).map(booking => (
                      <div key={booking.id} onClick={() => setSelectedBooking(booking)} style={getMonthCardStyle(booking)} className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="font-semibold truncate">{booking.team_name}</div>
                        <div className="opacity-80">{booking.start_time.slice(0,5)}</div>
                      </div>
                    ))}
                    {dayBookings.length > 3 && <div className="text-xs text-gray-500 pl-1">+{dayBookings.length - 3} more</div>}
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
      <div className="week-grid-wrapper border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-900">
          {days.map((day, i) => (
            <div key={i} className="text-center py-3">
              <div className="text-xs font-semibold text-gray-400">{format(day, 'EEE').toUpperCase()}</div>
              <div className={`text-sm font-bold mt-1 w-8 h-8 flex items-center justify-center rounded-full mx-auto ${isToday(day) ? 'bg-white text-gray-900' : 'text-white'}`}>{format(day, 'd')}</div>
              <div className="text-xs text-gray-400">{format(day, 'MMM')}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-gray-200">
          {days.map((day, di) => {
            const dayBookings = getBookingsForDay(day)
            return (
              <div key={di} className="min-h-48 p-2 space-y-2 bg-white">
                {dayBookings.map(booking => (
                  <div key={booking.id} onClick={() => setSelectedBooking(booking)} style={getCardStyle(booking)} className="text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="font-bold" style={{color: booking.status === 'approved' ? booking.pitch_colour || '#1a5c2e' : 'inherit'}}>{booking.start_time.slice(0,5)}-{booking.end_time.slice(0,5)}</div>
                    <div className="font-semibold">{booking.team_name}</div>
                    <div className="opacity-70">{booking.booked_by} - {booking.pitch_name}</div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pitch Planner</h1>
          <p className="text-gray-500 text-sm">St. Saviours GAA & LGFA</p>
        </div>
        <div className="flex gap-2">
          <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Print / Save</button>
          <a href="/new-booking" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700">+ New Booking</a>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-700 inline-block"></span> Booked</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Awaiting Approval</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> Pitch Closed</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select value={selectedPitch} onChange={e => setSelectedPitch(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="all">All Pitches</option>
          {pitches.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="all">All Teams</option>
          {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button onClick={() => setView('week')} className={`px-4 py-2 text-sm font-medium ${view === 'week' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Week</button>
          <button onClick={() => setView('month')} className={`px-4 py-2 text-sm font-medium ${view === 'month' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Month</button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">&larr; Prev</button>
        <h2 className="text-lg font-semibold text-gray-900">{view === 'month' ? format(currentDate, 'MMMM yyyy') : 'This Week'}</h2>
        <button onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Next &rarr;</button>
      </div>
      {loading ? <div className="text-center py-12 text-gray-500">Loading bookings...</div> : view === 'month' ? renderMonthView() : renderWeekView()}
      {selectedBooking && (
        <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} currentUserId={currentUserId} userRole={userRole} />
      )}
    </div>
  )
}