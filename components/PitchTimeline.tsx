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

function assignLanes(items: PitchViewBooking[]): Map<string, number> {
  const sorted = [...items].sort(
    (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)
  );
  const laneEnds: number[] = [];
  const laneOf = new Map<string, number>();
  for (const b of sorted) {
    const start = toMinutes(b.start_time);
    const end = toMinutes(b.end_time);
    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= start) {
        laneEnds[i] = end;
        laneOf.set(b.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      laneEnds.push(end);
      laneOf.set(b.id, laneEnds.length - 1);
    }
  }
  return laneOf;
}

const LANE_HEIGHT = 32; // px per overlapping booking "lane" (button is LANE_HEIGHT - 4 tall)
const LANE_PAD_TOP = 8; // space above the first lane; also used below the last one
const MIN_TRACK_HEIGHT = 44; // keeps an empty track a comfortable tap target

function statusClasses(status: string): string {
  if (status === 'approved') return 'bg-approved text-white';
  if (status === 'pending')
    return 'bg-pending/80 text-white border border-dashed border-pending';
  return 'bg-rejected/60 text-white'; // shouldn't normally reach here, filtered below
}

// Hourly gridlines (the track is wide enough on every screen size now).
function HourGridlines() {
  const hours = [];
  for (let h = PITCH_VIEW_START_HOUR; h <= PITCH_VIEW_END_HOUR; h++) hours.push(h);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {hours.map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 border-l border-gray-100"
          style={{ left: `${pctFromMinutes(h * 60)}%` }}
        />
      ))}
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
        {hours.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2"
            style={{ left: `${pctFromMinutes(h * 60)}%` }}
          >
            {formatHourLabel(h)}
          </span>
        ))}
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
  pendingTime = null,
}: {
  pitch: PitchViewPitch;
  bookings: PitchViewBooking[];
  selectedDate: string;
  onSlotClick: (pitchId: number, time: string) => void;
  onBookingClick: (booking: PitchViewBooking) => void;
  showLabel?: boolean;
  now: Date;
  pendingTime?: string | null; // 'HH:MM' of a tapped-but-unconfirmed slot on this row
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

  const laneOf = assignLanes(relevant);
  const laneCount = Math.max(1, ...Array.from(laneOf.values()).map((l) => l + 1));
  const trackHeight = Math.max(MIN_TRACK_HEIGHT, laneCount * LANE_HEIGHT + LANE_PAD_TOP + 4);

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
    <div className="flex items-center">
      {showLabel && (
        <div className="sticky left-0 z-20 bg-white flex items-center gap-2 pr-2 flex-shrink-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: pitch.colour }}
            aria-hidden
          />
          <span className="text-xs font-medium text-ink w-14 flex-shrink-0 truncate">
            {friendlyLabel(pitch.name)}
          </span>
        </div>
      )}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative flex-1 bg-gray-50 rounded-md border border-gray-200 cursor-pointer overflow-hidden"
        style={{ height: `${trackHeight}px` }}
      >
        <HourGridlines />
        {relevant.map((b) => {
          const left = pctFromMinutes(toMinutes(b.start_time));
          const right = pctFromMinutes(toMinutes(b.end_time));
          const width = Math.max(right - left, 2.5); // keep short bookings visible/tappable
          return (
            <button
              key={b.id}
              onClick={(e) => {
                e.stopPropagation();
                onBookingClick(b);
              }}
              className={`absolute rounded px-1 text-[10px] font-medium truncate text-left ${statusClasses(
                b.status
              )}`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: `${laneOf.get(b.id)! * LANE_HEIGHT + LANE_PAD_TOP}px`,
                height: `${LANE_HEIGHT - 4}px`,
              }}
              title={`${b.team_name} · ${formatTime(b.start_time)}–${formatTime(b.end_time)}`}
            >
              {width >= 6 ? b.team_name : ''}
            </button>
          );
        })}
        {pendingTime && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-info z-10 pointer-events-none"
            style={{ left: `${pctFromMinutes(toMinutes(pendingTime))}%` }}
          />
        )}
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

  // On touch devices a tap on an empty slot is only a "selection" until the user
  // confirms it, so a stray tap or a scroll-drag never throws them off to another
  // page. With a mouse the click books straight away, as it always did.
  const [pendingSlot, setPendingSlot] = useState<{ pitchId: number; time: string } | null>(null);
  function handleSlotPick(pitchId: number, time: string) {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) setPendingSlot({ pitchId, time });
    else onSlotClick(pitchId, time);
  }
  useEffect(() => {
    setPendingSlot(null);
  }, [selectedDate]);
  const pendingRow = pendingSlot ? rows.find((r) => r.id === pendingSlot.pitchId) : undefined;
  const pendingLabel = pendingRow
    ? isStandalone
      ? shortenPitchName(pendingRow.name)
      : friendlyLabel(pendingRow.name)
    : '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-ink mb-2">{shortenPitchName(parentPitch.name)}</h3>
      {/* On phones the timeline keeps a fixed width per hour and scrolls sideways
          instead of squashing 14 hours into ~250px. From md up it fits the card. */}
      <div className="overflow-x-auto">
        <div className="min-w-[860px] md:min-w-0">
          <div className="space-y-2">
            {rows.map((row) => (
              <PitchTimelineRow
                key={row.id}
                pitch={row}
                bookings={bookings}
                selectedDate={selectedDate}
                onSlotClick={handleSlotPick}
                onBookingClick={onBookingClick}
                showLabel={!isStandalone}
                now={now}
                pendingTime={pendingSlot?.pitchId === row.id ? pendingSlot.time : null}
              />
            ))}
          </div>
          <HourLabels hasLabelColumn={!isStandalone} />
        </div>
      </div>
      {pendingSlot && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-xs text-ink">
            Book {pendingLabel} at {formatTime(pendingSlot.time)}?
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPendingSlot(null)}
              className="min-h-[36px] rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-ink"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSlotClick(pendingSlot.pitchId, pendingSlot.time);
                setPendingSlot(null);
              }}
              className="min-h-[36px] rounded-md bg-info px-3 text-xs font-medium text-white"
            >
              Book
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
