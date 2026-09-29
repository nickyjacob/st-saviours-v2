'use client';

import { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { formatTime } from '@/lib/formatTime';

// Phase 1: fixed daily window. Could become a per-club config value later
// without touching this component's logic — just pass different bounds in.
export const PITCH_VIEW_START_HOUR = 8;
export const PITCH_VIEW_END_HOUR = 22;

function useTickingNow(intervalMs = 60000): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface PitchViewPitch {
  id: number;
  name: string;
  colour: string;
  parent_pitch_id: number | null;
  split_orientation: 'horizontal' | 'vertical' | null;
  sort_order: number;
}

export interface PitchViewBooking {
  id: string;
  pitch_id: number;
  start_time: string; // 'HH:MM' or 'HH:MM:SS', 24hr stored value
  end_time: string;
  status: string;
  team_name: string;
  purpose?: string | null;
  pitch_name: string;
  pitch_colour: string;
  full_name: string;
  booking_date: string;
  user_id: string;
}

interface PitchTimelineProps {
  // One top-level pitch, plus its children if it's split. Pass an empty
  // children array for a standalone pitch (e.g. Astro).
  parentPitch: PitchViewPitch;
  childPitches: PitchViewPitch[];
  // All bookings for parentPitch.id and every child id, already filtered to
  // the selected date. The component slices them per-row itself.
  bookings: PitchViewBooking[];
  selectedDate: string; // 'yyyy-MM-dd', used only for the "now" line
  onSlotClick: (pitchId: number, time: string) => void;
  onBookingClick: (booking: PitchViewBooking) => void;
}

const START_MIN = PITCH_VIEW_START_HOUR * 60;
const END_MIN = PITCH_VIEW_END_HOUR * 60;
const TOTAL_MIN = END_MIN - START_MIN;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function pctFromMinutes(min: number): number {
  const clamped = Math.min(Math.max(min, START_MIN), END_MIN);
  return ((clamped - START_MIN) / TOTAL_MIN) * 100;
}

function formatHourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'am' : 'pm';
  return `${h12}${suffix}`;
}

function friendlyLabel(name: string): string {
  if (/near/i.test(name)) return 'Near';
  if (/far/i.test(name)) return 'Far';
  return name;
}

function shortenPitchName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, '').trim();
}

function statusClasses(status: string): string {
  if (status === 'approved') return 'bg-approved text-white';
  if (status === 'pending')
    return 'bg-pending/80 text-white border border-dashed border-pending';
  return 'bg-rejected/60 text-white'; // shouldn't normally reach here, filtered below
}

// Hourly gridlines on desktop, every 2 hours on mobile.
function HourGridlines() {
  const hours = [];
  for (let h = PITCH_VIEW_START_HOUR; h <= PITCH_VIEW_END_HOUR; h++) hours.push(h);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {hours.map((h) => {
        const isEvenHour = h % 2 === 0;
        return (
          <div
            key={h}
            className={`absolute top-0 bottom-0 border-l border-gray-100 ${
              isEvenHour ? '' : 'hidden md:block'
            }`}
            style={{ left: `${pctFromMinutes(h * 60)}%` }}
          />
        );
      })}
    </div>
  );
}

function HourLabels({ hasLabelColumn }: { hasLabelColumn: boolean }) {
  const hours = [];
  for (let h = PITCH_VIEW_START_HOUR; h <= PITCH_VIEW_END_HOUR; h++) hours.push(h);
  return (
    <div className="flex items-center gap-2 mt-1">
      {hasLabelColumn && (
        <>
          <div className="w-2 h-2 flex-shrink-0" aria-hidden />
          <span className="w-14 flex-shrink-0" aria-hidden />
        </>
      )}
      <div className="relative flex-1 h-4 text-[10px] text-neutral">
        {hours.map((h) => {
          const isEvenHour = h % 2 === 0;
          return (
            <span
              key={h}
              className={`absolute -translate-x-1/2 ${isEvenHour ? '' : 'hidden md:inline'}`}
              style={{ left: `${pctFromMinutes(h * 60)}%` }}
            >
              {formatHourLabel(h)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PitchTimelineRow({
  pitch,
  bookings,
  selectedDate,
  onSlotClick,
  onBookingClick,
  showLabel = true,
  now,
}: {
  pitch: PitchViewPitch;
  bookings: PitchViewBooking[];
  selectedDate: string;
  onSlotClick: (pitchId: number, time: string) => void;
  onBookingClick: (booking: PitchViewBooking) => void;
  showLabel?: boolean;
  now: Date;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const relevant = bookings.filter(
    (b) =>
      (b.pitch_id === pitch.id || b.pitch_id === pitch.parent_pitch_id) &&
      b.status !== 'rejected'
  );

  const isToday = selectedDate === format(now, 'yyyy-MM-dd');
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && nowMin >= START_MIN && nowMin <= END_MIN;

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickPct = (e.clientX - rect.left) / rect.width;
    const rawMin = START_MIN + clickPct * TOTAL_MIN;
    const snapped = Math.round(rawMin / 15) * 15; // snap to nearest 15 min
    const h = Math.floor(snapped / 60);
    const m = snapped % 60;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onSlotClick(pitch.id, time);
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <>
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: pitch.colour }}
            aria-hidden
          />
          <span className="text-xs font-medium text-ink w-14 flex-shrink-0 truncate">
            {friendlyLabel(pitch.name)}
          </span>
        </>
      )}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative flex-1 h-9 bg-gray-50 rounded-md border border-gray-200 cursor-pointer overflow-hidden"
      >
        <HourGridlines />
        {relevant.map((b) => {
          const left = pctFromMinutes(toMinutes(b.start_time));
          const right = pctFromMinutes(toMinutes(b.end_time));
          const width = Math.max(right - left, 1.5); // keep short bookings visible/tappable
          return (
            <button
              key={b.id}
              onClick={(e) => {
                e.stopPropagation();
                onBookingClick(b);
              }}
              className={`absolute top-0.5 bottom-0.5 rounded px-1 text-[10px] font-medium truncate text-left ${statusClasses(
                b.status
              )}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${b.team_name} · ${formatTime(b.start_time)}–${formatTime(b.end_time)}`}
            >
              {width >= 6 ? b.team_name : ''}
            </button>
          );
        })}
        {showNowLine && (
          <div
            className="absolute top-0 bottom-0 w-px bg-rejected z-10"
            style={{ left: `${pctFromMinutes(nowMin)}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default function PitchTimeline({
  parentPitch,
  childPitches,
  bookings,
  selectedDate,
  onSlotClick,
  onBookingClick,
}: PitchTimelineProps) {
  const now = useTickingNow();
  const sortedChildren = [...childPitches].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id
  );
  const isStandalone = sortedChildren.length === 0;
  const rows = isStandalone ? [parentPitch] : sortedChildren;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-ink mb-2">{shortenPitchName(parentPitch.name)}</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <PitchTimelineRow
            key={row.id}
            pitch={row}
            bookings={bookings}
            selectedDate={selectedDate}
            onSlotClick={onSlotClick}
            onBookingClick={onBookingClick}
            showLabel={!isStandalone}
            now={now}
          />
        ))}
      </div>
      <HourLabels hasLabelColumn={!isStandalone} />
    </div>
  );
}
