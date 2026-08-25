'use client'

import Navbar from '@/components/Navbar'
import Button from '@/components/ui/Button'
import { AlertTriangle, Check, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

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

  const [, setUserId] = useState('')
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

  const fieldClass = (hasError: boolean) =>
    `w-full min-h-[44px] rounded-lg border bg-white px-3 text-sm text-ink outline-none focus:outline-none focus:ring-2 focus:ring-approved ${hasError ? 'border-rejected' : 'border-gray-200'}`
  const labelClass = 'mb-1.5 block text-sm font-semibold text-ink'
  const fieldWrapClass = 'mb-4'
  const requiredStar = <span className="text-rejected"> *</span>
  const errorClass = 'mt-1 text-xs text-rejected'

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <p className="text-neutral">Loading...</p>
    </div>
  )

  if (notFound) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="mb-3 text-ink">Booking not found.</p>
        <a href="/my-bookings" className="font-semibold text-ink">Back to My Bookings</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="" userRole={userRole} />

      <div className="mx-auto my-8 max-w-[640px] px-4">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <h1 className="mb-1 flex items-center gap-2 text-[22px] font-bold text-ink">
            <Pencil className="h-5 w-5 shrink-0" aria-hidden="true" />
            Edit Booking
          </h1>
          <p className="mb-6 text-[13px] text-neutral">Fields marked <span className="text-rejected">*</span> are required</p>

          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <div>
              <label className={labelClass}>Sport / Code{requiredStar}</label>
              <select value={sport} onChange={e => { setSport(e.target.value); setAgeGroup('') }} className={fieldClass(!!errors.sport)}>
                <option value="">Select sport...</option>
                {Object.keys(SPORTS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.sport && <p className={errorClass}>Please select a sport</p>}
            </div>
            <div>
              <label className={labelClass}>Pitch{requiredStar}</label>
              <select value={pitchId} onChange={e => handlePitchChange(e.target.value)} className={fieldClass(!!errors.pitchId)}>
                <option value="">Select a pitch...</option>
                {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              {errors.pitchId && <p className={errorClass}>Please select a pitch</p>}
            </div>
          </div>

          {sport && SPORTS[sport] && (
            <div className={fieldWrapClass}>
              <label className={labelClass}>Age Group / Team{requiredStar}</label>
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className={fieldClass(!!errors.ageGroup)}>
                <option value="">Select age group...</option>
                {SPORTS[sport].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {errors.ageGroup && <p className={errorClass}>Please select an age group</p>}
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Purpose</label>
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
            <label className={labelClass}>Date{requiredStar}</label>
            <input type="date" value={date} onChange={e => handleDateChange(e.target.value)} className={fieldClass(!!errors.date)} />
            {errors.date && <p className={errorClass}>Please select a date</p>}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
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

          <div className={fieldWrapClass}>
            <label className={labelClass}>Additional Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requirements..." rows={3} className={`${fieldClass(false)} resize-y py-2.5`} />
          </div>

          {submitError && (
            <div className="mb-4 rounded-lg border border-rejected/40 bg-rejected/10 px-3.5 py-2.5 text-sm text-rejected">
              {submitError}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Button variant="rejected" onClick={handleCancel}>Cancel Booking</Button>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => { window.location.href = '/my-bookings' }}>Back</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}