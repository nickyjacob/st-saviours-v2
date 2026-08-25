'use client'

import { useEffect, useState } from 'react'
import { Bus, Home, MapPin } from 'lucide-react'
import Badge from '@/components/ui/Badge'
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

interface Closure {
  id: string
  pitch_id: number
  reason: string
  start_date: string
  end_date: string
  pitch_name: string
  pitch_colour: string
}

interface Pitch {
  id: number
  name: string
  colour: string
}

const fmt = (t: string) => { const parts = t.slice(0,5).split(':'); const hr = parseInt(parts[0]); const mn = parts[1]; return `${hr > 12 ? hr-12 : hr === 0 ? 12 : hr}:${mn}${hr >= 12 ? 'pm' : 'am'}` }

function sportPrefix(sport: string) {
  return sport && sport !== 'Other' ? `${sport} · ` : ''
}

function formatFixtureLine(f: { sport: string; team_name: string; opposition: string }) {
  return `${sportPrefix(f.sport)}${f.team_name} vs ${f.opposition}`
}

function HomeAwayMark({ homeAway, showLabel = true, iconClassName = 'h-3 w-3' }: { homeAway: string; showLabel?: boolean; iconClassName?: string }) {
  const isHome = homeAway === 'home'
  const Icon = isHome ? Home : Bus
  return (
    <>
      <Icon className={`inline shrink-0 align-middle ${iconClassName}`} aria-hidden="true" />
      {showLabel ? (isHome ? ' Home' : ' Away') : null}
    </>
  )
}

function BookingModal({ booking, onClose, currentUserId, userRole }: { booking: Booking; onClose: () => void; currentUserId: string; userRole: string }) {
  const canEdit = booking.user_id === currentUserId || userRole === 'admin'
  const statusColour = booking.status === 'approved' ? 'bg-approved/10 text-approved' : booking.status === 'pending' ? 'bg-pending/10 text-pending' : 'bg-rejected/10 text-rejected'
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-ink">{booking.team_name}</h2>
            <p className="text-neutral text-sm mt-1">{booking.purpose}</p>
          </div>
          <button onClick={onClose} className="text-neutral/60 hover:text-neutral text-2xl leading-none">&times;</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-neutral">Date</span><span className="font-semibold text-ink">{new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          <div className="flex justify-between"><span className="text-neutral">Time</span><span className="font-semibold text-ink">{fmt(booking.start_time)} - {fmt(booking.end_time)}</span></div>
          <div className="flex justify-between"><span className="text-neutral">Pitch</span><span className="font-semibold text-ink">{booking.pitch_name}</span></div>
          <div className="flex justify-between"><span className="text-neutral">Booked by</span><span className="font-semibold text-ink">{booking.full_name}</span></div>
          <div className="flex justify-between items-center"><span className="text-neutral">Status</span><span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColour}`}>{booking.status}</span></div>
        </div>
        {canEdit && (
          <div className="mt-6">
            <a href={`/edit-booking/${booking.id}`} className="block w-full bg-ink text-white text-center py-3 rounded-lg font-semibold text-sm hover:bg-ink/90 transition-colors">Edit Booking</a>
          </div>
        )}
      </div>
    </div>
  )
}

function BookingCard({ booking, onClick, compact }: { booking: Booking; onClick: () => void; compact?: boolean }) {
  const isApproved = booking.status === 'approved'
  const isPending = booking.status === 'pending'
  const statusClasses = isApproved
    ? 'bg-approved/10 border-l-approved border-solid'
    : isPending
      ? 'bg-pending/10 border-l-pending border-solid'
      : 'bg-rejected/10 border-l-rejected border-solid'
  const timeClasses = isApproved ? 'text-approved' : isPending ? 'text-pending' : 'text-rejected'
  const pendingBadge = isPending ? <Badge tone="pending" variant="solid">Pending</Badge> : null
  if (compact) {
    return (
      <div onClick={onClick} className={`cursor-pointer rounded border-l-[3px] px-[5px] py-[3px] ${statusClasses}`}>
        <div className={`${timeClasses} text-[10px] font-bold`}>{fmt(booking.start_time)}-{fmt(booking.end_time)}</div>
        <div className="text-[11px] font-bold text-ink truncate">{booking.team_name}</div>
        {pendingBadge}
        <div className="text-[10px] text-neutral truncate">{booking.full_name} - {booking.pitch_name}</div>
      </div>
    )
  }
  return (
    <div onClick={onClick} className={`cursor-pointer rounded-md border-l-4 px-[7px] py-[5px] ${statusClasses}`}>
      <div className={`${timeClasses} text-[11px] font-bold`}>{fmt(booking.start_time)}-{fmt(booking.end_time)}</div>
      <div className="text-[12px] font-bold text-ink mt-px">{booking.team_name}</div>
      {pendingBadge}
      <div className="text-[11px] text-neutral mt-px leading-snug">{booking.full_name} - {booking.pitch_name}</div>
    </div>
  )
}

function MobileBookingRow({ b, onClick }: { b: Booking; onClick: () => void }) {
  const isApproved = b.status === 'approved'
  const isPending = b.status === 'pending'
  const statusClasses = isApproved
    ? 'bg-approved/10 border-l-approved border-solid'
    : isPending
      ? 'bg-pending/10 border-l-pending border-solid'
      : 'bg-rejected/10 border-l-rejected border-solid'
  const timeClasses = isApproved ? 'text-approved' : isPending ? 'text-pending' : 'text-rejected'
  const badgeClasses = isApproved
    ? 'bg-approved/10 text-approved'
    : 'bg-rejected/10 text-rejected'
  return (
    <div onClick={onClick} className={`mb-[5px] flex cursor-pointer items-center justify-between gap-2 rounded-md border-l-4 px-2.5 py-1.5 ${statusClasses}`}>
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-bold ${timeClasses}`}>{fmt(b.start_time)}-{fmt(b.end_time)} · {b.pitch_name}</div>
        <div className="truncate text-[13px] font-bold text-ink">{b.team_name}</div>
        <div className="truncate text-[11px] text-neutral">{b.full_name} · {b.purpose}</div>
      </div>
      {isPending ? (
        <Badge tone="pending" variant="solid" className="shrink-0">Pending</Badge>
      ) : (
        <span className={`shrink-0 whitespace-nowrap rounded-full px-[7px] py-0.5 text-[10px] font-semibold ${badgeClasses}`}>
          {isApproved ? 'Booked' : 'Declined'}
        </span>
      )}
    </div>
  )
}

export default function PitchCalendar({ userRole, currentUserId }: { userRole: string; currentUserId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isMobile, setIsMobile] = useState(false)
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [selectedPitch, setSelectedPitch] = useState('all')
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedFixture, setSelectedFixture] = useState<{id: string; team_name: string; opposition: string; venue_name: string; home_away: string; fixture_date: string; fixture_time: string; competition: string; sport: string; notes: string} | null>(null)
  const [loading, setLoading] = useState(true)
  const [closures, setClosures] = useState<Closure[]>([])
  const [fixtures, setFixtures] = useState<{id: string; team_name: string; opposition: string; venue_name: string; home_away: string; fixture_date: string; fixture_time: string; competition: string; sport: string; notes: string}[]>([])
  const [calendarView, setCalendarView] = useState<'bookings' | 'fixtures' | 'all'>('all')

  useEffect(() => {
    const mobile = window.innerWidth < 768
    setIsMobile(mobile)
    if (mobile) setView('week')

    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => { fetchPitches() }, [])
  useEffect(() => { fetchClosures() }, [])
  useEffect(() => { fetchFixtures() }, [])
  useEffect(() => { fetchBookings() }, [currentDate, view, selectedDay])

  async function fetchPitches() {
    const { data } = await supabase.from('pitches').select('id, name, colour').eq('is_active', true).order('sort_order')
    if (data) setPitches(data)
  }

  async function fetchFixtures() {
    const { data } = await supabase.from('fixtures').select('*').order('fixture_date', { ascending: true })
    if (data) setFixtures(data)
  }

  async function fetchClosures() {
    const { data } = await supabase.from('pitch_closures').select('*, pitches(name, colour)')
    if (data) setClosures(data.map((c: Record<string, unknown>) => {
      const p = c.pitches as {name: string; colour: string} | null
      return { ...c, pitch_name: p?.name || '', pitch_colour: p?.colour || '#888' }
    }) as Closure[])
  }

  async function fetchBookings() {
    setLoading(true)
    let start: Date, end: Date
    if (view === 'month') {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    } else if (view === 'day') {
      start = selectedDay
      end = selectedDay
    } else if (view === 'week' && isMobile) {
      start = startOfWeek(currentDate, { weekStartsOn: 1 })
      end = endOfWeek(currentDate, { weekStartsOn: 1 })
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

  function getDayFixtures(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return fixtures.filter(f => f.fixture_date === dateStr)
  }

  function getClosuresForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return closures.filter(c => {
      if (dateStr < c.start_date || dateStr > c.end_date) return false
      if (selectedPitch !== 'all' && c.pitch_id !== parseInt(selectedPitch)) return false
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

  function getDayLabel(): React.ReactNode {
    if (isToday(selectedDay)) {
      return (
        <>
          <span className="shrink-0">Today</span>
          <span className="shrink-0 text-[11px] font-medium text-neutral overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            · {format(selectedDay, 'EEE, d MMM yyyy')}
          </span>
        </>
      )
    }
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (isSameDay(selectedDay, tomorrow)) return 'Tomorrow'
    return format(selectedDay, 'EEE, d MMM yyyy')
  }

  function renderDayView() {
    const dayBookings = calendarView !== 'fixtures' ? getBookingsForDay(selectedDay) : []
    const dayClosures = getClosuresForDay(selectedDay)
    const dayFixtures = calendarView !== 'bookings' ? getDayFixtures(selectedDay) : []
    return (
      <div>
        {dayClosures.map(c => (
          <div key={c.id} className="mb-2 rounded-lg border-l-4 border-l-neutral bg-neutral/10 px-3.5 py-2.5">
            <div className="text-[13px] font-semibold text-ink">&#x1f512; Pitch Closed — {c.pitch_name}</div>
            <div className="mt-0.5 text-[11px] text-neutral">{c.reason}</div>
          </div>
        ))}
        {dayFixtures.map(f => (
          <div key={f.id} onClick={() => setSelectedFixture(f)} className="mb-[5px] cursor-pointer rounded-md border-l-4 border-l-info bg-info/10 px-2.5 py-1.5">
            <div className="text-[10px] font-bold text-info">{f.fixture_time ? f.fixture_time.slice(0,5) : ''} · <HomeAwayMark homeAway={f.home_away} /></div>
            <div className="text-[13px] font-bold text-ink">{formatFixtureLine(f)}</div>
            <div className="text-[11px] text-neutral"><MapPin className="inline h-3 w-3 shrink-0 align-middle" aria-hidden="true" /> {f.venue_name} · {f.competition}</div>
          </div>
        ))}
        {dayBookings.length === 0 && dayClosures.length === 0 && dayFixtures.length === 0 && (
          <div className="rounded-[10px] bg-white py-10 text-center">
            <div className="mb-2 text-[28px]">&#x1f4c5;</div>
            <div className="text-[13px] text-ink">Nothing scheduled</div>
          </div>
        )}
        {dayBookings.map(b => <MobileBookingRow key={b.id} b={b} onClick={() => setSelectedBooking(b)} />)}
      </div>
    )
  }
  function renderMobileWeekView() {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const daysWithContent = days.filter(d => getBookingsForDay(d).length > 0 || getClosuresForDay(d).length > 0)
    if (daysWithContent.length === 0) return (
      <div className="rounded-[10px] bg-white py-10 text-center">
        <div className="mb-2 text-[28px]">&#x1f4c5;</div>
        <div className="text-[13px] text-ink">No bookings this week</div>
      </div>
    )
    return (
      <div>
        {days.map(d => {
          const dayBookings = calendarView !== 'fixtures' ? getBookingsForDay(d) : []
          const dayClosures = getClosuresForDay(d)
          const dayFixtures = calendarView !== 'bookings' ? getDayFixtures(d) : []
          if (dayBookings.length === 0 && dayClosures.length === 0 && dayFixtures.length === 0) return null
          return (
            <div key={d.toISOString()} className="mb-4">
              <div className={`mb-1.5 flex items-center gap-1.5 border-b-2 pb-1.5 text-xs font-bold ${isToday(d) ? 'border-ink text-ink' : 'border-gray-200 text-neutral'}`}>
                {isToday(d) && <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />}
                {format(d, 'EEEE, d MMMM')}
              </div>
              {dayClosures.map(c => (
                <div key={c.id} className="mb-[5px] rounded-md border-l-4 border-l-neutral bg-neutral/10 px-3 py-2">
                  <div className="text-[12px] font-semibold text-neutral">&#x1f512; {c.pitch_name} — Closed</div>
                  <div className="text-[11px] text-neutral/80">{c.reason}</div>
                </div>
              ))}
              {dayFixtures.map(f => (
                <div key={f.id} onClick={() => setSelectedFixture(f)} className="mb-[5px] cursor-pointer rounded-md border-l-4 border-l-info bg-info/10 px-2.5 py-1.5">
                  <div className="text-[10px] font-bold text-info">{f.fixture_time ? f.fixture_time.slice(0,5) : ''} · <HomeAwayMark homeAway={f.home_away} /></div>
                  <div className="text-[13px] font-bold text-ink">{formatFixtureLine(f)}</div>
                  <div className="text-[11px] text-neutral"><MapPin className="inline h-3 w-3 shrink-0 align-middle" aria-hidden="true" /> {f.venue_name} · {f.competition}</div>
                </div>
              ))}
              {dayBookings.map(b => <MobileBookingRow key={b.id} b={b} onClick={() => setSelectedBooking(b)} />)}
            </div>
          )
        })}
      </div>
    )
  }

  function renderMobileMonthView() {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const days: Date[] = []
    let day = monthStart
    while (day <= monthEnd) { days.push(new Date(day)); day = addDays(day, 1) }
    const daysWithBookings = days.filter(d => getBookingsForDay(d).length > 0 || getClosuresForDay(d).length > 0 || getDayFixtures(d).length > 0)
    if (daysWithBookings.length === 0) return (
      <div className="rounded-[10px] bg-white py-10 text-center text-neutral">
        <div className="mb-2 text-[28px]">&#x1f4c5;</div>
        <div className="text-[13px]">Nothing this month</div>
      </div>
    )
    return (
      <div>
        {daysWithBookings.map(d => {
          const dayBookings = calendarView !== 'fixtures' ? getBookingsForDay(d) : []
          const dayClosures = getClosuresForDay(d)
          const dayFixtures = calendarView !== 'bookings' ? getDayFixtures(d) : []
          return (
            <div key={d.toISOString()} className="mb-4">
              <div className="mb-1.5 border-b border-gray-200 pb-1.5 text-xs font-bold text-neutral">
                {format(d, 'EEEE, d MMMM')}
              </div>
              {dayClosures.map(c => (
                <div key={c.id} className="mb-[5px] rounded-md border-l-4 border-l-neutral bg-neutral/10 px-3 py-2">
                  <div className="text-[12px] font-semibold text-neutral">&#x1f512; {c.pitch_name} — Closed</div>
                  <div className="text-[11px] text-neutral/80">{c.reason}</div>
                </div>
              ))}
              {dayFixtures.map(f => (
                <div key={f.id} onClick={() => setSelectedFixture(f)} className="mb-[5px] cursor-pointer rounded-md border-l-4 border-l-info bg-info/10 px-2.5 py-1.5">
                  <div className="text-[10px] font-bold text-info">{f.fixture_time ? f.fixture_time.slice(0,5) : ''} · <HomeAwayMark homeAway={f.home_away} /></div>
                  <div className="text-[13px] font-bold text-ink">{formatFixtureLine(f)}</div>
                  <div className="text-[11px] text-neutral"><MapPin className="inline h-3 w-3 shrink-0 align-middle" aria-hidden="true" /> {f.venue_name} · {f.competition}</div>
                </div>
              ))}
              {dayBookings.map(b => <MobileBookingRow key={b.id} b={b} onClick={() => setSelectedBooking(b)} />)}
            </div>
          )
        })}
      </div>
    )
  }

  function renderWeekDayHeader(day: Date, i: number) {
    const today = isToday(day)
    return (
      <div key={i} className={`px-0.5 py-1.5 text-center ${today ? 'bg-ink' : 'bg-ink/90'} ${i > 0 ? 'border-l border-ink/70' : ''}`}>
        <div className={`text-[10px] font-semibold tracking-wide ${today ? 'text-neutral/70' : 'text-neutral'}`}>{format(day, 'EEE').toUpperCase()}</div>
        <div className={`mx-auto my-0.5 flex h-7 w-7 items-center justify-center rounded-full text-base font-bold ${today ? 'bg-white text-ink' : 'bg-transparent text-white'}`}>{format(day, 'd')}</div>
        <div className={`text-[10px] ${today ? 'text-neutral/70' : 'text-neutral'}`}>{format(day, 'MMM')}</div>
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
      <div className="month-grid-wrapper overflow-auto rounded-lg border border-gray-200">
        <div className="grid min-w-[560px] grid-cols-7 bg-ink">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-white">{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid min-w-[560px] grid-cols-7 border-t border-gray-200">
            {week.map((day, di) => {
              const dayBookings = getBookingsForDay(day)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              return (
                <div key={di} className={`min-h-[90px] overflow-hidden p-1 ${inMonth ? 'bg-white' : 'bg-neutral/5'} ${di > 0 ? 'border-l border-gray-200' : ''}`}>
                  <div className="mb-0.5 flex justify-end">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${today ? 'bg-ink text-white' : inMonth ? 'text-neutral' : 'text-neutral/60'}`}>{format(day, 'd')}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {getClosuresForDay(day).map(c => (
                      <div key={c.id} className="rounded border-l-[3px] border-l-neutral bg-neutral/10 px-1 py-0.5">
                        <div className="text-[9px] font-bold text-neutral">&#x1f512; Closed</div>
                        <div className="truncate text-[9px] text-neutral">{c.pitch_name}</div>
                      </div>
                    ))}
                    {calendarView !== 'fixtures' && dayBookings.slice(0,3).map(b => <BookingCard key={b.id} booking={b} onClick={() => setSelectedBooking(b)} compact />)}
                    {calendarView !== 'fixtures' && dayBookings.length > 3 && <div className="pl-0.5 text-[9px] text-neutral">+{dayBookings.length - 3} more</div>}
                    {calendarView !== 'bookings' && getDayFixtures(day).map(f => (
                      <div key={f.id} onClick={() => setSelectedFixture(f)} className="cursor-pointer rounded border-l-[3px] border-l-info bg-info/10 px-1 py-0.5">
                        <div className="text-[9px] font-bold text-info">📅 <HomeAwayMark homeAway={f.home_away} showLabel={false} /> {f.fixture_time ? f.fixture_time.slice(0,5) : ''}</div>
                        <div className="truncate text-[9px] text-ink">{formatFixtureLine(f)}</div>
                      </div>
                    ))}
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
      <div className="week-grid-wrapper overflow-auto rounded-lg border border-gray-200">
        <div className="grid min-w-[700px] grid-cols-7">
          {days.map((day, i) => renderWeekDayHeader(day, i))}
        </div>
        <div className="grid min-w-[700px] grid-cols-7 border-t border-gray-200">
          {days.map((day, di) => {
            const dayBookings = calendarView !== 'fixtures' ? getBookingsForDay(day) : []
            const dayFixtures = calendarView !== 'bookings' ? getDayFixtures(day) : []
            return (
              <div key={di} className={`flex min-h-[180px] flex-col gap-1 p-1.5 ${isToday(day) ? 'bg-approved/10' : 'bg-white'} ${di > 0 ? 'border-l border-gray-200' : ''}`}>
                {getClosuresForDay(day).map(c => (
                  <div key={c.id} className="rounded-md border-l-4 border-l-neutral bg-neutral/10 px-[7px] py-[5px]">
                    <div className="text-[11px] font-bold text-neutral">&#x1f512; Pitch Closed</div>
                    <div className="mt-px text-[11px] text-neutral">{c.pitch_name}</div>
                    <div className="mt-px text-[10px] text-neutral/80">{c.reason}</div>
                  </div>
                ))}
                {dayFixtures.map(f => (
                  <div key={f.id} onClick={() => setSelectedFixture(f)} className="cursor-pointer rounded-md border-l-4 border-l-info bg-info/10 px-[7px] py-[5px]">
                    <div className="text-[11px] font-bold text-info">📅 <HomeAwayMark homeAway={f.home_away} showLabel={false} /> {f.fixture_time ? f.fixture_time.slice(0,5) : ''}</div>
                    <div className="mt-px truncate text-[11px] text-ink">{formatFixtureLine(f)}</div>
                    <div className="mt-px text-[10px] text-neutral"><MapPin className="inline h-3 w-3 shrink-0 align-middle" aria-hidden="true" /> {f.venue_name}</div>
                  </div>
                ))}
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
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <h1 className={`font-bold text-ink ${isMobile ? 'text-lg' : 'text-2xl'}`}>Calendar</h1>
          <p className="text-xs text-neutral">St. Saviours GAA & LGFA</p>
        </div>
        <div className="flex gap-1.5">
          {!isMobile && <button className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-ink">Print / Save</button>}
          {userRole !== 'viewer' && <a href="/new-booking" className="whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white no-underline">+ New Booking</a>}
        </div>
      </div>
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-ink">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-approved" />
          Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-2 border-dashed border-pending" />
          Awaiting
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-neutral" />
          Closed
        </span>
      </div>
      <div className={`mb-1.5 flex items-center gap-1.5 ${isMobile ? 'max-w-full' : 'max-w-[500px]'}`}>
        <select value={selectedPitch} onChange={e => setSelectedPitch(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-ink">
          <option value="all">All Pitches</option>
          {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
        </select>
        <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-ink">
          <option value="all">All Teams</option>
          {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-gray-300">
          {(['bookings', 'fixtures', 'all'] as const).map(v => (
            <button key={v} onClick={() => setCalendarView(v)} className={`cursor-pointer border-none px-2.5 py-1.5 text-[11px] font-medium ${calendarView === v ? 'bg-ink text-white' : 'bg-white text-neutral'}`}>
              {v === 'bookings' ? '📋 Bookings' : v === 'fixtures' ? '📅 Fixtures' : '🏟 All'}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between gap-1">
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-gray-300">
          {isMobile && <button onClick={() => { setView('day'); setSelectedDay(new Date()) }} className={`cursor-pointer border-none px-2.5 py-1.5 text-xs font-medium ${view === 'day' ? 'bg-ink text-white' : 'bg-white text-neutral'}`}>Day</button>}
          <button onClick={() => setView('week')} className={`cursor-pointer border-none px-2.5 py-1.5 text-xs font-medium ${view === 'week' ? 'bg-ink text-white' : 'bg-white text-neutral'}`}>Week</button>
          <button onClick={() => setView('month')} className={`cursor-pointer border-none px-2.5 py-1.5 text-xs font-medium ${view === 'month' ? 'bg-ink text-white' : 'bg-white text-neutral'}`}>Month</button>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <button onClick={() => {
            if (view === 'day') { const d = new Date(selectedDay); d.setDate(d.getDate() - 1); setSelectedDay(d) }
            else if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
            else setCurrentDate(subWeeks(currentDate, 1))
          }} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-base text-ink">‹</button>
          <h2 className="flex min-w-0 flex-1 items-baseline justify-center gap-1 overflow-hidden whitespace-nowrap text-[13px] font-semibold text-ink">
            {view === 'month' ? format(currentDate, 'MMMM yyyy') : view === 'day' ? getDayLabel() : getWeekLabel()}
          </h2>
          <button onClick={() => {
            if (view === 'day') { const d = new Date(selectedDay); d.setDate(d.getDate() + 1); setSelectedDay(d) }
            else if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
            else setCurrentDate(addWeeks(currentDate, 1))
          }} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-base text-ink">›</button>
        </div>
      </div>
      {loading ? (
        <div className="py-12 text-center text-neutral">Loading bookings...</div>
      ) : view === 'day' ? renderDayView()
        : view === 'week' && isMobile ? renderMobileWeekView()
        : view === 'month' && isMobile ? renderMobileMonthView()
        : view === 'month' ? renderMonthView()
        : renderWeekView()}
      {selectedBooking && <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} currentUserId={currentUserId} userRole={userRole} />}
      {selectedFixture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-ink">{selectedFixture.team_name} vs {selectedFixture.opposition}</h2>
                <p className="text-neutral text-sm mt-1">{selectedFixture.sport}</p>
              </div>
              <button onClick={() => setSelectedFixture(null)} className="text-neutral/60 hover:text-neutral text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral">Date</span><span className="font-semibold text-ink">{new Date(selectedFixture.fixture_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              <div className="flex justify-between"><span className="text-neutral">Time</span><span className="font-semibold text-ink">{selectedFixture.fixture_time ? selectedFixture.fixture_time.slice(0,5) : 'TBC'}</span></div>
              <div className="flex justify-between"><span className="text-neutral">Venue</span><span className="font-semibold text-ink">{selectedFixture.venue_name}</span></div>
              <div className="flex justify-between"><span className="text-neutral">Home/Away</span><span className="font-semibold text-ink"><HomeAwayMark homeAway={selectedFixture.home_away} /></span></div>
              <div className="flex justify-between"><span className="text-neutral">Competition</span><span className="font-semibold text-ink">{selectedFixture.competition}</span></div>
              {selectedFixture.notes && <div className="flex justify-between"><span className="text-neutral">Notes</span><span className="font-semibold text-ink">{selectedFixture.notes}</span></div>}
            </div>
            <div className="mt-6">
              <a href={`https://maps.google.com/?q=${selectedFixture.venue_name}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-info text-white text-center py-3 rounded-lg font-semibold text-sm"><MapPin className="inline h-4 w-4 shrink-0 align-middle" aria-hidden="true" /> Get Directions</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}