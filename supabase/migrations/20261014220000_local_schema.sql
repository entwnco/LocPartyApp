-- Local-only schema for the Loc Party app.
-- Do not link this project or run `supabase db push` against the hosted
-- database. This file is applied only by the local Docker stack.

-- ---------------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

-- The first auth user created on an empty database becomes the admin.
-- Later signups (guests) are not promoted.
create or replace function public.promote_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins) then
    insert into public.admins (user_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.promote_first_admin();

-- ---------------------------------------------------------------------------
-- party groups: 5 groups, assigned in join order, then back to 1
-- ---------------------------------------------------------------------------

create table public.party_group_state (
  id integer primary key default 1 check (id = 1),
  next_group smallint not null default 1 check (next_group between 1 and 5)
);

insert into public.party_group_state (id, next_group) values (1, 1);

alter table public.party_group_state enable row level security;

create or replace function public.assign_party_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  group_count constant smallint := 5;
  assigned smallint;
begin
  select next_group
    into assigned
  from public.party_group_state
  where id = 1
  for update;

  if assigned is null then
    insert into public.party_group_state (id, next_group) values (1, 1);
    assigned := 1;
  end if;

  new.group_number := assigned;

  update public.party_group_state
  set next_group = case when assigned >= group_count then 1 else (assigned + 1)::smallint end
  where id = 1;

  return new;
end;
$$;

create or replace function public.preserve_party_group()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.group_number := old.group_number;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- guests
-- ---------------------------------------------------------------------------

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null,
  photo_url text,
  look_photo_url text,
  here_for text not null default '',
  relationship_status_id text,
  relationship_theme text,
  group_number smallint not null check (group_number between 1 and 5),
  created_at timestamptz not null default now(),
  constraint guests_display_name_unique unique (display_name)
);

create trigger guests_assign_party_group
  before insert on public.guests
  for each row
  execute function public.assign_party_group();

create trigger guests_preserve_party_group
  before update on public.guests
  for each row
  execute function public.preserve_party_group();

-- ---------------------------------------------------------------------------
-- content
-- ---------------------------------------------------------------------------

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  description text not null default '',
  location text not null default '',
  logo_url text,
  is_featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default '',
  location text not null default '',
  vendor_id uuid references public.vendors (id) on delete set null,
  start_time text,
  end_time text,
  point_value integer not null default 0,
  entry_value integer not null default 0,
  proof_type text not null default 'check_in',
  unlock jsonb not null default '{"type":"immediate"}'::jsonb,
  completion_message text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  time_label text not null default '',
  title text not null,
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  active boolean not null default true,
  priority boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.prizes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.raffle_config (
  id integer primary key check (id = 1),
  rules text not null default '',
  prize text not null default '',
  deadline text,
  drawing_time text,
  eligibility text not null default '',
  contact_method text not null default '',
  must_be_present boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed', 'drawn')),
  winner_guest_id uuid,
  winner_entry_id uuid,
  announced boolean not null default false,
  drawn_at timestamptz
);

create table public.app_config (
  id integer primary key check (id = 1),
  point_values jsonb not null default '{}'::jsonb,
  raffle_entry_sources jsonb not null default '{}'::jsonb,
  theme_colors jsonb not null default '{}'::jsonb,
  hunt_title text not null default '',
  hunt_body text not null default ''
);

insert into public.raffle_config (id) values (1);
insert into public.app_config (id) values (1);

-- ---------------------------------------------------------------------------
-- activity
-- ---------------------------------------------------------------------------

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  source_key text not null,
  amount integer not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (guest_id, source_key)
);

create table public.raffle_ledger (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  source_key text not null,
  count integer not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (guest_id, source_key)
);

alter table public.raffle_config
  add constraint raffle_config_winner_guest_fkey
  foreign key (winner_guest_id) references public.guests (id) on delete set null;

alter table public.raffle_config
  add constraint raffle_config_winner_entry_fkey
  foreign key (winner_entry_id) references public.raffle_ledger (id) on delete set null;

create table public.completions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  proof_type text not null,
  proof_payload jsonb,
  status text not null default 'approved',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (guest_id, challenge_id)
);

create table public.triggered_hidden (
  guest_id uuid not null references public.guests (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guest_id, challenge_id)
);

-- ---------------------------------------------------------------------------
-- raffle draw + leaderboard
-- ---------------------------------------------------------------------------

create or replace function public.draw_raffle_winner()
returns table (
  winner_guest_id uuid,
  winner_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.raffle_config%rowtype;
  picked public.raffle_ledger%rowtype;
  total_tickets integer;
  ticket integer;
  running integer := 0;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into cfg from public.raffle_config where id = 1 for update;
  if cfg.status = 'drawn' then
    raise exception 'raffle already drawn';
  end if;

  select coalesce(sum(r.count), 0) into total_tickets from public.raffle_ledger r;
  if total_tickets <= 0 then
    raise exception 'no entries to draw';
  end if;

  ticket := floor(random() * total_tickets)::integer + 1;

  for picked in
    select * from public.raffle_ledger order by created_at, id
  loop
    running := running + picked.count;
    exit when running >= ticket;
  end loop;

  update public.raffle_config
  set status = 'drawn',
      winner_guest_id = picked.guest_id,
      winner_entry_id = picked.id,
      drawn_at = now(),
      announced = false
  where id = 1;

  return query select picked.guest_id, picked.id;
end;
$$;

create or replace function public.get_leaderboard(limit_count integer default 100)
returns table (
  guest_id uuid,
  display_name text,
  total_points bigint,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select ranked.guest_id, ranked.display_name, ranked.total_points, ranked.rank
  from (
    select
      g.id as guest_id,
      g.display_name,
      coalesce(sum(p.amount), 0)::bigint as total_points,
      rank() over (order by coalesce(sum(p.amount), 0) desc, g.created_at asc) as rank
    from public.guests g
    left join public.points_ledger p on p.guest_id = g.id
    group by g.id
  ) ranked
  order by ranked.rank, ranked.display_name
  limit greatest(coalesce(limit_count, 100), 0);
$$;

revoke all on function public.draw_raffle_winner() from public;
revoke all on function public.get_leaderboard(integer) from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.get_leaderboard(integer) to anon, authenticated, service_role;
grant execute on function public.draw_raffle_winner() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.guests enable row level security;
alter table public.vendors enable row level security;
alter table public.challenges enable row level security;
alter table public.schedule_items enable row level security;
alter table public.announcements enable row level security;
alter table public.prizes enable row level security;
alter table public.raffle_config enable row level security;
alter table public.app_config enable row level security;
alter table public.points_ledger enable row level security;
alter table public.raffle_ledger enable row level security;
alter table public.completions enable row level security;
alter table public.triggered_hidden enable row level security;

create policy "content select vendors" on public.vendors for select to anon, authenticated using (true);
create policy "content select challenges" on public.challenges for select to anon, authenticated using (true);
create policy "content select schedule" on public.schedule_items for select to anon, authenticated using (true);
create policy "content select announcements" on public.announcements for select to anon, authenticated using (true);
create policy "content select prizes" on public.prizes for select to anon, authenticated using (true);
create policy "content select raffle" on public.raffle_config for select to anon, authenticated using (true);
create policy "content select app config" on public.app_config for select to anon, authenticated using (true);

create policy "admin write vendors" on public.vendors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write challenges" on public.challenges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write schedule" on public.schedule_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write announcements" on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write prizes" on public.prizes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write raffle" on public.raffle_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write app config" on public.app_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read own guest or admin" on public.guests for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());
create policy "insert own guest" on public.guests for insert to authenticated
  with check (auth_user_id = auth.uid());
create policy "update own guest" on public.guests for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "read own points or admin" on public.points_ledger for select to authenticated
  using (
    public.is_admin()
    or guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  );
create policy "insert own points or admin" on public.points_ledger for insert to authenticated
  with check (
    public.is_admin()
    or guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  );

create policy "read own entries or admin" on public.raffle_ledger for select to authenticated
  using (
    public.is_admin()
    or guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  );
create policy "insert own entries or admin" on public.raffle_ledger for insert to authenticated
  with check (
    public.is_admin()
    or guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  );
create policy "admin delete entries" on public.raffle_ledger for delete to authenticated
  using (public.is_admin());

create policy "read own completions or admin" on public.completions for select to authenticated
  using (
    public.is_admin()
    or guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  );
create policy "upsert own completions" on public.completions for insert to authenticated
  with check (
    guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  );
create policy "update own completions or admin" on public.completions for update to authenticated
  using (
    public.is_admin()
    or guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  );

create policy "read own hidden triggers" on public.triggered_hidden for select to authenticated
  using (
    guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
    or public.is_admin()
  );
create policy "admin insert hidden triggers" on public.triggered_hidden for insert to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- realtime + storage
-- ---------------------------------------------------------------------------

alter table public.announcements replica identity full;
alter table public.raffle_config replica identity full;

alter publication supabase_realtime add table
  public.guests,
  public.challenges,
  public.vendors,
  public.schedule_items,
  public.announcements,
  public.prizes,
  public.raffle_config,
  public.app_config,
  public.points_ledger,
  public.raffle_ledger,
  public.completions,
  public.triggered_hidden;

insert into storage.buckets (id, name, public)
values ('party-photos', 'party-photos', true);

create policy "party photos are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'party-photos');
