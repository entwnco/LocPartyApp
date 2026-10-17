-- Jess Vibez joins Loc & Hair Care. Booksy and Midway Specialty Care
-- join Community & Services. Entwined leads her vendor section.

update public.vendors
set category = 'Loc & Hair Care'
where name = 'Jess Vibez Creations';

update public.vendors
set sort_order = 0
where name = 'Entwined Loc Studio';

insert into public.vendors (name, category, description, location, logo_url, is_featured, active, sort_order)
select
  'Midway Specialty Care Center',
  'Community & Services',
  'Sexual health care.',
  '',
  'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/midway-specialty-care.png',
  false,
  true,
  32
where not exists (
  select 1 from public.vendors where name = 'Midway Specialty Care Center'
);

insert into public.vendors (name, category, description, location, logo_url, is_featured, active, sort_order)
select
  'Booksy',
  'Community & Services',
  'Book appointments',
  '',
  null,
  false,
  true,
  33
where not exists (
  select 1 from public.vendors where name = 'Booksy'
);
