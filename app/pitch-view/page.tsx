'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, LayoutGrid, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { BookingModal } from '@/components/PitchCalendar';
import PitchTimeline, {
  PitchViewPitch,
  PitchViewBooking,
} from '@/components/PitchTimeline';

export default function PitchViewPage() {
  const router = useRouter();

  const [userRole, setUserRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const [pitches, setPitches] = useState<PitchViewPitch[]>([]);
  const [bookings, setBookings] = useState<PitchViewBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const [selectedBooking, setSelectedBooking] = useState<PitchViewBooking | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      el.focus();
    }
  }

  function handleDateInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val) {
      const [y, m, d] = val.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, d));
    }
  }

  // Auth check — same pattern as app/planner/page.tsx
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, is_approved')
        .eq('id', session.user.id)
        .single();
      if (!profile || !profile.is_approved) { window.location.href = '/pending'; return; }
      setUserRole(profile.role || '');
      setCurrentUserId(session.user.id);
      setLoading(false);
    }
    checkAuth();
  }, []);

  // Pitches: fetched once, same is_active/sort_order convention as elsewhere
  useEffect(() => {
    async function fetchPitches() {
      const { data, error } = await supabase
        .from('pitches')
        .select('id, name, colour, parent_pitch_id, split_orientation, sort_order')
        .eq('is_active', true)
        .order('sort_order');
      if (error) console.error('Pitches fetch error:', error);
      if (data) setPitches(data as PitchViewPitch[]);
    }
    fetchPitches();
  }, []);

  // Bookings: refetched whenever the selected date changes
  useEffect(() => {
    async function fetchBookings() {
      setBookingsLoading(true);
      const { data, error } = await supabase
        .from('public_planner')
        .select('*')
        .eq('booking_date', dateStr)
        .order('start_time');
      if (error) console.error('Planner fetch error:', error);
      if (data) setBookings(data as PitchViewBooking[]);
      setBookingsLoading(false);
    }
    fetchBookings();
  }, [dateStr]);

  function handleSlotClick(pitchId: number, time: string) {
    router.push(`/new-booking?pitch=${pitchId}&date=${dateStr}&start=${time}`);
  }

  function handleBookingClick(booking: PitchViewBooking) {
    setSelectedBooking(booking);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const topLevel = pitches
    .filter((p) => p.parent_pitch_id === null)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  function childrenOf(parentId: number) {
    return pitches
      .filter((p) => p.parent_pitch_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activePage="Pitch View" userRole={userRole} />
      <main className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="h-5 w-5 text-ink" />
          <h1 className="text-xl font-bold text-ink">Pitch View</h1>
        </div>
        <p className="text-xs text-neutral mb-4">
          Click a free slot to start a booking, or a booked slot to see its details.
        </p>

        {/* Date nav */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
            className="p-1.5 rounded-md border border-gray-200 bg-white"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-ink w-36 text-center">
            {format(selectedDate, 'EEE d MMM yyyy')}
          </span>
          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="p-1.5 rounded-md border border-gray-200 bg-white"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-xs font-medium text-info ml-1"
          >
            Today
          </button>
          <button
            onClick={openDatePicker}
            className="p-1.5 rounded-md border border-gray-200 bg-white ml-1"
            aria-label="Pick a date"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={dateStr}
            onChange={handleDateInputChange}
            className="sr-only"
          />
        </div>

        {/* Legend — full contrast per the Sprint 8 fix, not the old faded style */}
        <div className="flex items-center gap-4 mb-4 text-xs text-ink">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-50 border border-gray-200 inline-block" /> Free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-pending/80 inline-block" /> Awaiting
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-approved inline-block" /> Booked
          </span>
        </div>

        {bookingsLoading ? (
          <p className="text-sm text-neutral">Loading bookings…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topLevel.map((parent) => (
              <PitchTimeline
                key={parent.id}
                parentPitch={parent}
                childPitches={childrenOf(parent.id)}
                bookings={bookings}
                selectedDate={dateStr}
                onSlotClick={handleSlotClick}
                onBookingClick={handleBookingClick}
              />
            ))}
          </div>
        )}

        {selectedBooking && (
          <BookingModal
            booking={{ ...selectedBooking, purpose: selectedBooking.purpose ?? '' }}
            onClose={() => setSelectedBooking(null)}
            currentUserId={currentUserId}
            userRole={userRole}
          />
        )}
      </main>
    </div>
  );
}