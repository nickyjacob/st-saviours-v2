'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

interface PhysioRequest {
  id: string
  player_id: string
  injury_description: string
  body_part: string
  date_of_injury: string
  urgency: string
  status: string
  admin_note: string
  requested_at: string
  decided_at: string
}

const BODY_PARTS = ['Knee', 'Ankle', 'Shoulder', 'Hip', 'Back', 'Hamstring', 'Groin', 'Calf', 'Wrist', 'Head/Neck', 'Other']

export default function PhysioPage() {
  const [userRole, setUserRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<PhysioRequest[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hasActive, setHasActive] = useState(false)
  const [form, setForm] = useState({
    injury_description: '',
    body_part: 'Knee',
    date_of_injury: '',
    urgency: 'routine'
  })

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved, physio_consent').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      if (!['player', 'coach', 'admin'].includes(profile.role)) { window.location.href = '/dashboard'; return }
      setUserRole(profile.role || '')
      setCurrentUserId(session.user.id)
      await fetchRequests(session.user.id)
      setLoading(false)
    }
    init()
  }, [])

  async function fetchRequests(userId: string) {
    const { data } = await supabase.from('physio_requests').select('*').eq('player_id', userId).order('requested_at', { ascending: false })
    if (data) {
      setRequests(data)
      setHasActive(data.some(r => r.status === 'pending'))
    }
  }

  async function handleSubmit() {
    if (!form.injury_description || !form.date_of_injury) return
    setSubmitting(true)
    await supabase.from('physio_requests').insert({
      player_id: currentUserId,
      ...form,
      gdpr_consent: true
    })
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'physio_request',
          booking: {
            team_name: userRole,
            pitch_name: form.body_part,
            date_display: new Date(form.date_of_injury + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            time_display: form.urgency === 'urgent' ? '🔴 URGENT' : '🟡 Routine',
            purpose: form.injury_description,
          }
        })
      })
    } catch (e) { console.error('Email failed:', e) }
    setShowModal(false)
    setForm({ injury_description: '', body_part: 'Knee', date_of_injury: '', urgency: 'routine' })
    await fetchRequests(currentUserId)
    setSubmitting(false)
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this request?')) return
    await supabase.from('physio_requests').delete().eq('id', id).eq('player_id', currentUserId)
    await fetchRequests(currentUserId)
  }

  const statusColour = (s: string) => s === 'approved' ? '#2e7d32' : s === 'declined' ? '#dc2626' : '#f9ab2b'
  const statusBg = (s: string) => s === 'approved' ? '#f0fdf4' : s === 'declined' ? '#fef2f2' : '#fff8e1'
  const statusBorder = (s: string) => s === 'approved' ? '#2e7d32' : s === 'declined' ? '#dc2626' : '#f9ab2b'
  const statusLabel = (s: string) => s === 'approved' ? '🟢 Approved' : s === 'declined' ? '🔴 Declined' : '🟡 Pending'

  const inputStyle = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', color: '#111', outline: 'none', backgroundColor: 'white' }
  const labelStyle = { fontSize: '13px', fontWeight: '600' as const, color: '#111', display: 'block' as const, marginBottom: '4px' }
  const fieldStyle = { marginBottom: '12px' }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Physio" userRole={userRole} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111' }}>🏥 Physio Requests</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Request approval to contact the club physiotherapist</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={hasActive}
            style={{ backgroundColor: hasActive ? '#9ca3af' : '#111', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: hasActive ? 'not-allowed' : 'pointer' }}
          >
            {hasActive ? 'Request Pending' : '+ New Request'}
          </button>
        </div>

        {hasActive && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
            ⚠️ You have an active request pending. You can only have one active request at a time.
          </div>
        )}

        {requests.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '10px', color: '#888' }}>
            No physio requests yet
          </div>
        )}

        {requests.map(r => (
          <div key={r.id} style={{ backgroundColor: statusBg(r.status), borderLeft: `4px solid ${statusBorder(r.status)}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: statusColour(r.status), marginBottom: '4px' }}>{statusLabel(r.status)}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>{r.body_part} Injury</div>
                <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>{r.injury_description}</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>📅 Injury date: {new Date(r.date_of_injury + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span style={{ fontSize: '11px', color: r.urgency === 'urgent' ? '#dc2626' : '#6b7280', fontWeight: r.urgency === 'urgent' ? '700' : '400' }}>{r.urgency === 'urgent' ? '🔴 Urgent' : '🟡 Routine'}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>Submitted: {new Date(r.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {r.admin_note && (
                  <div style={{ marginTop: '8px', backgroundColor: 'white', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#374151', borderLeft: '3px solid #d1d5db' }}>
                    <span style={{ fontWeight: '600' }}>Admin note: </span>{r.admin_note}
                  </div>
                )}
                {r.status === 'approved' && (
                  <div style={{ marginTop: '8px', backgroundColor: '#dcfce7', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#166534', fontWeight: '500' }}>
                    ✅ Your request has been approved. Please contact the club physiotherapist directly.
                  </div>
                )}
              </div>
              {r.status === 'pending' && (
                <button onClick={() => handleCancel(r.id)} style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #fca5a5', color: '#dc2626', backgroundColor: 'white', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px', color: '#111' }}>🏥 New Physio Request</h2>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>Your request will be reviewed by a club administrator. Once approved you can contact the physiotherapist directly.</p>

            <div style={fieldStyle}>
              <label style={labelStyle}>Body Part</label>
              <select value={form.body_part} onChange={e => setForm({ ...form, body_part: e.target.value })} style={inputStyle}>
                {BODY_PARTS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Injury Description</label>
              <textarea value={form.injury_description} onChange={e => setForm({ ...form, injury_description: e.target.value })} placeholder="Describe your injury and symptoms..." rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Date of Injury</label>
                <input type="date" value={form.date_of_injury} onChange={e => setForm({ ...form, date_of_injury: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Urgency</label>
                <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} style={inputStyle}>
                  <option value="routine">🟡 Routine</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#6b7280' }}>
              🔒 Your injury details are stored securely and only shared with club administrators for approval purposes.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: '600', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#111', color: 'white', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}