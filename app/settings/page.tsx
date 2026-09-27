'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  Check,
  Lock,
  LogOut,
  Monitor,
  Settings,
  Smartphone,
  User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'

const CALENDAR_GUIDES = [
  {
    icon: Smartphone,
    title: 'iPhone / iPad',
    steps: [
      'Copy the URL above',
      'Open Settings → Calendar → Accounts',
      'Tap Add Account → Other',
      'Tap Add Subscribed Calendar',
      'Paste the URL and tap Next',
    ],
  },
  {
    icon: Calendar,
    title: 'Google Calendar',
    steps: [
      'Copy the URL above',
      'Open calendar.google.com',
      'Click + Other Calendars → From URL',
      'Paste the URL and click Add Calendar',
    ],
  },
  {
    icon: Monitor,
    title: 'Outlook',
    steps: [
      'Copy the URL above',
      'Open Outlook Calendar',
      'Click Add Calendar → From Internet',
      'Paste the URL and click OK',
    ],
  },
]

export default function SettingsPage() {
  const [userRole, setUserRole] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [icalUrl, setIcalUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
      const { data: profile } = await supabase.from('profiles').select('role, is_approved, full_name, email').eq('id', session.user.id).single()
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return }
      setUserRole(profile.role || '')
      setFullName(profile.full_name || '')
      setEmail(profile.email || session.user.email || '')
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

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function handleDeleteAccount() {
    if (!userId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert('Failed to delete account: ' + (data.error || 'Unknown error'))
        setDeleting(false)
        return
      }
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (err) {
      console.error('Delete account error:', err)
      alert('Failed to delete account. Please try again or contact an admin.')
      setDeleting(false)
    }
  }

  const subtitle = [fullName, email].filter(Boolean).join(' · ')

  if (loading) return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Settings" userRole={userRole} />
      <div className="p-12 text-center text-neutral">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Settings" userRole={userRole} />
      <div className="mx-auto max-w-[700px] px-4 py-6">
        <PageHeader icon={Settings} title="Settings" subtitle={subtitle || undefined} />

        <section className="mb-8">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
            Calendar Sync
          </h2>
          <p className="mb-4 text-[13px] text-info">
            Subscribe to your bookings in Google Calendar, iPhone Calendar or Outlook. Your calendar updates automatically when bookings are approved.
          </p>

          <Card className="mb-5 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral/10">
                <User className="h-5 w-5 text-neutral" aria-hidden="true" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-ink">My Bookings Calendar</div>
                <div className="text-xs text-neutral">Shows only your approved bookings</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 break-all rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-mono text-xs text-ink">{icalUrl}</div>
              <Button variant={copied ? 'approved' : 'primary'} onClick={handleCopy} className="min-w-[100px] shrink-0 whitespace-nowrap">
                {copied ? (
                  <>
                    <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                    Copied!
                  </>
                ) : (
                  'Copy URL'
                )}
              </Button>
            </div>
          </Card>

          <Card className="mb-5 p-6 shadow-sm">
            <h3 className="mb-4 text-[15px] font-semibold text-ink">How to add to your calendar</h3>
            <div className="flex flex-col gap-4">
              {CALENDAR_GUIDES.map(item => (
                <div key={item.title} className="rounded-lg bg-gray-50 p-4">
                  <item.icon className="mb-2 h-5 w-5 text-ink" aria-hidden="true" />
                  <div className="mb-2.5 text-[13px] font-semibold text-ink">{item.title}</div>
                  <ol className="flex list-decimal flex-col gap-1.5 pl-4">
                    {item.steps.map(step => (
                      <li key={step} className="text-xs leading-snug text-ink">{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-start gap-2 rounded-[10px] border border-pending/30 bg-pending/10 px-4 py-3.5 text-[13px] text-pending">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Your calendar URL is private — don&apos;t share it with others. If it&apos;s ever compromised, contact the admin to reset it.</span>
          </div>
        </section>

        <div className="border-t border-gray-200 pt-6">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Sign Out
          </Button>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="mb-2 text-[13px] font-semibold text-rejected">Danger Zone</p>
          <p className="mb-3 text-xs text-neutral">
            Deleting your account is permanent. Your personal data will be removed. Records you created (bookings, fixtures, results) will be kept for club history but no longer linked to your name.
          </p>
          <Button variant="rejected" onClick={() => setShowDeleteConfirm(true)}>
            Delete My Account
          </Button>
        </div>

        {showDeleteConfirm && (
          <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Account?">
            <p className="mb-4 text-sm text-ink">
              This cannot be undone. Are you sure you want to permanently delete your account?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="rejected" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}
