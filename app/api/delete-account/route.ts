export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLACEHOLDER_USER_ID = 'dcdf2b7f-24dc-45d7-9705-6f9740f1ff85'

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }
    if (userId === PLACEHOLDER_USER_ID) {
      return NextResponse.json({ error: 'Cannot delete the placeholder account' }, { status: 400 })
    }

    // 1. Fully delete genuinely sensitive data
    await supabase.from('physio_requests').delete().eq('player_id', userId)
    await supabase.from('subscriptions').delete().eq('user_id', userId)
    await supabase.from('notifications_log').delete().eq('user_id', userId)

    // 2. Reassign shared club history to the placeholder account, so it survives the cascade delete on the real account
    await supabase.from('bookings').update({ user_id: PLACEHOLDER_USER_ID }).eq('user_id', userId)
    await supabase.from('bookings').update({ decided_by: PLACEHOLDER_USER_ID }).eq('decided_by', userId)
    await supabase.from('fixtures').update({ posted_by: PLACEHOLDER_USER_ID }).eq('posted_by', userId)
    await supabase.from('results').update({ posted_by: PLACEHOLDER_USER_ID }).eq('posted_by', userId)
    await supabase.from('physio_requests').update({ decided_by: PLACEHOLDER_USER_ID }).eq('decided_by', userId)
    await supabase.from('pitch_closures').update({ created_by: PLACEHOLDER_USER_ID }).eq('created_by', userId)
    await supabase.from('notices').update({ created_by: PLACEHOLDER_USER_ID }).eq('created_by', userId)

    // 3. Delete the profile row
    await supabase.from('profiles').delete().eq('id', userId)

    // 4. Delete the actual auth account (must be last, and requires service role)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('Auth delete error:', authError)
      return NextResponse.json({ error: 'Failed to delete auth account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}