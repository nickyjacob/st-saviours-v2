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
    const { userName, body_part, injury_description } = body

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_approved', true)

    if (!admins || admins.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const adminIds = admins.map(a => a.id)

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', adminIds)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const result = await sendPushToSubscriptions(subscriptions, {
      title: 'New Physio Request',
      body: `${userName} submitted a ${body_part} request — ${injury_description}`,
      url: '/admin',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Notify physio request error:', error)
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 })
  }
}
