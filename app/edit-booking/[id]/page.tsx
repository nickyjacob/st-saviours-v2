'use client'

import Navbar from '@/components/Navbar'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

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

function parseSportAndAge(teamName: string): { sport: string; ageGroup: string } {
  for (const sport of Object.keys(SPORTS)) {
    for (const age of SPORTS[sport]) {
      if (teamName === `${sport} ${age}`) return { sport, ageGroup: age }
    }
  }
  const parts = teamName.split(' ')
  const age = parts[parts.length - 1]
  const sport = parts.slice(0, -1).join(' ')
  return { sport, ageGroup: age }
}

export default function EditBookingPage() {
  const params = useParams()
  const id = params.id as string

  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('')
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [sport, setSport] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [pitchId, setPitchId] = useState('')
  const [dressingRoom, setDressingRoom] = useState('none')
  const [showers, setShowers] = useState('no')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [conflict, setConflict] = useState<boolean | null>(null)
  const [purpose, setPurpose] = useState('Training')
  const [approxNumbers, setApproxNumbers] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserId(session.user.id)
      setUserRole(profile.role || '')
      const { data: pitchData } = await supabase.from('pitches').select('id, name, colour').eq('is_active', true).order('sort_order')
      if (pitchData) setPitches(pitchData)
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).single()
      if (!booking) { setNotFound(true); setLoading(false); return }
      if (booking.user_id !== session.user.id && profile.role !== 'admin') { window.location.href = '/my-bookings'; return }
      const { sport: s, ageGroup: a } = parseSportAndAge(booking.team_name)
      setSport(s)
      setAgeGroup(a)
      setPitchId(String(booking.pitch_id))
      setDressingRoom(booking.dressing_room || 'none')
      setShowers(booking.requires_showers ? 'yes' : 'no')
      setDate(booking.booking_date)
      setStartTime(booking.start_time.slice(0,5))
      setEndTime(booking.end_time.slice(0,5))
      setPurpose(booking.purpose || 'Training')
      setApproxNumbers(booking.approx_numbers ? String(booking.approx_numbers) : '')
      setNotes(booking.notes || '')
      setLoading(false)
    }
    init()
  }, [id])

  async function checkConflict(pId: string, d: string, st: string, et: string) {
    if (!pId || !d || !st || !et) return null
    const { data } = await supabase.rpc('check_booking_conflict_extended', {
      p_pitch_id: parseInt(pId),
      p_date: d,
      p_start: st + ':00',
      p_end: et + ':00',
      p_exclude_id: id
    })
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
    if (pitchId && startTime && endTime) {
      const c = await checkConflict(pitchId, val, startTime, endTime)
      setConflict(c)
    }
  }

  async function handlePitchChange(val: string) {
    setPitchId(val)
    setConflict(null)
    if (val && date && startTime && endTime) {
      const c = await checkConflict(val, date, startTime, endTime)
      setConflict(c)
    }
  }

  async function handleSubmit() {
    const newErrors: Record<string, boolean> = {}
    if (!sport) newErrors.sport = true
    if (!ageGroup) newErrors.ageGroup = true
    if (!pitchId) newErrors.pitchId = true
    if (!date) newErrors.date = true
    if (!startTime) newErrors.startTime = true
    if (!endTime) newErrors.endTime = true
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setSubmitting(true)
    setSubmitError('')
    const { error } = await supabase.from('bookings').update({
      pitch_id: parseInt(pitchId),
      team_name: `${sport} ${ageGroup}`.trim(),
      purpose,
      booking_date: date,
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      requires_showers: showers === 'yes',
      dressing_room: dressingRoom === 'none' ? null : dressingRoom,
      approx_numbers: approxNumbers ? parseInt(approxNumbers) : null,
      notes: notes || null,
      status: 'pending',
    }).eq('id', id)
    if (error) { setSubmitError('Failed to save changes. Please try again.'); setSubmitting(false); return }
    window.location.href = '/my-bookings'
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    window.location.href = '/my-bookings'
  }

  const inputStyle = (hasError: boolean) => ({
    width: '100%', border: `1px solid ${hasError ? '#dc2626' : '#d1d5db'}`,
    borderRadius: '8px', padding: '10px 12px', fontSize: '14px',
    outline: 'none', backgroundColor: 'white',
  })
  const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '6px', display: 'block' }
  const fieldStyle = { marginBottom: '16px' }
  const requiredStar = <span style={{ color: '#dc2626' }}> *</span>

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888' }}>Loading...</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#888', marginBottom: '12px' }}>Booking not found.</p>
        <a href="/my-bookings" style={{ color: '#111', fontWeight: '600' }}>Back to My Bookings</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
<Navbar activePage="" userRole={userRole} />

      <div style={{ maxWidth: '640px', margin: '32px auto', padding: '0 16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>&#9998; Edit Booking</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Fields marked <span style={{ color: '#dc2626' }}>*</span> are required</p>

          <div style={fieldStyle}>
            <label style={labelStyle}>Sport / Code{requiredStar}</label>
            <select value={sport} onChange={e => { setSport(e.target.value); setAgeGroup('') }} style={inputStyle(!!errors.sport)}>
              <option value="">Select sport...</option>
              {Object.keys(SPORTS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.sport && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Please select a sport</p>}
          </div>

          {sport && SPORTS[sport] && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Age Group / Team{requiredStar}</label>
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} style={inputStyle(!!errors.ageGroup)}>
                <option value="">Select age group...</option>
                {SPORTS[sport].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {errors.ageGroup && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Please select an age group</p>}
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Pitch{requiredStar}</label>
            <select value={pitchId} onChange={e => handlePitchChange(e.target.value)} style={inputStyle(!!errors.pitchId)}>
              <option value="">Select a pitch...</option>
              {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            {errors.pitchId && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Please select a pitch</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Dressing Rooms</label>
            <select value={dressingRoom} onChange={e => setDressingRoom(e.target.value)} style={inputStyle(false)}>
              <option value="none">No dressing room required</option>
              <option value="rooms_1_2">Rooms 1 & 2</option>
              <option value="rooms_3_4">Rooms 3 & 4</option>
              <option value="rooms_1_2_3_4">Rooms 1, 2, 3 & 4</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Do you require showers?</label>
            <select value={showers} onChange={e => setShowers(e.target.value)} style={inputStyle(false)}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Date{requiredStar}</label>
            <input type="date" value={date} onChange={e => handleDateChange(e.target.value)} style={inputStyle(!!errors.date)} />
            {errors.date && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>Please select a date</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
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

          <div style={fieldStyle}>
            <label style={labelStyle}>Purpose</label>
            <select value={purpose} onChange={e => setPurpose(e.target.value)} style={inputStyle(false)}>
              <option value="Training">Training</option>
              <option value="Match / Fixture">Match / Fixture</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Approximate Number of People</label>
            <input type="number" value={approxNumbers} onChange={e => setApproxNumbers(e.target.value)} placeholder="e.g. 25" style={inputStyle(false)} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Additional Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requirements..." rows={3} style={{ ...inputStyle(false), resize: 'vertical' }} />
          </div>

          {submitError && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '14px' }}>
              {submitError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <button onClick={handleCancel} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '13px', fontWeight: '600', color: '#dc2626', backgroundColor: 'white', cursor: 'pointer' }}>Cancel Booking</button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/my-bookings" style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: '600', color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Back</a>
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#111', color: 'white', fontSize: '13px', fontWeight: '600', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}