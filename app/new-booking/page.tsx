'use client'

import Navbar from '@/components/Navbar'
import Button from '@/components/ui/Button'
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  Check,
  Goal,
  ListChecks,
  MapPin,
  Repeat,
  Target,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SPORTS: Record<string, string[]> = {
  "Men's/Boys Hurling": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Junior'],
  "Men's/Boys Gaelic": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Prem Inter'],
  'LGFA': ['U12','U13','G4M&O'],
  'Other': ['Soccer','Other'],
  'External GAA Fixture': ['External Game'],
}

const TIME_SLOTS: string[] = []
for (let h = 8; h <= 21; h++) {
  const maxMin = h === 21 ? 15 : 45
  for (let m = 0; m <= maxMin; m += 15) {
    TIME_SLOTS.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  }
}

const fmt = (t: string) => { const parts = t.split(':'); const hr = parseInt(parts[0]); const mn = parts[1]; return `${hr > 12 ? hr-12 : hr === 0 ? 12 : hr}:${mn}${hr >= 12 ? 'pm' : 'am'}` }

const addHour = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  const newH = h + 1
  if (newH > 21) return '21:00'
  return `${String(newH).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

interface Pitch { id: number; name: string; colour: string }

interface DayEntry {
  date: string
  start_time: string
  end_time: string
  conflict: boolean | null
}

export default function NewBookingPage() {
  const [userId, setUserId] = useState('')
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [sport, setSport] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [pitchId, setPitchId] = useState('')
  const [dressingRoom, setDressingRoom] = useState('none')
  const [showers, setShowers] = useState('no')
  const [bookingMode, setBookingMode] = useState<'single' | 'multi'>('single')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [conflict, setConflict] = useState<boolean | null>(null)
  const [repeat, setRepeat] = useState(0)
  const [repeatDates, setRepeatDates] = useState<string[]>([])
  const [multiDays, setMultiDays] = useState<DayEntry[]>([{ date: '', start_time: '', end_time: '', conflict: null }])
  const [multiRepeat, setMultiRepeat] = useState(1)
  const [purpose, setPurpose] = useState('')
  const [approxNumbers, setApproxNumbers] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [userRole, setUserRole] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
      const { data: profileData } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profileData) {
        setUserRole(profileData.role || '')
        if (profileData.role === 'viewer') { window.location.href = '/dashboard'; return }
      }
      const { data } = await supabase.from('pitches').select('id, name, colour').eq('is_active', true).order('sort_order')
      if (data) setPitches(data)
    }
    init()
  }, [])

async function checkConflict(pId: string, d: string, st: string, et: string, excludeId?: string) {
    if (!pId || !d || !st || !et) return null
    const { data: closureData } = await supabase
      .from('pitch_closures')
      .select('id')
      .eq('pitch_id', parseInt(pId))
      .lte('start_date', d)
      .gte('end_date', d)
    if (closureData && closureData.length > 0) return true
    const { data } = await supabase.rpc('check_booking_conflict_extended', {
      p_pitch_id: parseInt(pId),
      p_date: d,
      p_start: st + ':00',
      p_end: et + ':00',
      p_exclude_id: excludeId || null
    })
if (!data && data !== false) return null
    return data as boolean
  }

  async function handleStartTimeChange(val: string) {
    setStartTime(val)
    const auto = addHour(val)
    setEndTime(auto)
    setConflict(null)
    if (pitchId && date) {
      const c = await checkConflict(pitchId, date, val, auto)
      setConflict(c)
    }
  }

  async function handleEndTimeChange(val: string) {
    setEndTime(val)
    if (pitchId && date && startTime) {
      const c = await checkConflict(pitchId, date, startTime, val)
      setConflict(c)
    }
  }

  async function handleDateChange(val: string) {
    setDate(val)
    setConflict(null)
    if (val && repeat > 0) {
      const dates = []
      for (let i = 0; i < repeat; i++) {
        const [y, m, day] = val.split('-').map(Number)
        const d = new Date(Date.UTC(y, m - 1, day + (i * 7)))
        dates.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`)
      }
      setRepeatDates(dates)
    }
    if (pitchId && startTime && endTime) {
      const c = await checkConflict(pitchId, val, startTime, endTime)
      setConflict(c)
    }
  }

  function handleRepeatChange(weeks: number) {
    setRepeat(weeks)
    if (!date) return
    const dates = []
    for (let i = 0; i < weeks; i++) {
      const [y, m, day] = date.split('-').map(Number)
      const d = new Date(Date.UTC(y, m - 1, day + (i * 7)))
      dates.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`)
    }
    setRepeatDates(dates)
  }

  async function handleMultiDayChange(index: number, field: string, val: string) {
    const updated = [...multiDays]
    updated[index] = { ...updated[index], [field]: val, conflict: null }
    if (field === 'start_time') {
      updated[index].end_time = addHour(val)
    }
    setMultiDays(updated)
    const day = updated[index]
    if (pitchId && day.date && day.start_time && day.end_time) {
      const c = await checkConflict(pitchId, day.date, day.start_time, day.end_time)
      updated[index].conflict = c
      setMultiDays([...updated])
    }
  }

  function formatDateDisplay(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  async function handleSubmit() {
    const newErrors: Record<string, boolean> = {}
    if (!sport) newErrors.sport = true
    if (!ageGroup) newErrors.ageGroup = true
    if (!pitchId) newErrors.pitchId = true
    if (bookingMode === 'single') {
      if (!date) newErrors.date = true
      if (!startTime) newErrors.startTime = true
      if (!endTime) newErrors.endTime = true
    } else {
      multiDays.forEach((day, i) => {
        if (!day.date) newErrors[`day_date_${i}`] = true
        if (!day.start_time) newErrors[`day_start_${i}`] = true
        if (!day.end_time) newErrors[`day_end_${i}`] = true
      })
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      const firstKey = Object.keys(newErrors)[0]
      const refKey = firstKey.startsWith('day_date') ? 'date' : firstKey.startsWith('day_start') ? 'startTime' : firstKey.startsWith('day_end') ? 'endTime' : firstKey
      const el = document.getElementById(`field-${refKey}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErrors({})
    setSubmitting(true)
    setSubmitError('')
    const teamName = `${sport} ${ageGroup}`.trim()
    const baseBooking = {
      user_id: userId,
      pitch_id: parseInt(pitchId),
      team_name: teamName,
      purpose,
      status: 'pending',
      requires_showers: showers === 'yes',
      dressing_room: dressingRoom === 'none' ? null : dressingRoom,
      approx_numbers: approxNumbers ? parseInt(approxNumbers) : null,
      notes: notes || null,
      facility_type: 'pitch',
    }
    try {
      let created: { booking_date: string; start_time: string; end_time: string }[] = []
      if (bookingMode === 'single') {
        const bookings = repeatDates.length > 0 ? repeatDates : [date]
        const recurrenceGroupId = bookings.length > 1 ? crypto.randomUUID() : null
        const inserts = bookings.map(d => ({
          ...baseBooking,
          booking_date: d,
          start_time: startTime + ':00',
          end_time: endTime + ':00',
          recurrence_group_id: recurrenceGroupId,
        }))
        const { error } = await supabase.from('bookings').insert(inserts)
        if (error) throw error
        created = inserts
      } else {
        const patternGroupId = crypto.randomUUID()
        const inserts = []
        for (const day of multiDays) {
          for (let w = 0; w < multiRepeat; w++) {
            const d = new Date(day.date + 'T00:00:00')
            d.setDate(d.getDate() + w * 7)
            inserts.push({
              ...baseBooking,
              booking_date: d.toISOString().split('T')[0],
              start_time: day.start_time + ':00',
              end_time: day.end_time + ':00',
              pattern_group_id: patternGroupId,
              pattern_day_of_week: d.getDay(),
            })
          }
        }
        const { error } = await supabase.from('bookings').insert(inserts)
        if (error) throw error
        created = inserts
      }
      try {
        const pitch = pitches.find(p => String(p.id) === pitchId)
        const profileRes = await supabase.from('profiles').select('full_name').eq('id', userId).single()
        const userName = profileRes.data?.full_name || 'A user'
        await Promise.all(created.map(b => fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_booking',
            userName,
            booking: {
              team_name: teamName,
              pitch_name: pitch?.name || '',
              date_display: new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              time_display: `${fmt(b.start_time)} – ${fmt(b.end_time)}`,
              purpose,
            }
          })
        })))

        fetch('/api/notify-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName,
            team_name: teamName,
            pitch_name: pitch?.name || '',
            date_display: created[0] ? new Date(created[0].booking_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '',
            time_display: created[0] ? `${fmt(created[0].start_time)}–${fmt(created[0].end_time)}` : '',
          }),
        }).catch(err => console.error('Push notify failed:', err))
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr)
      }
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setSubmitError('Failed to submit booking. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (hasError: boolean) =>
    `w-full min-h-[44px] rounded-lg border bg-white px-3 text-sm text-ink outline-none focus:outline-none focus:ring-2 focus:ring-approved ${hasError ? 'border-rejected' : 'border-gray-200'}`
  const labelClass = 'mb-1.5 block text-sm font-semibold text-ink'
  const fieldWrapClass = 'mb-4'
  const requiredStar = <span className="text-rejected"> *</span>
  const errorClass = 'mt-1 text-xs text-rejected'

  const totalBookings = bookingMode === 'single'
    ? (repeat > 0 ? repeat : 1)
    : multiDays.length * multiRepeat

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="New Booking" userRole={userRole} />

      <div className="mx-auto my-8 max-w-[640px] px-4">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <h1 className="mb-1 flex items-center gap-2 text-[22px] font-bold text-ink">
            <CalendarCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            New Booking
          </h1>
          <p className="mb-6 text-[13px] text-neutral">Fields marked <span className="text-rejected">*</span> are required</p>

          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <div id="field-sport">
              <label className={labelClass}>Sport / Code{requiredStar}</label>
              <select value={sport} onChange={e => { setSport(e.target.value); setAgeGroup('') }} className={fieldClass(!!errors.sport)}>
                <option value="">Select sport...</option>
                {Object.keys(SPORTS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.sport && <p className={errorClass}>Please select a sport</p>}
            </div>
            <div id="field-pitchId">
              <label className={labelClass}>Pitch{requiredStar}</label>
              <select value={pitchId} onChange={e => setPitchId(e.target.value)} className={fieldClass(!!errors.pitchId)}>
                <option value="">Select a pitch...</option>
                {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              {errors.pitchId && <p className={errorClass}>Please select a pitch</p>}
            </div>
          </div>

          {sport && (
            <div id="field-ageGroup" className={fieldWrapClass}>
              <label className={labelClass}>Age Group / Team{requiredStar}</label>
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className={fieldClass(!!errors.ageGroup)}>
                <option value="">Select age group...</option>
                {SPORTS[sport].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {errors.ageGroup && <p className={errorClass}>Please select an age group</p>}
            </div>
          )}

          <div className="mb-5 flex overflow-hidden rounded-lg border border-gray-200">
            <button onClick={() => setBookingMode('single')} className={`min-h-[44px] flex-1 cursor-pointer border-none px-3 text-sm font-semibold ${bookingMode === 'single' ? 'bg-ink text-white' : 'bg-white text-ink'}`}>Single / Recurring</button>
            <button onClick={() => setBookingMode('multi')} className={`min-h-[44px] flex-1 cursor-pointer border-none px-3 text-sm font-semibold ${bookingMode === 'multi' ? 'bg-ink text-white' : 'bg-white text-ink'}`}>Multi-day Pattern</button>
          </div>

          {bookingMode === 'single' && (
            <div>
              <div id="field-date" className={fieldWrapClass}>
                <label className={labelClass}>Date{requiredStar}</label>
                <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={e => handleDateChange(e.target.value)} className={fieldClass(!!errors.date)} />
                {errors.date && <p className={errorClass}>Please select a date</p>}
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div id="field-startTime">
                  <label className={labelClass}>Start Time{requiredStar}</label>
                  <select value={startTime} onChange={e => handleStartTimeChange(e.target.value)} className={fieldClass(!!errors.startTime)}>
                    <option value="">Start...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
                  </select>
                  {errors.startTime && <p className={errorClass}>Required</p>}
                </div>
                <div>
                  <label className={labelClass}>End Time{requiredStar}</label>
                  <select value={endTime} onChange={e => handleEndTimeChange(e.target.value)} className={fieldClass(!!errors.endTime)}>
                    <option value="">End...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
                  </select>
                  {errors.endTime && <p className={errorClass}>Required</p>}
                </div>
              </div>
              {conflict !== null && (
                <div className={`mb-4 rounded-lg border px-3.5 py-2.5 text-sm font-semibold ${conflict ? 'border-rejected/40 bg-rejected/10 text-rejected' : 'border-approved/40 bg-approved/10 text-approved'}`}>
                  {conflict ? (
                    <span className="inline-flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Conflict detected — this pitch is already booked at this time
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Available
                    </span>
                  )}
                </div>
              )}
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
                  <input type="checkbox" checked={repeat > 0} onChange={e => handleRepeatChange(e.target.checked ? 2 : 0)} className="h-4 w-4 accent-approved focus:outline-none focus:ring-2 focus:ring-approved" />
                  <Repeat className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                  Repeat this booking weekly
                </label>
                {repeat > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-[13px] text-ink">Repeat for how many weeks total?</p>
                    <div className="flex gap-2">
                      {[2, 3, 4].map(w => (
                        <button key={w} onClick={() => handleRepeatChange(w)} className={`min-h-[44px] flex-1 cursor-pointer rounded-lg border border-gray-200 text-[13px] font-semibold ${repeat === w ? 'bg-ink text-white' : 'bg-white text-ink'}`}>{w} weeks</button>
                      ))}
                    </div>
                    {repeatDates.length > 0 && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                        <p className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-100 px-3 py-2 text-[13px] font-semibold text-ink">
                          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Dates that will be booked:
                        </p>
                        {repeatDates.map((d, i) => (
                          <div key={d} className={`flex items-center gap-2 px-3 py-2 text-[13px] text-info ${i === 0 ? 'bg-info/10' : 'bg-white'} ${i < repeatDates.length - 1 ? 'border-b border-gray-200' : ''}`}>
                            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {formatDateDisplay(d)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {bookingMode === 'multi' && (
            <div>
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Multi-day weekly pattern
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral">Pick a start date and time for each training day</p>
                  </div>
                  <button onClick={() => setMultiDays([...multiDays, { date: '', start_time: '', end_time: '', conflict: null }])} className="cursor-pointer rounded-lg border-none bg-ink px-3 py-1.5 text-xs font-semibold text-white">+ Add Day</button>
                </div>
                {multiDays.map((day, i) => (
                  <div key={i} className="mb-2 rounded-lg border border-gray-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink">DAY {i + 1}</span>
                      {multiDays.length > 1 && (
                        <button onClick={() => setMultiDays(multiDays.filter((_, idx) => idx !== i))} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rejected/40 bg-white px-2 py-0.5 text-xs text-rejected">
                          <X className="h-3 w-3" aria-hidden="true" />
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink">Start Date{requiredStar}</label>
                        <input type="date" value={day.date} onChange={e => handleMultiDayChange(i, 'date', e.target.value)} className={fieldClass(!!errors[`day_date_${i}`])} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink">Start Time{requiredStar}</label>
                        <select value={day.start_time} onChange={e => handleMultiDayChange(i, 'start_time', e.target.value)} className={fieldClass(!!errors[`day_start_${i}`])}>
                          <option value="">Start...</option>
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink">End Time{requiredStar}</label>
                        <select value={day.end_time} onChange={e => handleMultiDayChange(i, 'end_time', e.target.value)} className={fieldClass(!!errors[`day_end_${i}`])}>
                          <option value="">End...</option>
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
                        </select>
                      </div>
                    </div>
                    {day.conflict !== null && (
                      <div className={`mt-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${day.conflict ? 'border-rejected/40 bg-rejected/10 text-rejected' : 'border-approved/40 bg-approved/10 text-approved'}`}>
                        {day.conflict ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            Conflict
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            Available
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <p className="mb-2 text-[13px] font-semibold text-ink">Repeat pattern for how many weeks?</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(w => (
                    <button key={w} onClick={() => setMultiRepeat(w)} className={`min-h-[44px] flex-1 cursor-pointer rounded-lg border border-gray-200 text-[13px] font-semibold ${multiRepeat === w ? 'bg-ink text-white' : 'bg-white text-ink'}`}>{w === 1 ? 'This week' : `${w} weeks`}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Purpose{requiredStar}</label>
              <select value={purpose} onChange={e => setPurpose(e.target.value)} className={fieldClass(false)}>
                <option value="">Select purpose...</option>
                <option value="Training">Training</option>
                <option value="Match / Fixture">Match / Fixture</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Dressing Rooms</label>
              <select value={dressingRoom} onChange={e => setDressingRoom(e.target.value)} className={fieldClass(false)}>
                <option value="none">No dressing room required</option>
                <option value="rooms_1_2">Rooms 1 & 2</option>
                <option value="rooms_3_4">Rooms 3 & 4</option>
                <option value="rooms_1_2_3_4">Rooms 1, 2, 3 & 4</option>
              </select>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Showers Required?</label>
              <select value={showers} onChange={e => setShowers(e.target.value)} className={fieldClass(false)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>No. of People</label>
              <input type="number" value={approxNumbers} onChange={e => setApproxNumbers(e.target.value)} placeholder="e.g. 25" className={fieldClass(false)} />
            </div>
          </div>
          <div className={fieldWrapClass}>
            <label className={labelClass}>Additional Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requirements..." rows={3} className={`${fieldClass(false)} resize-y py-2.5`} />
          </div>

          {sport && ageGroup && pitchId && (
            <div className="mb-4 rounded-lg border border-approved/40 bg-approved/10 px-4 py-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-approved">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Booking Summary
              </p>
              <div className="flex flex-col gap-[3px] text-[13px] text-approved">
                <span className="inline-flex items-center gap-1.5">
                  <Goal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {sport} {ageGroup}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {pitches.find(p => String(p.id) === pitchId)?.name || ''}
                </span>
                {bookingMode === 'single' && date && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {formatDateDisplay(date)}{startTime ? ` · ${fmt(startTime)}${endTime ? ` – ${fmt(endTime)}` : ''}` : ''}
                  </span>
                )}
                {purpose && (
                  <span className="inline-flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {purpose}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {totalBookings} booking{totalBookings !== 1 ? 's' : ''} will be submitted for approval
                </span>
              </div>
            </div>
          )}
          {submitError && (
            <div className="mb-4 rounded-lg border border-rejected/40 bg-rejected/10 px-3.5 py-2.5 text-sm text-rejected">
              {submitError}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button variant="outline" onClick={() => { window.location.href = '/dashboard' }}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : `Submit ${totalBookings} Booking${totalBookings !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}