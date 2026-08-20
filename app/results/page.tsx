'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

interface Result {
  id: string
  team_name: string
  opposition: string
  our_goals: number
  our_points: number
  our_two_pointers: number
  their_goals: number
  their_points: number
  their_two_pointers: number
  result: string
  competition: string
  match_date: string
  home_away: string
  sport: string
  notes: string
  posted_by: string
  created_at: string
}

const SPORTS = ["Men's/Boys Hurling", "Men's/Boys Gaelic", "LGFA", "Other"]

const SPORT_TEAMS: Record<string, string[]> = {
  "Men's/Boys Hurling": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Junior','Intermediate','Pre-Intermediate','Senior'],
  "Men's/Boys Gaelic": ['U6','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U18','U20','Junior','Intermediate','Pre-Intermediate','Senior'],
  'LGFA': ['U10','U11','U12','U13','U14','U16','U18','Junior','Intermediate','Senior'],
  'Other': ['Other'],
}
const COMPETITIONS = ['League', 'Championship', 'Friendly', 'Other']

function formatScore(goals: number, points: number, twoPointers: number, sport: string) {
  const isAdultFootball = sport === "Men's/Boys Gaelic"
  if (isAdultFootball && twoPointers > 0) {
    const displayPoints = points + (twoPointers * 2)
    return `${goals}-${displayPoints} (${twoPointers}tp)`
  }
  return `${goals}-${points}`
}

function calcTotal(goals: number, points: number, twoPointers: number) {
  return (goals * 3) + points + (twoPointers * 2)
}

export default function ResultsPage() {
  const [userRole, setUserRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Result[]>([])
  const [filterTeam, setFilterTeam] = useState('')
  const [filterComp, setFilterComp] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    team_name: '', opposition: '', sport: "Men's/Boys Hurling",
    our_goals: 0, our_points: 0, our_two_pointers: 0,
    their_goals: 0, their_points: 0, their_two_pointers: 0,
    competition: '', match_date: '', home_away: 'home', notes: ''
  })

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserRole(profile.role || '')
      setCurrentUserId(session.user.id)
      await fetchResults()
      setLoading(false)
    }
    init()
  }, [])

  async function fetchResults() {
    const { data } = await supabase.from('results').select('*').order('match_date', { ascending: false })
    if (data) setResults(data)
  }

  async function handleSubmit() {
    if (!form.team_name || !form.opposition || !form.competition || !form.match_date) return
    setSubmitting(true)
    const ourTotal = calcTotal(form.our_goals, form.our_points, form.our_two_pointers)
    const theirTotal = calcTotal(form.their_goals, form.their_points, form.their_two_pointers)
    const result = ourTotal > theirTotal ? 'win' : ourTotal < theirTotal ? 'loss' : 'draw'
    await supabase.from('results').insert({
      ...form,
      result,
      posted_by: currentUserId
    })
    setShowModal(false)
    setForm({ team_name: '', opposition: '', sport: "Men's/Boys Hurling", our_goals: 0, our_points: 0, our_two_pointers: 0, their_goals: 0, their_points: 0, their_two_pointers: 0, competition: '', match_date: '', home_away: 'home', notes: '' })
    await fetchResults()
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this result?')) return
    await supabase.from('results').delete().eq('id', id)
    await fetchResults()
  }

  const filtered = results.filter(r => {
    if (filterTeam && r.team_name !== filterTeam) return false
    if (filterComp && r.competition !== filterComp) return false
    return true
  })

  const teams = Array.from(new Set(results.map(r => r.team_name)))

  const resultColour = (r: string) => r === 'win' ? '#16a34a' : r === 'loss' ? '#dc2626' : '#d97706'
  const resultBg = (r: string) => r === 'win' ? '#f0fdf4' : r === 'loss' ? '#fef2f2' : '#fefce8'
  const resultBorder = (r: string) => r === 'win' ? '#2e7d32' : r === 'loss' ? '#dc2626' : '#f9ab2b'
  const resultLabel = (r: string) => r === 'win' ? '🟢 WIN' : r === 'loss' ? '🔴 LOSS' : '🟡 DRAW'
  const homeAwayIcon = (h: string) => h === 'home' ? '🏠' : h === 'away' ? '🚌' : '🔄'

  const inputStyle = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', color: '#111', outline: 'none', backgroundColor: 'white' }
  const labelStyle = { fontSize: '13px', fontWeight: '600' as const, color: '#111', display: 'block' as const, marginBottom: '4px' }
  const fieldStyle = { marginBottom: '12px' }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading...</div>
    </div>
  )

  const isAdultFootball = form.sport === "Men's/Boys Gaelic"

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Results" userRole={userRole} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111' }}>🏆 Match Results</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>St. Saviours GAA & LGFA</p>
          </div>
          {(userRole === 'coach' || userRole === 'admin') && (
            <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Post Result</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', color: '#111', backgroundColor: 'white' }}>
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterComp} onChange={e => setFilterComp(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', color: '#111', backgroundColor: 'white' }}>
            <option value="">All Competitions</option>
            {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(filterTeam || filterComp) && (
            <button onClick={() => { setFilterTeam(''); setFilterComp('') }} style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'white', color: '#111' }}>Clear</button>
          )}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '10px', color: '#888' }}>No results yet</div>
        )}

        {filtered.map(r => (
          <div key={r.id} style={{ backgroundColor: resultBg(r.result), borderRadius: '8px', borderLeft: `4px solid ${resultBorder(r.result)}`, padding: '12px 16px', marginBottom: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: resultColour(r.result) }}>{resultLabel(r.result)}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{homeAwayIcon(r.home_away)} {r.home_away.charAt(0).toUpperCase() + r.home_away.slice(1)}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>📅 {new Date(r.match_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>{r.team_name}</div>
                <div style={{ fontSize: '13px', color: '#111', marginBottom: '2px' }}>
                  <span style={{ fontWeight: '600' }}>St Saviours: {formatScore(r.our_goals, r.our_points, r.our_two_pointers, r.sport)}</span>
                  {' v '}
                  <span>{r.opposition}: {formatScore(r.their_goals, r.their_points, r.their_two_pointers, r.sport)}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{r.competition} · {r.sport}</div>
                {r.notes && <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px', fontStyle: 'italic' }}>{r.notes}</div>}
              </div>
              {(userRole === 'admin' || r.posted_by === currentUserId) && (
                <button onClick={() => handleDelete(r.id)} style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #fca5a5', color: '#dc2626', backgroundColor: 'white', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111' }}>🏆 Post Result</h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>Sport</label>
              <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })} style={inputStyle}>
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
              <div>
                <label style={labelStyle}>Opposition</label>
                <input value={form.opposition} onChange={e => setForm({ ...form, opposition: e.target.value })} placeholder="e.g. Ballyduff" style={inputStyle} />
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Our Score</label>
              <div style={{ display: 'grid', gridTemplateColumns: isAdultFootball ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Goals</label>
                  <input type="number" min="0" value={form.our_goals} onChange={e => setForm({ ...form, our_goals: parseInt(e.target.value) || 0 })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Points</label>
                  <input type="number" min="0" value={form.our_points} onChange={e => setForm({ ...form, our_points: parseInt(e.target.value) || 0 })} style={inputStyle} />
                </div>
                {isAdultFootball && (
                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>2-Pointers</label>
                    <input type="number" min="0" value={form.our_two_pointers} onChange={e => setForm({ ...form, our_two_pointers: parseInt(e.target.value) || 0 })} style={inputStyle} />
                  </div>
                )}
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Their Score</label>
              <div style={{ display: 'grid', gridTemplateColumns: isAdultFootball ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Goals</label>
                  <input type="number" min="0" value={form.their_goals} onChange={e => setForm({ ...form, their_goals: parseInt(e.target.value) || 0 })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Points</label>
                  <input type="number" min="0" value={form.their_points} onChange={e => setForm({ ...form, their_points: parseInt(e.target.value) || 0 })} style={inputStyle} />
                </div>
                {isAdultFootball && (
                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>2-Pointers</label>
                    <input type="number" min="0" value={form.their_two_pointers} onChange={e => setForm({ ...form, their_two_pointers: parseInt(e.target.value) || 0 })} style={inputStyle} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Competition</label>
                <select value={form.competition} onChange={e => setForm({ ...form, competition: e.target.value })} style={inputStyle}>
                  <option value="">Select...</option>
                  {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Home / Away</label>
                <select value={form.home_away} onChange={e => setForm({ ...form, home_away: e.target.value })} style={inputStyle}>
                  <option value="home">🏠 Home</option>
                  <option value="away">🚌 Away</option>
                  <option value="neutral">🔄 Neutral</option>
                </select>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Match Date</label>
              <input type="date" value={form.match_date} onChange={e => setForm({ ...form, match_date: e.target.value })} style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Great performance from the whole team!" rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: '600', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#111', color: 'white', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Posting...' : 'Post Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}