'use client'

import { useEffect, useState } from 'react'
import { LogOut, Settings, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PREFERENCE_CATEGORIES } from '@/lib/notificationCategories'
import Navbar from '@/components/Navbar'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'

export default function SettingsPage() {
  const [userRole, setUserRole] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferences] = useState<Record<string, boolean>>({})

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

      const { data: prefRows } = await supabase
        .from('notification_preferences')
        .select('notification_type, enabled')
        .eq('user_id', session.user.id)
      const prefMap: Record<string, boolean> = {}
      for (const row of prefRows || []) {
        prefMap[row.notification_type] = row.enabled
      }
      setPreferences(prefMap)

      setLoading(false)
    }
    init()
  }, [])

  async function handleTogglePreference(key: string, currentValue: boolean) {
    const newValue = !currentValue
    setPreferences(prev => ({ ...prev, [key]: newValue }))
    await supabase.from('notification_preferences').upsert({
      user_id: userId,
      club_id: 'st-saviours',
      notification_type: key,
      enabled: newValue,
    }, { onConflict: 'user_id,club_id,notification_type' })
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
            <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
            Notifications
          </h2>
          <p className="mb-4 text-[13px] text-neutral">
            Choose which push notifications you&apos;d like to receive. Notices about your own bookings and new registrations always stay on.
          </p>
          <div className="flex flex-col gap-3">
            {PREFERENCE_CATEGORIES.map(cat => {
              const enabled = preferences[cat.key] !== false
              return (
                <div key={cat.key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div>
                    <div className="text-[14px] font-semibold text-ink">{cat.label}</div>
                    <div className="text-xs text-neutral">{cat.description}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => handleTogglePreference(cat.key, enabled)}
                    className={`relative box-content h-6 w-11 shrink-0 rounded-full border-none p-0 transition-colors ${enabled ? 'bg-approved' : 'bg-gray-300'}`}
                    style={{ appearance: 'none' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
              )
            })}
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
