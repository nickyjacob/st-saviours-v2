'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

interface NavbarProps {
  activePage?: string
  userRole?: string
}

export default function Navbar({ activePage, userRole }: NavbarProps) {
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function getName() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
      if (profile) setUserName(profile.full_name || '')
    }
    getName()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems = [
    { label: 'Planner', href: '/dashboard' },
    { label: 'My Bookings', href: '/my-bookings' },
    { label: 'New Booking', href: '/new-booking' },
    { label: 'Calendar Sync', href: '/calendar-sync' },
    ...(userRole === 'admin' ? [
      { label: 'Admin', href: '/admin' },
      { label: 'Stats', href: '/stats' },
    ] : []),
  ]

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <a href="/dashboard" className="flex items-center gap-2 mr-2">
          <img src="/crest.png" alt="Crest" className="w-8 h-8 object-contain" />
          <div className="leading-tight">
            <div className="font-bold text-sm">St. Saviours</div>
            <div className="text-gray-400 text-xs">GAA and LGFA</div>
          </div>
        </a>
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={
                activePage === item.label
                  ? 'px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white'
                  : 'px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800'
              }
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300 hidden md:block">{userName}</span>
        <button
          onClick={handleLogout}
          className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}