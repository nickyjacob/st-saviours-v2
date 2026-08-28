'use client'
import { useEffect, useState } from 'react'
import { Bus, Calendar, Home, Shuffle, Trophy } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { StatusTone } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
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
    return `${goals}-${displayPoints} (${twoPointers}×2pt)`
  }
  return `${goals}-${points}`
}

function calcTotal(goals: number, points: number, twoPointers: number) {
  return (goals * 3) + points + (twoPointers * 2)
}

function HomeAwayMark({ homeAway }: { homeAway: string }) {
  const isHome = homeAway === 'home'
  const isAway = homeAway === 'away'
  const Icon = isHome ? Home : isAway ? Bus : Shuffle
  const label = homeAway.charAt(0).toUpperCase() + homeAway.slice(1)
  const tone = isHome ? 'text-approved' : isAway ? 'text-info' : 'text-neutral'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${tone}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  )
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
  const [fixtures, setFixtures] = useState<{id: string; team_name: string; opposition: string; fixture_date: string; competition: string; home_away: string; sport: string}[]>([])
  const [form, setForm] = useState({
    team_name: '', opposition: '', sport: "Men's/Boys Hurling",
    our_goals: 0, our_points: 0, our_two_pointers: 0,
    their_goals: 0, their_points: 0, their_two_pointers: 0,
    competition: '', match_date: '', home_away: 'home', notes: '', fixture_id: ''
  })

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserRole(profile.role || '')
      setCurrentUserId(session.user.id)
      await Promise.all([fetchResults(), fetchFixtures()])
      setLoading(false)
    }
    init()
  }, [])

  async function fetchFixtures() {
    const { data } = await supabase.from('fixtures').select('id, team_name, opposition, fixture_date, competition, home_away, sport').order('fixture_date', { ascending: false })
    if (data) setFixtures(data)
  }

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

    fetch('/api/notify-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_name: form.team_name,
        opposition: form.opposition,
        result,
        score_display: `${ourTotal}-${theirTotal}`,
      }),
    }).catch(err => console.error('Push notify failed:', err))

    setShowModal(false)
    setForm({ team_name: '', opposition: '', sport: "Men's/Boys Hurling", our_goals: 0, our_points: 0, our_two_pointers: 0, their_goals: 0, their_points: 0, their_two_pointers: 0, competition: '', match_date: '', home_away: 'home', notes: '', fixture_id: '' })
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

  const resultBg = (r: string) => r === 'win' ? '#f0fdf4' : r === 'loss' ? '#fef2f2' : '#fefce8'
  const resultBorder = (r: string) => r === 'win' ? '#2e7d32' : r === 'loss' ? '#dc2626' : '#f9ab2b'
  const resultTone = (r: string): StatusTone => r === 'win' ? 'approved' : r === 'loss' ? 'rejected' : 'pending'
  const resultLabel = (r: string) => r === 'win' ? 'WIN' : r === 'loss' ? 'LOSS' : 'DRAW'

  const inputClass = 'w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-ink outline-none focus:outline-none focus:ring-2 focus:ring-approved'
  const labelClass = 'mb-1 block text-[13px] font-semibold text-ink'
  const fieldClass = 'mb-3'

  if (loading) return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-12 text-center text-neutral">Loading...</div>
    </div>
  )

  const isAdultFootball = form.sport === "Men's/Boys Gaelic"

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Results" userRole={userRole} />
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-bold text-ink">
              <Trophy className="h-5 w-5 shrink-0" aria-hidden="true" />
              Match Results
            </h1>
            <p className="mt-0.5 text-[13px] text-neutral">St. Saviours GAA & LGFA</p>
          </div>
          {(userRole === 'coach' || userRole === 'admin') && (
            <button onClick={() => setShowModal(true)} className="cursor-pointer rounded-lg border-none bg-ink px-4 py-2 text-[13px] font-semibold text-white">+ Post Result</button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="rounded-md border border-gray-200 bg-white px-2.5 py-[5px] text-xs text-ink">
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterComp} onChange={e => setFilterComp(e.target.value)} className="rounded-md border border-gray-200 bg-white px-2.5 py-[5px] text-xs text-ink">
            <option value="">All Competitions</option>
            {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(filterTeam || filterComp) && (
            <button onClick={() => { setFilterTeam(''); setFilterComp('') }} className="cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-[5px] text-xs text-ink">Clear</button>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-[10px] bg-white px-4 py-10 text-center text-neutral">No results yet</div>
        )}

        {filtered.map(r => (
          <div key={r.id} style={{ backgroundColor: resultBg(r.result), borderRadius: '8px', borderLeft: `4px solid ${resultBorder(r.result)}`, padding: '12px 16px', marginBottom: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone={resultTone(r.result)} variant="solid" className="inline-flex shrink-0 align-middle mr-2">
                    {resultLabel(r.result)}
                  </Badge>
                  <HomeAwayMark homeAway={r.home_away} />
                  <span className="inline-flex items-center gap-1 text-[11px] text-neutral">
                    <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {new Date(r.match_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="mb-0.5 text-sm font-bold text-ink">{r.team_name}</div>
                <div className="mb-0.5 text-[13px] text-ink">
                  <span className="font-semibold">St Saviours: {formatScore(r.our_goals, r.our_points, r.our_two_pointers, r.sport)}</span>
                  {' v '}
                  <span>{r.opposition}: {formatScore(r.their_goals, r.their_points, r.their_two_pointers, r.sport)}</span>
                </div>
                <div className="text-[11px] text-neutral">{r.competition} · {r.sport}</div>
                {r.notes && <div className="mt-1 text-[11px] italic text-ink">{r.notes}</div>}
              </div>
              {(userRole === 'admin' || r.posted_by === currentUserId) && (
                <button onClick={() => handleDelete(r.id)} className="shrink-0 cursor-pointer rounded-md border border-rejected/40 bg-white px-2 py-[3px] text-[11px] text-rejected">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 w-full max-w-[500px] max-h-[90vh] min-h-0 overflow-y-auto rounded-xl bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
              <Trophy className="h-5 w-5 shrink-0" aria-hidden="true" />
              Post Result
            </h2>

            <div className={fieldClass}>
              <label className={labelClass}>Link to Fixture (optional)</label>
              <select value={form.fixture_id} onChange={e => {
                const selected = fixtures.find(f => f.id === e.target.value)
                if (selected) {
                  setForm({ ...form, fixture_id: selected.id, team_name: selected.team_name, opposition: selected.opposition, competition: selected.competition, home_away: selected.home_away, sport: selected.sport, match_date: selected.fixture_date })
                } else {
                  setForm({ ...form, fixture_id: '' })
                }
              }} className={inputClass}>
                <option value="">Select a fixture...</option>
                {fixtures.map(f => (
                  <option key={f.id} value={f.id}>{f.team_name} vs {f.opposition} · {new Date(f.fixture_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</option>
                ))}
              </select>
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Sport</label>
              <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })} className={inputClass}>
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
              <div>
                <label className={labelClass}>Opposition</label>
                <input value={form.opposition} onChange={e => setForm({ ...form, opposition: e.target.value })} placeholder="e.g. Ballyduff" className={inputClass} />
              </div>
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Our Score</label>
              <div className={`grid gap-2 ${isAdultFootball ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <label className="mb-0.5 block text-[11px] text-neutral">Goals</label>
                  <input type="number" min="0" value={form.our_goals} onChange={e => setForm({ ...form, our_goals: parseInt(e.target.value) || 0 })} className={inputClass} />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] text-neutral">Points</label>
                  <input type="number" min="0" value={form.our_points} onChange={e => setForm({ ...form, our_points: parseInt(e.target.value) || 0 })} className={inputClass} />
                </div>
                {isAdultFootball && (
                  <div>
                    <label className="mb-0.5 block text-[11px] text-neutral">2-Pointers</label>
                    <input type="number" min="0" value={form.our_two_pointers} onChange={e => setForm({ ...form, our_two_pointers: parseInt(e.target.value) || 0 })} className={inputClass} />
                  </div>
                )}
              </div>
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Their Score</label>
              <div className={`grid gap-2 ${isAdultFootball ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <label className="mb-0.5 block text-[11px] text-neutral">Goals</label>
                  <input type="number" min="0" value={form.their_goals} onChange={e => setForm({ ...form, their_goals: parseInt(e.target.value) || 0 })} className={inputClass} />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] text-neutral">Points</label>
                  <input type="number" min="0" value={form.their_points} onChange={e => setForm({ ...form, their_points: parseInt(e.target.value) || 0 })} className={inputClass} />
                </div>
                {isAdultFootball && (
                  <div>
                    <label className="mb-0.5 block text-[11px] text-neutral">2-Pointers</label>
                    <input type="number" min="0" value={form.their_two_pointers} onChange={e => setForm({ ...form, their_two_pointers: parseInt(e.target.value) || 0 })} className={inputClass} />
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Competition</label>
                <select value={form.competition} onChange={e => setForm({ ...form, competition: e.target.value })} className={inputClass}>
                  <option value="">Select...</option>
                  {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Home / Away</label>
                <select value={form.home_away} onChange={e => setForm({ ...form, home_away: e.target.value })} className={inputClass}>
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Match Date</label>
              <input type="date" value={form.match_date} onChange={e => setForm({ ...form, match_date: e.target.value })} className={inputClass} />
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Great performance from the whole team!" rows={2} className={`${inputClass} resize-y py-2.5`} />
            </div>

            <div className="flex justify-end gap-2.5">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Posting...' : 'Post Result'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
