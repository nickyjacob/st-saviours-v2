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
    const { team_name, opposition, fixture_date, venue_name } = body

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('endpoint, p256dh, auth')

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const result = await sendPushToSubscriptions(subscriptions, {
      title: 'New Fixture Posted',
      body: `${team_name} vs ${opposition} — ${fixture_date} at ${venue_name}`,
      url: '/fixtures',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Notify fixture error:', error)
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 })
  }
}