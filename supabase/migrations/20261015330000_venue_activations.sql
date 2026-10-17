-- Replace Libations and Internet Shenanigans with Main Stage on the
-- guest venue list.

delete from public.venue_areas
where id in (
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);

insert into public.venue_areas (id, title, description, active, sort_order)
values
  ('71000000-0000-4000-8000-000000000007', 'Main Stage', 'Live performances', true, 5)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    active = excluded.active,
    sort_order = excluded.sort_order;
