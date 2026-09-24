import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PushSubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
  user_id?: string
}

export async function shouldUseEmailFallback(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .in('user_id', userIds)
  const subscribed = new Set((data || []).map(row => row.user_id).filter(Boolean))
  return userIds.filter(id => !subscribed.has(id))
}

export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: { title: string; body: string; url?: string },
  triggerType: string
) {
  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      )
    )
  )

  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`${failed.length} push notification(s) failed to send`)
  }

  const failedUserIds = Array.from(new Set(
    subscriptions
      .filter((_, i) => results[i].status === 'rejected')
      .map(sub => sub.user_id)
      .filter((id): id is string => !!id)
  ))

  try {
    const rows = subscriptions.map((sub, i) => ({
      user_id: sub.user_id || null,
      trigger_type: triggerType,
      status: results[i].status === 'fulfilled' ? 'sent' : 'failed',
    }))
    const { error } = await supabase.from('notifications_log').insert(rows)
    if (error) console.error('notifications_log insert failed:', error)
  } catch (err) {
    console.error('notifications_log insert failed:', err)
  }

  return { sent: results.length - failed.length, failed: failed.length, failedUserIds }
}
