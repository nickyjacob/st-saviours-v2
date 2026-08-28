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
    const { team_name, opposition, result, score_display } = body

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('endpoint, p256dh, auth')

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const resultLabel = result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Draw'
    const pushResult = await sendPushToSubscriptions(subscriptions, {
      title: 'New Result Posted',
      body: `${team_name} vs ${opposition} — ${resultLabel} (${score_display})`,
      url: '/results',
    })

    return NextResponse.json(pushResult)
  } catch (error) {
    console.error('Notify result error:', error)
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 })
  }
}