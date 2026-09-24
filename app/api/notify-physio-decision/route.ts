export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToSubscriptions, shouldUseEmailFallback } from '@/lib/sendPush'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, decision, body_part, injury_description } = body

    if (!userId || !decision) {
      return NextResponse.json({ error: 'Missing userId or decision' }, { status: 400 })
    }

    const noSub = await shouldUseEmailFallback([userId])

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, failedUserIds: [], needsEmailFallback: true })
    }

    const isApproved = decision === 'approved'
    const result = await sendPushToSubscriptions(subscriptions, {
      title: isApproved ? 'Physio Request Approved' : 'Physio Request Declined',
      body: `${body_part} — ${injury_description}`,
      url: '/physio',
    }, isApproved ? 'physio_approved' : 'physio_declined')

    return NextResponse.json({
      ...result,
      needsEmailFallback: noSub.length > 0 || result.failedUserIds.includes(userId),
    })
  } catch (error) {
    console.error('Notify physio decision error:', error)
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 })
  }
}
