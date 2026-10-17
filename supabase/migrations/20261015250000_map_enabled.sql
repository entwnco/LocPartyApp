-- The floor-plan map stays hidden until there is a real image.
-- Guests use Venue in the meantime.

alter table public.app_config
  add column if not exists map_enabled boolean not null default false;
