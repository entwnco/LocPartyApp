-- Guest-facing venue areas. Active flags are edited in admin so an area
-- can be hidden without shipping a new app.

create table public.venue_areas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

alter table public.venue_areas enable row level security;

create policy "content select venue areas" on public.venue_areas
  for select to anon, authenticated using (true);

create policy "admin write venue areas" on public.venue_areas
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.venue_areas;

insert into public.venue_areas (id, title, description, active, sort_order)
values
  ('71000000-0000-4000-8000-000000000001', 'Visual Arts Gallerie', 'Art & creative discovery', true, 1),
  ('71000000-0000-4000-8000-000000000002', 'The Loc Shop', 'Loc care & beauty', true, 2),
  ('71000000-0000-4000-8000-000000000003', 'The Marketplace', 'Vendor exploration', true, 3),
  ('71000000-0000-4000-8000-000000000004', 'Game Stop', 'Physical play & challenges', true, 4),
  ('71000000-0000-4000-8000-000000000005', 'Libations', 'Refresh & connect', true, 5),
  ('71000000-0000-4000-8000-000000000006', 'Internet Shenanigans', 'Digital creativity', true, 6)
on conflict (id) do nothing;
