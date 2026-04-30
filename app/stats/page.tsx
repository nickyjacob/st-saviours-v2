'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

interface PersonStat {
  name: string
  email: string
  total: number
  approved: number
  pending: number
  rejected: number
}

interface PitchStat {
  pitch_name: string
  total: number
  approved: number
}

interface MonthStat {
  month: string
  total: number
  approved: number
  pending: number
}

export default function StatsPage() {
  const [personStats, setPersonStats] = useState<PersonStat[]>([])
  const [pitchStats, setPitchStats] = useState<PitchStat[]>([])
  const [monthStats, setMonthStats] = useState<MonthStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved || profile.role !== 'admin') { window.location.href = '/dashboard'; return }
      await fetchStats()
      setLoading(false)
    }
    init()
  }, [])

  async function fetchStats() {
    const { data } = await supabase.from('admin_bookings').select('full_name, booker_email, status, pitch_name, booking_date').not('status', 'eq', 'cancelled')
    if (!data) return

    const personMap: Record<string, PersonStat> = {}
    const pitchMap: Record<string, PitchStat> = {}
    const monthMap: Record<string, MonthStat> = {}

    data.forEach((b: Record<string, string>) => {
      const name = b.full_name || b.booker_email
      if (!personMap[name]) personMap[name] = { name, email: b.booker_email, total: 0, approved: 0, pending: 0, rejected: 0 }
      personMap[name].total++
      if (b.status === 'approved') personMap[name].approved++
      if (b.status === 'pending') personMap[name].pending++
      if (b.status === 'rejected') personMap[name].rejected++

      const pitch = b.pitch_name || 'Unknown'
      if (!pitchMap[pitch]) pitchMap[pitch] = { pitch_name: pitch, total: 0, approved: 0 }
      pitchMap[pitch].total++
      if (b.status === 'approved') pitchMap[pitch].approved++

      if (b.booking_date) {
        const month = b.booking_date.slice(0, 7)
        if (!monthMap[month]) monthMap[month] = { month, total: 0, approved: 0, pending: 0 }
        monthMap[month].total++
        if (b.status === 'approved') monthMap[month].approved++
        if (b.status === 'pending') monthMap[month].pending++
      }
    })

    setPersonStats(Object.values(personMap).sort((a, b) => b.total - a.total))
    setPitchStats(Object.values(pitchMap).sort((a, b) => b.total - a.total))
    setMonthStats(Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6))
  }

  const thStyle = { padding: '10px 14px', textAlign: 'left' as const, fontSize: '12px', fontWeight: '600' as const, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }
  const tdStyle = { padding: '10px 14px', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }

  const Badge = ({ value, colour }: { value: number; colour: string }) => (
    <span style={{ display: 'inline-block', minWidth: '28px', padding: '2px 8px', borderRadius: '12px', backgroundColor: colour + '20', color: colour, fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>{value}</span>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Stats" userRole="admin" />
      <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Stats" userRole="admin" />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>&#x1f4ca; Stats</h1>

        <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '14px' }}>Bookings per Person</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>Name</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Total</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Approved</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Pending</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Rejected</th>
              </tr></thead>
              <tbody>
              {personStats.map((p, i) => (
                <tr key={p.name} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={tdStyle}><div style={{ fontWeight: '500', color: '#111' }}>{p.name}</div><div style={{ fontSize: '11px', color: '#9ca3af' }}>{p.email}</div></td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700' }}>{p.total}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><Badge value={p.approved} colour="#16a34a" /></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><Badge value={p.pending} colour="#d97706" /></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><Badge value={p.rejected} colour="#dc2626" /></td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '14px' }}>Bookings per Pitch</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>Pitch</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Total</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Approved</th>
              </tr></thead>
              <tbody>
              {pitchStats.map((p, i) => (
                <tr key={p.pitch_name} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={tdStyle}>{p.pitch_name}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700' }}>{p.total}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><Badge value={p.approved} colour="#16a34a" /></td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '14px' }}>Monthly Summary (last 6 months)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>Month</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Total</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Approved</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Pending</th>
              </tr></thead>
              <tbody>
              {monthStats.map((m, i) => (
                <tr key={m.month} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={tdStyle}>{new Date(m.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700' }}>{m.total}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><Badge value={m.approved} colour="#16a34a" /></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><Badge value={m.pending} colour="#d97706" /></td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}