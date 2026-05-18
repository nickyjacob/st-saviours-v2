'use client'

import Navbar from '@/components/Navbar'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SPORTS: Record<string, string[]> = {
  "Men's/Boys Hurling": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Junior'],
  "Men's/Boys Gaelic": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Prem Inter'],
  'LGFA': ['U12','U13','G4M&O'],
  'Other': ['Soccer','Other'],
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
      if (profileData) setUserRole(profileData.role || '')
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
      }
      try {
        const pitch = pitches.find(p => String(p.id) === pitchId)
        const bookingDate = bookingMode === 'single' ? (repeatDates.length > 0 ? repeatDates[0] : date) : multiDays[0].date
        const bookingStart = bookingMode === 'single' ? startTime : multiDays[0].start_time
        const bookingEnd = bookingMode === 'single' ? endTime : multiDays[0].end_time
        const profileRes = await supabase.from('profiles').select('full_name').eq('id', userId).single()
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_booking',
            userName: profileRes.data?.full_name || 'A user',
            booking: {
              team_name: `${sport} ${ageGroup}`.trim(),
              pitch_name: pitch?.name || '',
              date_display: new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              time_display: `${fmt(bookingStart)} – ${fmt(bookingEnd)}`,
              purpose,
            }
          })
        })
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

  const inputStyle = (hasError: boolean) => ({
    width: '100%', border: `1px solid ${hasError ? '#dc2626' : '#d1d5db'}`,
    borderRadius: '8px', padding: '10px 12px', fontSize: '14px',
    outline: 'none', backgroundColor: 'white', color: '#111',
  })

  const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '6px', display: 'block' }
  const fieldStyle = { marginBottom: '16px' }
  const requiredStar = <span style={{ color: '#dc2626' }}> *</span>

  const totalBookings = bookingMode === 'single'
    ? (repeat > 0 ? repeat : 1)
    : multiDays.length * multiRepeat

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
<Navbar activePage="New Booking" userRole={userRole} />

      <div style={{ maxWidth: '640px', margin: '32px auto', padding: '0 16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>&#xff0b; New Booking</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Fields marked <span style={{ color: '#dc2626' }}>*</span> are required</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div id="field-sport">
              <label style={labelStyle}>Sport / Code{requiredStar}</label>
              <select value={sport} onChange={e => { setSport(e.target.value); setAgeGroup('') }} style={inputStyle(!!errors.sport)}>
                <option value="">Select sport...</option>
                {Object.keys(SPORTS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.sport && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Please select a sport</p>}
            </div>
            <div id="field-pitchId">
              <label style={labelStyle}>Pitch{requiredStar}</label>
              <select value={pitchId} onChange={e => setPitchId(e.target.value)} style={inputStyle(!!errors.pitchId)}>
                <option value="">Select a pitch...</option>
                {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              {errors.pitchId && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Please select a pitch</p>}
            </div>
          </div>

          {sport && (
            <div id="field-ageGroup" style={fieldStyle}>
              <label style={labelStyle}>Age Group / Team{requiredStar}</label>
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} style={inputStyle(!!errors.ageGroup)}>
                <option value="">Select age group...</option>
                {SPORTS[sport].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {errors.ageGroup && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Please select an age group</p>}
            </div>
          )}

          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
            <button onClick={() => setBookingMode('single')} style={{ flex: 1, padding: '10px', fontSize: '14px', fontWeight: '600', backgroundColor: bookingMode === 'single' ? '#111' : 'white', color: bookingMode === 'single' ? 'white' : '#374151', border: 'none', cursor: 'pointer' }}>Single / Recurring</button>
            <button onClick={() => setBookingMode('multi')} style={{ flex: 1, padding: '10px', fontSize: '14px', fontWeight: '600', backgroundColor: bookingMode === 'multi' ? '#111' : 'white', color: bookingMode === 'multi' ? 'white' : '#374151', border: 'none', cursor: 'pointer' }}>Multi-day Pattern</button>
          </div>

          {bookingMode === 'single' && (
            <div>
              <div id="field-date" style={fieldStyle}>
                <label style={labelStyle}>Date{requiredStar}</label>
                <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={e => handleDateChange(e.target.value)} style={inputStyle(!!errors.date)} />
                {errors.date && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Please select a date</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div id="field-startTime">
                  <label style={labelStyle}>Start Time{requiredStar}</label>
                  <select value={startTime} onChange={e => handleStartTimeChange(e.target.value)} style={inputStyle(!!errors.startTime)}>
                    <option value="">Start...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
                  </select>
                  {errors.startTime && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Required</p>}
                </div>
                <div>
                  <label style={labelStyle}>End Time{requiredStar}</label>
                  <select value={endTime} onChange={e => handleEndTimeChange(e.target.value)} style={inputStyle(!!errors.endTime)}>
                    <option value="">End...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
                  </select>
                  {errors.endTime && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Required</p>}
                </div>
              </div>
              {conflict !== null && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', backgroundColor: conflict ? '#fef2f2' : '#f0fdf4', border: `1px solid ${conflict ? '#fca5a5' : '#86efac'}`, color: conflict ? '#dc2626' : '#16a34a', fontWeight: '600', fontSize: '14px' }}>
                  {conflict ? '⚠ Conflict detected — this pitch is already booked at this time' : '✓ Available'}
                </div>
              )}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#f9fafb' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  <input type="checkbox" checked={repeat > 0} onChange={e => handleRepeatChange(e.target.checked ? 2 : 0)} style={{ width: '16px', height: '16px' }} />
                  &#x1f504; Repeat this booking weekly
                </label>
                {repeat > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Repeat for how many weeks total?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[2, 3, 4].map(w => (
                        <button key={w} onClick={() => handleRepeatChange(w)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: repeat === w ? '#111' : 'white', color: repeat === w ? 'white' : '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>{w} weeks</button>
                      ))}
                    </div>
                    {repeatDates.length > 0 && (
                      <div style={{ marginTop: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                        <p style={{ fontSize: '13px', fontWeight: '600', padding: '8px 12px', backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>&#x1f4c5; Dates that will be booked:</p>
                        {repeatDates.map((d, i) => (
                          <div key={d} style={{ padding: '8px 12px', backgroundColor: i === 0 ? '#eff6ff' : 'white', borderBottom: i < repeatDates.length - 1 ? '1px solid #e5e7eb' : 'none', fontSize: '13px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            &#x2705; {formatDateDisplay(d)}
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
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '600' }}>&#x1f4c5; Multi-day weekly pattern</h3>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Pick a start date and time for each training day</p>
                  </div>
                  <button onClick={() => setMultiDays([...multiDays, { date: '', start_time: '', end_time: '', conflict: null }])} style={{ backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>+ Add Day</button>
                </div>
                {multiDays.map((day, i) => (
                  <div key={i} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>DAY {i + 1}</span>
                      {multiDays.length > 1 && <button onClick={() => setMultiDays(multiDays.filter((_, idx) => idx !== i))} style={{ color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'white' }}>&#x2715; Remove</button>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>Start Date{requiredStar}</label>
                        <input type="date" value={day.date} onChange={e => handleMultiDayChange(i, 'date', e.target.value)} style={inputStyle(!!errors[`day_date_${i}`])} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>Start Time{requiredStar}</label>
                        <select value={day.start_time} onChange={e => handleMultiDayChange(i, 'start_time', e.target.value)} style={inputStyle(!!errors[`day_start_${i}`])}>
                          <option value="">Start...</option>
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>End Time{requiredStar}</label>
                        <select value={day.end_time} onChange={e => handleMultiDayChange(i, 'end_time', e.target.value)} style={inputStyle(!!errors[`day_end_${i}`])}>
                          <option value="">End...</option>
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
                        </select>
                      </div>
                    </div>
                    {day.conflict !== null && (
                      <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '6px', backgroundColor: day.conflict ? '#fef2f2' : '#f0fdf4', border: `1px solid ${day.conflict ? '#fca5a5' : '#86efac'}`, color: day.conflict ? '#dc2626' : '#16a34a', fontSize: '12px', fontWeight: '600' }}>
                        {day.conflict ? '⚠ Conflict' : '✓ Available'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Repeat pattern for how many weeks?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4].map(w => (
                    <button key={w} onClick={() => setMultiRepeat(w)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: multiRepeat === w ? '#111' : 'white', color: multiRepeat === w ? 'white' : '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>{w === 1 ? 'This week' : `${w} weeks`}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Purpose{requiredStar}</label>
              <select value={purpose} onChange={e => setPurpose(e.target.value)} style={inputStyle(false)}>
                <option value="">Select purpose...</option>
                <option value="Training">Training</option>
                <option value="Match / Fixture">Match / Fixture</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Dressing Rooms</label>
              <select value={dressingRoom} onChange={e => setDressingRoom(e.target.value)} style={inputStyle(false)}>
                <option value="none">No dressing room required</option>
                <option value="rooms_1_2">Rooms 1 & 2</option>
                <option value="rooms_3_4">Rooms 3 & 4</option>
                <option value="rooms_1_2_3_4">Rooms 1, 2, 3 & 4</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Showers Required?</label>
              <select value={showers} onChange={e => setShowers(e.target.value)} style={inputStyle(false)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>No. of People</label>
              <input type="number" value={approxNumbers} onChange={e => setApproxNumbers(e.target.value)} placeholder="e.g. 25" style={inputStyle(false)} />
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Additional Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requirements..." rows={3} style={{ ...inputStyle(false), resize: 'vertical' }} />
          </div>

          {sport && ageGroup && pitchId && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#15803d', marginBottom: '6px' }}>&#x1f4cb; Booking Summary</p>
              <div style={{ fontSize: '13px', color: '#166534', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span>&#x26bd; {sport} {ageGroup}</span>
                <span>&#x1f3df; {pitches.find(p => String(p.id) === pitchId)?.name || ''}</span>
                {bookingMode === 'single' && date && <span>&#x1f4c5; {formatDateDisplay(date)}{startTime ? ` · ${fmt(startTime)}${endTime ? ` – ${fmt(endTime)}` : ''}` : ''}</span>}
                {purpose && <span>&#x1f3af; {purpose}</span>}
                <span>&#x1f4dd; {totalBookings} booking{totalBookings !== 1 ? 's' : ''} will be submitted for approval</span>
              </div>
            </div>
          )}
          {submitError && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '14px' }}>
              {submitError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <a href="/dashboard" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: '600', color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Cancel</a>
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#111', color: 'white', fontSize: '14px', fontWeight: '600', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Submitting...' : `Submit ${totalBookings} Booking${totalBookings !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}