alter table public.pitches add column parent_pitch_id integer references public.pitches(id);

update public.pitches set parent_pitch_id = 1 where id in (2, 3);
update public.pitches set parent_pitch_id = 4 where id in (5, 6);

create or replace function public.check_booking_conflict_extended(
  p_pitch_id integer,
  p_date date,
  p_start time without time zone,
  p_end time without time zone,
  p_exclude_id uuid default null
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_parent_id integer;
  v_conflict boolean := false;
begin
  select exists (
    select 1 from public.bookings
    where pitch_id = p_pitch_id
      and booking_date = p_date
      and status = 'approved'
      and id is distinct from p_exclude_id
      and (start_time, end_time) overlaps (p_start, p_end)
  ) into v_conflict;

  if v_conflict then return true; end if;

  select parent_pitch_id into v_parent_id from public.pitches where id = p_pitch_id;

  if v_parent_id is not null then
    select exists (
      select 1 from public.bookings
      where pitch_id = v_parent_id
        and booking_date = p_date
        and status = 'approved'
        and id is distinct from p_exclude_id
        and (start_time, end_time) overlaps (p_start, p_end)
    ) into v_conflict;
  else
    select exists (
      select 1 from public.bookings b
      join public.pitches p on p.id = b.pitch_id
      where p.parent_pitch_id = p_pitch_id
        and b.booking_date = p_date
        and b.status = 'approved'
        and b.id is distinct from p_exclude_id
        and (b.start_time, b.end_time) overlaps (p_start, p_end)
    ) into v_conflict;
  end if;

  return v_conflict;
end;
$$;
