'use client'
import { useEffect, useState, useRef } from 'react'
import { AlertTriangle, Bus, Calendar, Clock, Home, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Navbar from '@/components/Navbar'

interface Fixture {
  id: string
  team_name: string
  opposition: string
  venue_id: string
  venue_name: string
  home_away: string
  fixture_date: string
  fixture_time: string
  sport: string
  competition: string
  notes: string
  posted_by: string
}

interface Venue {
  id: string
  name: string
  town_area: string
  eircode: string
  android_map_url: string
  ios_map_url: string
  is_home: boolean
}

interface Pitch {
  id: number
  name: string
  colour: string
}

const SPORTS = ["Men's/Boys Hurling", "Men's/Boys Gaelic", "LGFA", "Other"]
const SPORT_TEAMS: Record<string, string[]> = {
  "Men's/Boys Hurling": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Junior','Intermediate','Pre-Intermediate','Senior'],
  "Men's/Boys Gaelic": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Junior','Intermediate','Pre-Intermediate','Senior'],
  'LGFA': ['U10','U11','U12','U13','U14','U16','U18','Junior','Intermediate','Senior'],
  'Other': ['Other'],
}
const COMPETITIONS = ['League', 'Championship', 'Friendly', 'Other']
const TIME_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00']

function HomeAwayMark({ homeAway }: { homeAway: string }) {
  const isHome = homeAway === 'home'
  const Icon = isHome ? Home : Bus
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isHome ? 'text-approved' : 'text-info'}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {isHome ? 'Home' : 'Away'}
    </span>
  )
}

export default function FixturesPage() {
  const [userRole, setUserRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [pitchId, setPitchId] = useState('')
  const [conflict, setConflict] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [venueSearch, setVenueSearch] = useState('')
  const [venueDropdown, setVenueDropdown] = useState(false)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterType, setFilterType] = useState('upcoming')
    const [responses, setResponses] = useState<Record<string, { attending: number; declined: number; mine: string | null; names: { attending: string[]; declined: string[] } }>>({})
  const [expandedFixture, setExpandedFixture] = useState<string | null>(null)
  const venueRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    team_name: '', opposition: '', sport: "Men's/Boys Hurling",
    venue_id: '', venue_name: '', home_away: 'away',
    fixture_date: '', fixture_time: '14:00',
    competition: 'League', notes: ''
  })

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserRole(profile.role || '')
      setCurrentUserId(session.user.id)
      await Promise.all([fetchFixtures(session.user.id), fetchVenues(), fetchPitches()])
      setLoading(false)
    }
    init()
        // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (venueRef.current && !venueRef.current.contains(e.target as Node)) {
        setVenueDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('selectedTeam')
    if (stored) setFilterTeam(stored)
    function onTeamChange() {
      const updated = localStorage.getItem('selectedTeam')
      if (updated) setFilterTeam(updated)
    }
    window.addEventListener('teamchange', onTeamChange)
    return () => window.removeEventListener('teamchange', onTeamChange)
  }, [])

  async function fetchFixtures(userId?: string) {
    const { data } = await supabase.from('fixtures').select('*').order('fixture_date', { ascending: true })
    if (data) {
      setFixtures(data)
      await fetchResponses(data.map(f => f.id), userId || currentUserId)
    }
  }

  async function fetchResponses(fixtureIds: string[], userId?: string) {
    if (fixtureIds.length === 0) return
    const { data } = await supabase
      .from('responses')
      .select('event_id, user_id, response, profiles(full_name)')
      .eq('event_type', 'fixture')
      .in('event_id', fixtureIds)
    if (!data) return
    const uid = userId || currentUserId
    const summary: Record<string, { attending: number; declined: number; mine: string | null; names: { attending: string[]; declined: string[] } }> = {}
    for (const id of fixtureIds) summary[id] = { attending: 0, declined: 0, mine: null, names: { attending: [], declined: [] } }
    for (const row of data) {
      const name = (row.profiles as unknown as { full_name: string } | null)?.full_name || 'Unknown'
      if (row.response === 'attending') { summary[row.event_id].attending++; summary[row.event_id].names.attending.push(name) }
      if (row.response === 'declined') { summary[row.event_id].declined++; summary[row.event_id].names.declined.push(name) }
      if (row.user_id === uid) summary[row.event_id].mine = row.response
    }
    setResponses(summary)
  }

  async function handleRsvp(fixtureId: string, response: 'attending' | 'declined') {
    await supabase.from('responses').upsert({
      event_id: fixtureId,
      event_type: 'fixture',
      user_id: currentUserId,
      response,
    }, { onConflict: 'event_id,event_type,user_id' })
    await fetchResponses(fixtures.map(f => f.id))
  }

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*').order('name')
    if (data) setVenues(data)
  }

  async function fetchPitches() {
    const { data } = await supabase.from('pitches').select('id, name, colour').eq('is_active', true).order('sort_order')
    if (data && data.length > 0) {
      setPitches(data)
      setPitchId(prev => prev || String(data[0].id))
    }
  }

  function addMatchDuration(t: string) {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    const total = h * 60 + m + 75
    const newH = Math.min(Math.floor(total / 60), 23)
    const newM = total % 60
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
  }

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

  async function handleSubmit() {
    if (!form.team_name || !form.opposition || !form.fixture_date || !form.venue_name) return
    setSubmitting(true)
    const startTime = form.fixture_time.slice(0, 5)
    const endTime = addMatchDuration(startTime)
    if (form.home_away === 'home') {
      if (!pitchId) { setSubmitting(false); return }
      const c = await checkConflict(pitchId, form.fixture_date, startTime, endTime)
      setConflict(c)
      if (c) { setSubmitting(false); return }
    }
    const teamName = `${form.sport} ${form.team_name}`.trim()
    await supabase.from('fixtures').insert({
      ...form,
      team_name: teamName,
      posted_by: currentUserId
    })

    if (form.home_away === 'home') {
      const { error: bookingError } = await supabase.from('bookings').insert({
        user_id: currentUserId,
        pitch_id: parseInt(pitchId),
        team_name: teamName,
        purpose: 'Match / Fixture',
        status: 'approved',
        booking_date: form.fixture_date,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        facility_type: 'pitch',
      })
      if (bookingError) console.error('Home fixture booking insert failed:', bookingError)
    }

    fetch('/api/notify-fixture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_name: teamName,
        opposition: form.opposition,
        fixture_date: form.fixture_date,
        venue_name: form.venue_name,
      }),
    }).catch(err => console.error('Push notify failed:', err))

    setShowModal(false)
    resetForm()
    await fetchFixtures()
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this fixture?')) return
    await supabase.from('fixtures').delete().eq('id', id)
    await fetchFixtures()
  }

  function resetForm() {
    setForm({ team_name: '', opposition: '', sport: "Men's/Boys Hurling", venue_id: '', venue_name: '', home_away: 'away', fixture_date: '', fixture_time: '14:00', competition: 'League', notes: '' })
    setVenueSearch('')
    setConflict(null)
    if (pitches[0]) setPitchId(String(pitches[0].id))
  }

  function selectVenue(v: Venue) {
    setForm({ ...form, venue_id: v.id, venue_name: v.name })
    setVenueSearch(v.name)
    setVenueDropdown(false)
  }

  const filteredVenues = venues.filter(v =>
    v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    v.town_area.toLowerCase().includes(venueSearch.toLowerCase())
  )

  const today = new Date().toISOString().split('T')[0]
  const teams = Array.from(new Set(fixtures.map(f => f.team_name)))

  const filtered = fixtures.filter(f => {
    if (filterTeam && f.team_name !== filterTeam) return false
    if (filterType === 'upcoming' && f.fixture_date < today) return false
    if (filterType === 'past' && f.fixture_date >= today) return false
    return true
  })

  const inputClass = 'w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-ink outline-none focus:outline-none focus:ring-2 focus:ring-approved'
  const labelClass = 'mb-1 block text-[13px] font-semibold text-ink'
  const fieldClass = 'mb-3'

  function getDirectionsUrl(venue: Venue) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    return isIOS ? venue.ios_map_url : venue.android_map_url
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-12 text-center text-neutral">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Fixtures" userRole={userRole} />
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-bold text-ink">
              <Calendar className="h-5 w-5 shrink-0" aria-hidden="true" />
              Fixtures
            </h1>
            <p className="mt-0.5 text-[13px] text-neutral">St. Saviours GAA & LGFA</p>
          </div>
          {(userRole === 'coach' || userRole === 'admin') && (
            <button onClick={() => setShowModal(true)} className="cursor-pointer rounded-lg border-none bg-ink px-4 py-2 text-[13px] font-semibold text-white">+ Add Fixture</button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {['upcoming', 'past', 'all'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`cursor-pointer rounded-full border border-gray-200 px-3 py-[5px] text-xs font-medium ${filterType === t ? 'bg-ink text-white' : 'bg-white text-ink'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {teams.length > 0 && (
            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="rounded-full border border-gray-200 bg-white px-2.5 py-[5px] text-xs text-ink">
              <option value="">All Teams</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-[10px] bg-white px-4 py-10 text-center text-neutral">No fixtures found</div>
        )}

        {filtered.map(f => {
          const venue = venues.find(v => v.id === f.venue_id)
          const isHome = f.home_away === 'home'
          return (
            <div key={f.id} className={`mb-2 rounded-lg border-l-4 bg-white px-4 py-3 shadow-sm ${isHome ? 'border-l-approved' : 'border-l-info'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <HomeAwayMark homeAway={f.home_away} />
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral">
                      <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {new Date(f.fixture_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {f.fixture_time && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral">
                        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {f.fixture_time.slice(0,5)}
                      </span>
                    )}
                  </div>
                  <div className="mb-0.5 text-sm font-bold text-ink">{f.team_name}</div>
                  <div className="mb-1 text-[13px] text-ink">vs <span className="font-semibold">{f.opposition}</span></div>
                  <div className="mb-1 flex items-start gap-1 text-xs text-ink">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>
                      {f.venue_name}
                      {venue?.town_area ? ` · ${venue.town_area}` : ''}
                      {venue?.eircode ? ` · ${venue.eircode}` : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral">{f.competition} · {f.sport}</div>
                  {f.notes && <div className="mt-1 text-[11px] italic text-ink">{f.notes}</div>}
                  {venue && (
                    <a href={getDirectionsUrl(venue)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-md bg-info px-2.5 py-1 text-[11px] font-semibold text-white no-underline">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      Get Directions
                    </a>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleRsvp(f.id, 'attending')}
                      className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold ${responses[f.id]?.mine === 'attending' ? 'border-approved bg-approved text-white' : 'border-approved/40 bg-white text-approved'}`}
                    >
                      Attending {responses[f.id]?.attending ? `(${responses[f.id].attending})` : ''}
                    </button>
                    <button
                      onClick={() => handleRsvp(f.id, 'declined')}
                      className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold ${responses[f.id]?.mine === 'declined' ? 'border-rejected bg-rejected text-white' : 'border-rejected/40 bg-white text-rejected'}`}
                    >
                      Declined {responses[f.id]?.declined ? `(${responses[f.id].declined})` : ''}
                    </button>
                    {(userRole === 'admin' || userRole === 'coach') && (responses[f.id]?.attending > 0 || responses[f.id]?.declined > 0) && (
                      <button
                        onClick={() => setExpandedFixture(expandedFixture === f.id ? null : f.id)}
                        className="cursor-pointer text-xs font-semibold text-neutral underline"
                      >
                        {expandedFixture === f.id ? 'Hide' : 'Who?'}
                      </button>
                    )}
                  </div>
                  {expandedFixture === f.id && (userRole === 'admin' || userRole === 'coach') && (
                    <div className="mt-2 rounded-md bg-gray-50 p-2.5 text-xs">
                      {responses[f.id].names.attending.length > 0 && (
                        <div className="mb-1"><span className="font-semibold text-approved">Attending:</span> {responses[f.id].names.attending.join(', ')}</div>
                      )}
                      {responses[f.id].names.declined.length > 0 && (
                        <div><span className="font-semibold text-rejected">Declined:</span> {responses[f.id].names.declined.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
                {(userRole === 'admin' || f.posted_by === currentUserId) && (
                  <button onClick={() => handleDelete(f.id)} className="shrink-0 cursor-pointer rounded-md border border-rejected/40 bg-white px-2 py-[3px] text-[11px] text-rejected">Delete</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 w-full max-w-[500px] max-h-[90vh] min-h-0 overflow-y-auto rounded-xl bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
              <Calendar className="h-5 w-5 shrink-0" aria-hidden="true" />
              Add Fixture
            </h2>

            <div className={fieldClass}>
              <label className={labelClass}>Sport</label>
              <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value, team_name: '' })} className={inputClass}>
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Our Team</label>
                <select value={form.team_name} onChange={e => setForm({ ...form, team_name: e.target.value })} className={inputClass}>
                  <option value="">Select team...</option>
                  {(SPORT_TEAMS[form.sport] || []).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className={labelClass}>Opposition</label>
                <input
                  value={form.opposition}
                  onChange={e => setForm({ ...form, opposition: e.target.value })}
                  onFocus={() => form.opposition.length > 0}
                  placeholder="Search club name..."
                  className={inputClass}
                  autoComplete="off"
                />
                {form.opposition.length > 0 && venues.filter(v => v.name.toLowerCase().includes(form.opposition.toLowerCase())).length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-[100] max-h-[200px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-md">
                    {venues.filter(v => v.name.toLowerCase().includes(form.opposition.toLowerCase())).slice(0, 8).map(v => (
                      <div key={v.id}
                        onClick={() => setForm({ ...form, opposition: v.name })}
                        className="cursor-pointer border-b border-gray-100 px-3 py-2 text-[13px] text-ink hover:bg-gray-50">
                        {v.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date</label>
                <input type="date" value={form.fixture_date} min={new Date().toISOString().split('T')[0]} onChange={e => { setConflict(null); setForm({ ...form, fixture_date: e.target.value }) }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Time</label>
                <select value={form.fixture_time} onChange={e => { setConflict(null); setForm({ ...form, fixture_time: e.target.value }) }} className={inputClass}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Competition</label>
                <select value={form.competition} onChange={e => setForm({ ...form, competition: e.target.value })} className={inputClass}>
                  {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Home / Away</label>
                <select value={form.home_away} onChange={e => {
                  const val = e.target.value
                  setConflict(null)
                  if (val === 'home') {
                    if (pitches[0] && !pitchId) setPitchId(String(pitches[0].id))
                    const homeVenue = venues.find(v => v.is_home)
                    if (homeVenue) {
                      setForm({ ...form, home_away: val, venue_id: homeVenue.id, venue_name: homeVenue.name })
                      setVenueSearch(homeVenue.name)
                    } else {
                      setForm({ ...form, home_away: val })
                    }
                  } else {
                    setForm({ ...form, home_away: val, venue_id: '', venue_name: '' })
                    setVenueSearch('')
                  }
                }} className={inputClass}>
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                </select>
              </div>
            </div>

            {form.home_away === 'home' && (
              <div className={fieldClass}>
                <label className={labelClass}>Pitch</label>
                <select value={pitchId} onChange={e => { setConflict(null); setPitchId(e.target.value) }} className={inputClass}>
                  {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              </div>
            )}
            {form.home_away === 'home' && conflict !== null && (
              <div className={`mb-3 rounded-lg border px-3.5 py-2.5 text-sm font-semibold ${conflict ? 'border-rejected/40 bg-rejected/10 text-rejected' : 'border-approved/40 bg-approved/10 text-approved'}`}>
                {conflict ? (
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Conflict detected — this pitch is already booked at this time
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    Available
                  </span>
                )}
              </div>
            )}

            <div className={`${fieldClass} relative`} ref={venueRef}>
              <label className={labelClass}>Venue</label>
              <input
                value={venueSearch}
                onChange={e => { setVenueSearch(e.target.value); setVenueDropdown(true); setForm({ ...form, venue_id: '', venue_name: e.target.value }) }}
                onFocus={() => setVenueDropdown(true)}
                placeholder="Search venue or type name..."
                className={inputClass}
              />
              {venueDropdown && venueSearch.length > 0 && filteredVenues.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-[100] max-h-[200px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-md">
                  {filteredVenues.slice(0, 8).map(v => (
                    <div key={v.id} onClick={() => selectVenue(v)}
                      className="cursor-pointer border-b border-gray-100 px-3 py-2 text-[13px] text-ink hover:bg-gray-50">
                      <div className="font-semibold">{v.name}</div>
                      <div className="text-[11px] text-neutral">{v.town_area} · {v.eircode}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. County Final — bring full panel" rows={2} className={`${inputClass} resize-y py-2.5`} />
            </div>

            <div className="flex justify-end gap-2.5">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Fixture'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
