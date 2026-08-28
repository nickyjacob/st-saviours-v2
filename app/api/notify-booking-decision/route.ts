export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToSubscriptions } from '@/lib/sendPush'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, decision, team_name, pitch_name, date_display, time_display } = body

    if (!userId || !decision) {
      return NextResponse.json({ error: 'Missing userId or decision' }, { status: 400 })
    }

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const isApproved = decision === 'approved'
    const result = await sendPushToSubscriptions(subscriptions, {
      title: isApproved ? 'Booking Approved' : 'Booking Declined',
      body: `${team_name} — ${pitch_name}, ${date_display} ${time_display}`,
      url: '/my-bookings',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Notify booking decision error:', error)
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 })
  }
}