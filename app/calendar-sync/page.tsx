'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function CalendarSyncPage() {
  const [userRole, setUserRole] = useState('')
  const [icalUrl, setIcalUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserRole(profile.role || '')
      const { data: token } = await supabase.rpc('get_or_create_ical_token')
      if (token) {
        const url = `${window.location.origin}/api/ical?token=${token}&type=personal`
        setIcalUrl(url)
      }
      setLoading(false)
    }
    init()
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(icalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Calendar Sync" userRole={userRole} />
      <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <Navbar activePage="Calendar Sync" userRole={userRole} />
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>&#x1f4c5; Calendar Sync</h1>
        <p style={{ fontSize: '13px', color: '#2563eb', marginBottom: '24px' }}>Subscribe to your bookings in Google Calendar, iPhone Calendar or Outlook. Your calendar updates automatically when bookings are approved.</p>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>&#x1f464;</div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>My Bookings Calendar</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Shows only your approved bookings</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#374151', wordBreak: 'break-all', fontFamily: 'monospace' }}>{icalUrl}</div>
            <button onClick={handleCopy} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: copied ? '#16a34a' : '#111', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '100px' }}>
              {copied ? '✓ Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>How to add to your calendar</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '&#x1f4f1;', title: 'iPhone / iPad', steps: ['Copy the URL above', 'Open Settings → Calendar → Accounts', 'Tap Add Account → Other', 'Tap Add Subscribed Calendar', 'Paste the URL and tap Next'] },
              { icon: '&#x1f4c5;', title: 'Google Calendar', steps: ['Copy the URL above', 'Open calendar.google.com', 'Click + Other Calendars → From URL', 'Paste the URL and click Add Calendar'] },
              { icon: '&#x1f4bb;', title: 'Outlook', steps: ['Copy the URL above', 'Open Outlook Calendar', 'Click Add Calendar → From Internet', 'Paste the URL and click OK'] },
            ].map(item => (
              <div key={item.title} style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: item.icon }} />
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px' }}>{item.title}</div>
                <ol style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {item.steps.map((step, i) => (
                    <li key={i} style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#854d0e', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span>&#x1f512;</span>
          <span>Your calendar URL is private — don&apos;t share it with others. If it&apos;s ever compromised, contact the admin to reset it.</span>
        </div>
      </div>
    </div>
  )
}