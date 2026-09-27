import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Maps each raw trigger_type to the user-facing category it belongs to.
// Trigger types not listed here (e.g. new_booking, new_user) are always-on
// operational notifications and are never filtered by preference.
export const TRIGGER_TO_CATEGORY: Record<string, string> = {
  booking_approved: 'my_bookings',
  booking_rejected: 'my_bookings',
  new_result: 'results',
  new_notice: 'notices',
  pitch_closure: 'pitch_closures',
  physio_request: 'physio',
  physio_approved: 'physio',
  physio_declined: 'physio',
}

export const ALWAYS_ON_TRIGGERS = new Set(['new_booking', 'new_user'])

export const PREFERENCE_CATEGORIES: { key: string; label: string; description: string }[] = [
  { key: 'my_bookings', label: 'My Booking Updates', description: 'When your own booking is approved or declined' },
  { key: 'results', label: 'Results', description: 'When a new match result is posted' },
  { key: 'notices', label: 'Notices', description: 'When a new club notice is published' },
  { key: 'pitch_closures', label: 'Pitch Closures', description: 'When a pitch closure is added' },
  { key: 'physio', label: 'Physio', description: 'Physio request updates' },
]

// Given a list of user_ids and a trigger_type, returns only the user_ids
// who should actually receive this notification (i.e. haven't muted its category).
export async function filterByPreference(userIds: string[], triggerType: string): Promise<string[]> {
  if (userIds.length === 0) return []
  if (ALWAYS_ON_TRIGGERS.has(triggerType)) return userIds

  const category = TRIGGER_TO_CATEGORY[triggerType]
  if (!category) return userIds // unknown trigger type: fail open, don't silently block notifications

  const { data } = await supabase
    .from('notification_preferences')
    .select('user_id, enabled')
    .eq('notification_type', category)
    .in('user_id', userIds)

  const disabled = new Set((data || []).filter(r => r.enabled === false).map(r => r.user_id))
  return userIds.filter(id => !disabled.has(id))
}