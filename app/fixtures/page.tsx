'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
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

const SPORTS = ["Men's/Boys Hurling", "Men's/Boys Gaelic", "LGFA", "Other"]
const SPORT_TEAMS: Record<string, string[]> = {
  "Men's/Boys Hurling": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Junior','Intermediate','Pre-Intermediate','Senior'],
  "Men's/Boys Gaelic": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Junior','Intermediate','Pre-Intermediate','Senior'],
  'LGFA': ['U10','U11','U12','U13','U14','U16','U18','Junior','Intermediate','Senior'],
  'Other': ['Other'],
}
const COMPETITIONS = ['League', 'Championship', 'Friendly', 'Other']
const TIME_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00']

export default function FixturesPage() {
  const [userRole, setUserRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [venueSearch, setVenueSearch] = useState('')
  const [venueDropdown, setVenueDropdown] = useState(false)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterType, setFilterType] = useState('upcoming')
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
      await Promise.all([fetchFixtures(), fetchVenues()])
      setLoading(false)
    }
    init()
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

  async function fetchFixtures() {
    const { data } = await supabase.from('fixtures').select('*').order('fixture_date', { ascending: true })
    if (data) setFixtures(data)
  }

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*').order('name')
    if (data) setVenues(data)
  }

  async function handleSubmit() {
    if (!form.team_name || !form.opposition || !form.fixture_date || !form.venue_name) return
    setSubmitting(true)
    await supabase.from('fixtures').insert({
      ...form,
      posted_by: currentUserId
    })
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

  const homeAwayIcon = (h: string) => h === 'home' ? '🏠 Home' : '🚌 Away'
  const homeAwayColour = (h: string) => h === 'home' ? '#2e7d32' : '#2563eb'

  const inputStyle = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', color: '#111', outline: 'none', backgroundColor: 'white' }
  const labelStyle = { fontSize: '13px', fontWeight: '600' as const, color: '#111', display: 'block' as const, marginBottom: '4px' }
  const fieldStyle = { marginBottom: '12px' }

  function getDirectionsUrl(venue: Venue) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    return isIOS ? venue.ios_map_url : venue.android_map_url
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Fixtures" userRole={userRole} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111' }}>📅 Fixtures</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>St. Saviours GAA & LGFA</p>
          </div>
          {(userRole === 'coach' || userRole === 'admin') && (
            <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Add Fixture</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['upcoming', 'past', 'all'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid #d1d5db', fontSize: '12px', fontWeight: '500', backgroundColor: filterType === t ? '#111' : 'white', color: filterType === t ? 'white' : '#374151', cursor: 'pointer' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {teams.length > 0 && (
            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '20px', padding: '5px 10px', fontSize: '12px', color: '#111', backgroundColor: 'white' }}>
              <option value="">All Teams</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '10px', color: '#888' }}>No fixtures found</div>
        )}

        {filtered.map(f => {
          const venue = venues.find(v => v.id === f.venue_id)
          return (
            <div key={f.id} style={{ backgroundColor: 'white', borderRadius: '8px', borderLeft: `4px solid ${homeAwayColour(f.home_away)}`, padding: '12px 16px', marginBottom: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: homeAwayColour(f.home_away) }}>{homeAwayIcon(f.home_away)}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>📅 {new Date(f.fixture_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {f.fixture_time && <span style={{ fontSize: '11px', color: '#6b7280' }}>⏰ {f.fixture_time.slice(0,5)}</span>}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>{f.team_name}</div>
                  <div style={{ fontSize: '13px', color: '#111', marginBottom: '4px' }}>vs <span style={{ fontWeight: '600' }}>{f.opposition}</span></div>
                  <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                    📍 {f.venue_name}
                    {venue?.town_area ? ` · ${venue.town_area}` : ''}
                    {venue?.eircode ? ` · ${venue.eircode}` : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{f.competition} · {f.sport}</div>
                  {f.notes && <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px', fontStyle: 'italic' }}>{f.notes}</div>}
                  {venue && (
                    <a href={getDirectionsUrl(venue)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', backgroundColor: '#2563eb', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', textDecoration: 'none' }}>📍 Get Directions</a>
                  )}
                </div>
                {(userRole === 'admin' || f.posted_by === currentUserId) && (
                  <button onClick={() => handleDelete(f.id)} style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #fca5a5', color: '#dc2626', backgroundColor: 'white', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>Delete</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111' }}>📅 Add Fixture</h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>Sport</label>
              <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value, team_name: '' })} style={inputStyle}>
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Our Team</label>
                <select value={form.team_name} onChange={e => setForm({ ...form, team_name: e.target.value })} style={inputStyle}>
                  <option value="">Select team...</option>
                  {(SPORT_TEAMS[form.sport] || []).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Opposition</label>
                <input
                  value={form.opposition}
                  onChange={e => setForm({ ...form, opposition: e.target.value })}
                  onFocus={() => form.opposition.length > 0}
                  placeholder="Search club name..."
                  style={inputStyle}
                  autoComplete="off"
                />
                {form.opposition.length > 0 && venues.filter(v => v.name.toLowerCase().includes(form.opposition.toLowerCase())).length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                    {venues.filter(v => v.name.toLowerCase().includes(form.opposition.toLowerCase())).slice(0, 8).map(v => (
                      <div key={v.id}
                        onClick={() => setForm({ ...form, opposition: v.name })}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#111' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}>
                        {v.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={form.fixture_date} min={new Date().toISOString().split('T')[0]} onChange={e => setForm({ ...form, fixture_date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Time</label>
                <select value={form.fixture_time} onChange={e => setForm({ ...form, fixture_time: e.target.value })} style={inputStyle}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Competition</label>
                <select value={form.competition} onChange={e => setForm({ ...form, competition: e.target.value })} style={inputStyle}>
                  {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Home / Away</label>
                <select value={form.home_away} onChange={e => {
                  const val = e.target.value
                  if (val === 'home') {
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
                }} style={inputStyle}>
                  <option value="home">🏠 Home</option>
                  <option value="away">🚌 Away</option>
                </select>
              </div>
            </div>

            <div style={{ ...fieldStyle, position: 'relative' }} ref={venueRef}>
              <label style={labelStyle}>Venue</label>
              <input
                value={venueSearch}
                onChange={e => { setVenueSearch(e.target.value); setVenueDropdown(true); setForm({ ...form, venue_id: '', venue_name: e.target.value }) }}
                onFocus={() => setVenueDropdown(true)}
                placeholder="Search venue or type name..."
                style={inputStyle}
              />
              {venueDropdown && venueSearch.length > 0 && filteredVenues.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredVenues.slice(0, 8).map(v => (
                    <div key={v.id} onClick={() => selectVenue(v)}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#111' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}>
                      <div style={{ fontWeight: '600' }}>{v.name}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{v.town_area} · {v.eircode}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. County Final — bring full panel" rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: '600', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#111', color: 'white', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Adding...' : 'Add Fixture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}