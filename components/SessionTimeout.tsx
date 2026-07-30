'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const TIMEOUT_MS = 30 * 60 * 1000

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'click'] as const

export default function SessionTimeout() {
  useEffect(() => {
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    const logout = async () => {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId)
      timerId = setTimeout(logout, TIMEOUT_MS)
    }

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || !session) return

      resetTimer()
      ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer))
    })()

    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [])

  return null
}
