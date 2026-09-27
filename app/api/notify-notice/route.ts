export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToSubscriptions } from '@/lib/sendPush'
import { filterByPreference } from '@/lib/notificationPreferences'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title } = body

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('endpoint, p256dh, auth, user_id')

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, failedUserIds: [], usersNeedingEmailFallback: [] })
    }

    const allowedIds = new Set(await filterByPreference(
      Array.from(new Set(subscriptions.map(s => s.user_id).filter((id): id is string => !!id))),
      'new_notice'
    ))
    const allowedSubscriptions = subscriptions.filter(s => s.user_id && allowedIds.has(s.user_id))
    if (allowedSubscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, failedUserIds: [], usersNeedingEmailFallback: [] })
    }

    const pushResult = await sendPushToSubscriptions(allowedSubscriptions, {
      title: 'New Notice',
      body: title,
      url: '/dashboard',
    }, 'new_notice')

    return NextResponse.json({
      ...pushResult,
      usersNeedingEmailFallback: pushResult.failedUserIds,
    })
  } catch (error) {
    console.error('Notify notice error:', error)
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 })
  }
}