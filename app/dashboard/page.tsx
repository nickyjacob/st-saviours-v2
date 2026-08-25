'use client'

import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import IconTile from '@/components/ui/IconTile'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import {
  AlertTriangle,
  BarChart3,
  Bus,
  Calendar,
  Goal,
  CalendarCheck,
  Home,
  ListChecks,
  LucideIcon,
  MapPin,
  Megaphone,
  Pin,
  Settings,
  Stethoscope,
  Trophy,
  X,
} from 'lucide-react'
import type { StatusTone } from '@/components/ui/Badge'
import { useEffect, useState } from 'react'

interface Notice {
  id: string
  title: string
  body: string
  created_at: string
  is_pinned: boolean
  expires_at: string | null
}

interface Fixture {
  id: string
  team_name: string
  opposition: string
  venue_name: string
  home_away: string
  fixture_date: string
  fixture_time: string
  sport: string
  competition: string
}

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
  sport: string
}

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  pitch_name: string
  team_name: string
  status: string
}

interface NavButton {
  label: string
  href: string
  icon: LucideIcon
  tone: StatusTone | 'ink'
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [dismissedNotices, setDismissedNotices] = useState<string[]>([])

  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedNotices') || '[]')
    setDismissedNotices(dismissed)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('full_name, role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserRole(profile.role || '')
      setFullName(profile.full_name || '')

      const today = new Date().toISOString().split('T')[0]

      const [noticeRes, fixtureRes, resultRes] = await Promise.all([
        supabase.from('notices').select('*').eq('is_active', true).or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5),
        supabase.from('fixtures').select('*').gte('fixture_date', today).order('fixture_date', { ascending: true }).limit(2),
        supabase.from('results').select('*').order('match_date', { ascending: false }).limit(2),
      ])

      if (noticeRes.data) setNotices(noticeRes.data)
      if (fixtureRes.data) setFixtures(fixtureRes.data)
      if (resultRes.data) setResults(resultRes.data)

      if (profile.role === 'coach' || profile.role === 'admin') {
        const bookingRes = await supabase.from('bookings').select('id, booking_date, start_time, end_time, pitch_name, team_name, status').eq('status', 'approved').gte('booking_date', today).order('booking_date', { ascending: true }).limit(5)
        if (bookingRes.data) setBookings(bookingRes.data)
      }

      if (profile.role === 'admin') {
        const pendingRes = await supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'pending')
        setPendingCount(pendingRes.count || 0)
      }

      setLoading(false)
    }
    init()
  }, [])

  function dismissNotice(id: string) {
    const updated = [...dismissedNotices, id]
    setDismissedNotices(updated)
    localStorage.setItem('dismissedNotices', JSON.stringify(updated))
  }

  function fmt(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:${m}${hour >= 12 ? 'pm' : 'am'}`
  }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function formatScore(goals: number, points: number, twoPointers: number, sport: string) {
    const isAdultFootball = sport === "Men's/Boys Gaelic"
    if (isAdultFootball && twoPointers > 0) {
      return `${goals}-${points + (twoPointers * 2)} (${twoPointers}×2pt)`
    }
    return `${goals}-${points}`
  }

  function sportPrefix(sport: string) {
    return sport && sport !== 'Other' ? `${sport} · ` : ''
  }

  function formatFixtureLine(f: { sport: string; team_name: string; opposition: string }) {
    return `${sportPrefix(f.sport)}${f.team_name} vs ${f.opposition}`
  }

  function resultTone(result: string): StatusTone {
    if (result === 'win') return 'approved'
    if (result === 'loss') return 'rejected'
    return 'pending'
  }

  function resultLabel(result: string) {
    if (result === 'win') return 'WIN'
    if (result === 'loss') return 'LOSS'
    return 'DRAW'
  }

  const activeNotices = notices.filter(n => !dismissedNotices.includes(n.id))

  const navButtons: Record<string, NavButton[]> = {
    admin: [
      { label: 'Calendar', href: '/planner', icon: Calendar, tone: 'approved' },
      { label: 'New Booking', href: '/new-booking', icon: CalendarCheck, tone: 'ink' },
      { label: 'Fixtures', href: '/fixtures', icon: Goal, tone: 'info' },
      { label: 'Results', href: '/results', icon: Trophy, tone: 'pending' },
      { label: 'My Bookings', href: '/my-bookings', icon: CalendarCheck, tone: 'accent' },
      { label: 'Session Plan', href: '/session-planner', icon: ListChecks, tone: 'info' },
      { label: 'Admin Panel', href: '/admin', icon: Settings, tone: 'rejected' },
      { label: 'Stats', href: '/stats', icon: BarChart3, tone: 'neutral' },
    ],
    coach: [
      { label: 'Calendar', href: '/planner', icon: Calendar, tone: 'approved' },
      { label: 'New Booking', href: '/new-booking', icon: CalendarCheck, tone: 'ink' },
      { label: 'Fixtures', href: '/fixtures', icon: Goal, tone: 'info' },
      { label: 'Results', href: '/results', icon: Trophy, tone: 'pending' },
      { label: 'My Bookings', href: '/my-bookings', icon: CalendarCheck, tone: 'accent' },
      { label: 'Session Plan', href: '/session-planner', icon: ListChecks, tone: 'info' },
      { label: 'Physio', href: '/physio', icon: Stethoscope, tone: 'rejected' },
    ],
    player: [
      { label: 'Calendar', href: '/planner', icon: Calendar, tone: 'approved' },
      { label: 'Fixtures', href: '/fixtures', icon: Goal, tone: 'info' },
      { label: 'Results', href: '/results', icon: Trophy, tone: 'pending' },
      { label: 'Physio', href: '/physio', icon: Stethoscope, tone: 'rejected' },
    ],
    viewer: [
      { label: 'Calendar', href: '/planner', icon: Calendar, tone: 'approved' },
      { label: 'Fixtures', href: '/fixtures', icon: Goal, tone: 'info' },
      { label: 'Results', href: '/results', icon: Trophy, tone: 'pending' },
    ],
  }

  const buttons = navButtons[userRole] || navButtons.viewer

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Home" userRole={userRole} />
      <div className="mx-auto max-w-[800px] px-4 py-5">

        <Card className="mb-5 flex items-center gap-3 p-4 shadow-sm">
          <img src="/crest.png" alt="St Saviours" className="h-[52px] w-[52px] shrink-0 object-contain" />
          <div>
            <h1 className="text-[17px] font-bold text-ink">St. Saviours GAA & LGFA</h1>
            <p className="mt-0.5 text-[13px] text-neutral">Welcome back, {fullName} 👋</p>
          </div>
        </Card>

        {userRole === 'admin' && pendingCount > 0 && (
          <a
            href="/admin"
            className="mb-3 block rounded-lg border border-pending bg-pending/10 p-3 no-underline"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-pending" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-pending">
                {pendingCount} booking{pendingCount !== 1 ? 's' : ''} awaiting approval
              </span>
              <span className="ml-auto text-xs text-pending">Review →</span>
            </div>
          </a>
        )}

        {activeNotices.length > 0 && (
          <div className="mb-4 space-y-2">
            {activeNotices.map(n => {
              const NoticeIcon = n.is_pinned ? Pin : Megaphone
              return (
                <Card key={n.id} statusColor="info" className="flex items-start gap-2.5 bg-info/5 p-3">
                  <NoticeIcon className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-info">{n.title}</div>
                    <div className="mt-0.5 text-xs text-info/80">{n.body}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissNotice(n.id)}
                    className="shrink-0 border-none bg-transparent p-0 text-info/50 hover:text-info"
                    aria-label="Dismiss notice"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Card>
              )
            })}
          </div>
        )}

        <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          {buttons.map(b => (
            <IconTile key={b.href} icon={b.icon} label={b.label} href={b.href} tone={b.tone} />
          ))}
        </div>

        {fixtures.length > 0 && (
          <section className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Upcoming Fixtures
              </h2>
              <a href="/fixtures" className="text-xs font-semibold text-info no-underline">View All →</a>
            </div>
            <div className="space-y-1.5">
              {fixtures.map(f => {
                const isHome = f.home_away === 'home'
                const VenueIcon = isHome ? Home : Bus
                const tone = isHome ? 'approved' : 'info'
                return (
                  <Card key={f.id} statusColor={tone} className="p-3 shadow-sm">
                    <div className={`mb-0.5 flex items-center gap-1 text-[11px] font-bold ${isHome ? 'text-approved' : 'text-info'}`}>
                      <VenueIcon className="h-3 w-3" aria-hidden="true" />
                      <span>{isHome ? 'Home' : 'Away'}</span>
                      <span className="font-normal text-neutral">
                        · {formatDate(f.fixture_date)}{f.fixture_time ? ` · ${fmt(f.fixture_time)}` : ''}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-ink">
                      {formatFixtureLine(f)}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {f.venue_name} · {f.competition}
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {results.length > 0 && (
          <section className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Recent Results
              </h2>
              <a href="/results" className="text-xs font-semibold text-info no-underline">View All →</a>
            </div>
            <div className="space-y-1.5">
              {results.map(r => {
                const tone = resultTone(r.result)
                return (
                  <Card key={r.id} statusColor={tone} className="p-3 shadow-sm">
                    <div className="mb-0.5">
                      <Badge tone={tone} variant="solid" className="inline-flex shrink-0 align-middle mr-2">
                        {resultLabel(r.result)}
                      </Badge>
                      <span className="text-[13px] font-bold text-ink align-middle">
                        {sportPrefix(r.sport)}{r.team_name}
                      </span>
                    </div>
                    <div className="text-[13px] text-ink">
                      <span className="font-bold tabular-nums tracking-tight">
                        St Saviours {formatScore(r.our_goals, r.our_points, r.our_two_pointers, r.sport)}
                      </span>
                      {' v '}{r.opposition}{' '}
                      <span className="font-bold tabular-nums tracking-tight">
                        {formatScore(r.their_goals, r.their_points, r.their_two_pointers, r.sport)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral">
                      {r.competition} · {formatDate(r.match_date)}
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {(userRole === 'coach' || userRole === 'admin') && bookings.length > 0 && (
          <section className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Upcoming Bookings
              </h2>
              <a href="/my-bookings" className="text-xs font-semibold text-info no-underline">View All →</a>
            </div>
            <div className="space-y-1.5">
              {bookings.map(b => (
                <Card key={b.id} statusColor="approved" className="bg-approved/5 p-3 shadow-sm">
                  <div className="mb-0.5 text-[11px] font-bold text-approved">
                    {formatDate(b.booking_date)} · {fmt(b.start_time)} – {fmt(b.end_time)}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{b.team_name}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {b.pitch_name}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
