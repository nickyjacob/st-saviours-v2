'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

interface NavbarProps {
  activePage?: string
  userRole?: string
}

export default function Navbar({ activePage, userRole }: NavbarProps) {
  const [userName, setUserName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

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
    <>
      <nav style={{ backgroundColor: '#111', color: 'white', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href='/dashboard' style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src='/crest.png' alt='Crest' style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <div style={{ lineHeight: '1.2' }}>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>St. Saviours</div>
            <div style={{ color: '#9ca3af', fontSize: '11px' }}>GAA & LGFA</div>
          </div>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className='nav-desktop-links'>
          {navItems.map(item => (
            <a key={item.href} href={item.href} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none', backgroundColor: activePage === item.label ? '#374151' : 'transparent', color: activePage === item.label ? 'white' : '#d1d5db' }}>
              {item.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }} className='nav-desktop-links'>{userName}</span>
          <button onClick={handleLogout} style={{ backgroundColor: 'white', color: '#111', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} className='nav-desktop-links'>Sign out</button>
          <button onClick={() => setMenuOpen(!menuOpen)} className='nav-hamburger' style={{ backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? (
              <svg width='24' height='24' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12'/></svg>
            ) : (
              <svg width='24' height='24' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16'/></svg>
            )}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, bottom: 0, zIndex: 99, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setMenuOpen(false)}>
          <div style={{ backgroundColor: '#111', width: '280px', height: '100%', padding: '0', marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 16px', borderBottom: '1px solid #374151' }}>
              <div style={{ fontWeight: '600', color: 'white', fontSize: '15px' }}>{userName}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Signed in</div>
            </div>
            <div style={{ padding: '8px' }}>
              {navItems.map(item => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 16px', borderRadius: '8px', fontSize: '15px', fontWeight: '500', textDecoration: 'none', backgroundColor: activePage === item.label ? '#374151' : 'transparent', color: activePage === item.label ? 'white' : '#d1d5db', marginBottom: '2px' }}>
                  {item.label}
                </a>
              ))}
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', borderTop: '1px solid #374151' }}>
              <button onClick={handleLogout} style={{ width: '100%', backgroundColor: 'white', color: '#111', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}