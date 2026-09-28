alter table public.pitches add column split_orientation text check (split_orientation in ('horizontal', 'vertical'));

update public.pitches set split_orientation = 'vertical' where id = 1;   -- Main Pitch: splits left/right (Near | Far side by side)
update public.pitches set split_orientation = 'horizontal' where id = 4; -- Training Pitch: splits top/bottom (Far above, Near below)
