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
    const { pitch_name, date_display } = body

    const { data: coaches } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'coach')
      .eq('is_approved', true)

    if (!coaches || coaches.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const coachIds = coaches.map(c => c.id)

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', coachIds)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const result = await sendPushToSubscriptions(subscriptions, {
      title: 'Pitch Closure',
      body: `${pitch_name} — ${date_display}`,
      url: '/planner',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Notify pitch closure error:', error)
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 })
  }
}