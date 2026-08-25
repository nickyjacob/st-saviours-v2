'use client'

import { supabase } from '@/lib/supabase'
import {
  Bell,
  Calendar,
  CalendarCheck,
  ChevronDown,
  Home,
  LucideIcon,
  MoreHorizontal,
  Stethoscope,
  Shield,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface NavbarProps {
  activePage?: string
  userRole?: string
}

interface NavItem {
  label: string
  href: string
}

interface BottomTab {
  id: string
  label: string
  href?: string
  icon: LucideIcon
  isActive: boolean
  onClick?: () => void
}

export default function Navbar({ activePage, userRole }: NavbarProps) {
  const [userName, setUserName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [resolvedRole, setResolvedRole] = useState(userRole || '')

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single()
    if (profile) {
        setUserName(profile.full_name || '')
        setResolvedRole(profile.role || '')
      }
    }
    getProfile()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isViewer = resolvedRole === 'viewer'

  const primaryNavItems: NavItem[] = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Calendar', href: '/planner' },
    { label: 'Fixtures', href: '/fixtures' },
    { label: 'Results', href: '/results' },
    ...(!isViewer ? [{ label: 'My Bookings', href: '/my-bookings' }] : []),
  ]

  const secondaryNavItems: NavItem[] = [
    ...(!isViewer ? [{ label: 'New Booking', href: '/new-booking' }] : []),
    ...((['player', 'coach', 'admin'].includes(resolvedRole)) ? [{ label: 'Physio', href: '/physio' }] : []),
    { label: 'Calendar Sync', href: '/calendar-sync' },
    ...(resolvedRole === 'admin' ? [
      { label: 'Admin', href: '/admin' },
      { label: 'Stats', href: '/stats' },
    ] : []),
  ]

  const navItems: NavItem[] = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Calendar', href: '/planner' },
    ...(!isViewer ? [{ label: 'My Bookings', href: '/my-bookings' }] : []),
    ...(!isViewer ? [{ label: 'New Booking', href: '/new-booking' }] : []),
    ...((['player', 'coach', 'admin'].includes(resolvedRole)) ? [{ label: 'Physio', href: '/physio' }] : []),
    { label: 'Fixtures', href: '/fixtures' },
    { label: 'Results', href: '/results' },
    { label: 'Calendar Sync', href: '/calendar-sync' },
    ...(resolvedRole === 'admin' ? [
      { label: 'Admin', href: '/admin' },
      { label: 'Stats', href: '/stats' },
    ] : []),
  ]

  const isSecondaryActive = secondaryNavItems.some(item => item.label === activePage)

  function navLinkStyle(label: string, isActive = activePage === label) {
    return {
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      textDecoration: 'none',
      backgroundColor: isActive ? '#374151' : 'transparent',
      color: isActive ? 'white' : '#d1d5db',
    } as const
  }

  function mobileNavLinkStyle(label: string) {
    return {
      display: 'block',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '500',
      textDecoration: 'none',
      backgroundColor: activePage === label ? '#374151' : 'transparent',
      color: activePage === label ? 'white' : '#d1d5db',
      marginBottom: '2px',
    } as const
  }

  const fourthTab: BottomTab | null = isViewer
    ? null
    : resolvedRole === 'player'
      ? {
          id: 'physio',
          label: 'Physio',
          href: '/physio',
          icon: Stethoscope,
          isActive: activePage === 'Physio',
        }
      : {
          id: 'book',
          label: 'Book',
          href: '/new-booking',
          icon: CalendarCheck,
          isActive: activePage === 'New Booking',
        }

  const moreOnlyActivePages = [
    'My Bookings',
    'Calendar Sync',
    'Admin',
    'Stats',
    ...(fourthTab?.id === 'book' ? ['Physio'] as const : []),
  ]

  const bottomTabs: BottomTab[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/dashboard',
      icon: Home,
      isActive: activePage === 'Home',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      href: '/planner',
      icon: Calendar,
      isActive: activePage === 'Calendar',
    },
    {
      id: 'club',
      label: 'Club',
      href: '/fixtures',
      icon: Shield,
      isActive: activePage === 'Fixtures' || activePage === 'Results',
    },
    ...(fourthTab ? [fourthTab] : []),
    {
      id: 'more',
      label: 'More',
      icon: MoreHorizontal,
      isActive: menuOpen || moreOnlyActivePages.includes(activePage || ''),
      onClick: () => setMenuOpen(open => !open),
    },
  ]

  function bottomTabClass(isActive: boolean) {
    return `flex flex-1 flex-col items-center justify-center gap-0.5 border-none bg-transparent px-1 py-2 text-[10px] font-medium no-underline cursor-pointer ${isActive ? 'text-ink' : 'text-neutral'}`
  }

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
          {primaryNavItems.map(item => (
            <a key={item.href} href={item.href} style={navLinkStyle(item.label)}>
              {item.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }} className='nav-desktop-links'>{userName}</span>
          <div style={{ position: 'relative' }} className='nav-desktop-links'>
            <button
              type='button'
              onClick={() => setMoreOpen(open => !open)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                backgroundColor: isSecondaryActive || moreOpen ? '#374151' : 'transparent',
                color: isSecondaryActive || moreOpen ? 'white' : '#d1d5db',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              More
              <ChevronDown
                size={14}
                style={{
                  transform: moreOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>
            {moreOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                  onClick={() => setMoreOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#111',
                    borderRadius: '8px',
                    padding: '8px',
                    minWidth: '180px',
                    zIndex: 99,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {secondaryNavItems.map(item => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      style={mobileNavLinkStyle(item.label)}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
          <span
            className='nav-desktop-links'
            style={{ display: 'flex', alignItems: 'center', padding: '4px' }}
            aria-hidden='true'
          >
            <Bell size={20} color='#d1d5db' />
          </span>
          <button onClick={handleLogout} style={{ backgroundColor: 'white', color: '#111', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} className='nav-desktop-links'>Sign out</button>
          <span
            className='nav-hamburger'
            style={{ display: 'flex', alignItems: 'center', padding: '4px' }}
            aria-hidden='true'
          >
            <Bell size={22} color='white' />
          </span>
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
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle(item.label)}>
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

      <nav
        className='nav-bottom-bar fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white'
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomTabs.map(tab => {
          const Icon = tab.icon
          const content = (
            <>
              <Icon className='h-5 w-5' aria-hidden='true' />
              <span>{tab.label}</span>
            </>
          )

          if (tab.onClick) {
            return (
              <button
                key={tab.id}
                type='button'
                onClick={tab.onClick}
                className={bottomTabClass(tab.isActive)}
                aria-current={tab.isActive ? 'page' : undefined}
              >
                {content}
              </button>
            )
          }

          return (
            <a
              key={tab.id}
              href={tab.href}
              className={bottomTabClass(tab.isActive)}
              aria-current={tab.isActive ? 'page' : undefined}
            >
              {content}
            </a>
          )
        })}
      </nav>
    </>
  )
}