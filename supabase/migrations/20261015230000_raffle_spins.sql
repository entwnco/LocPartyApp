-- Staff spins. Tickets are floor(points / 50). Each guest can win once.
-- Spin 1 takes the first active prize, spin 2 the next, in prize order.

create table public.raffle_spins (
  id uuid primary key default gen_random_uuid(),
  spin_number integer not null unique check (spin_number > 0),
  guest_id uuid not null references public.guests (id) on delete cascade,
  prize_id uuid references public.prizes (id) on delete set null,
  prize_title text not null default '',
  prize_description text not null default '',
  points integer not null,
  tickets integer not null check (tickets > 0),
  created_at timestamptz not null default now(),
  unique (guest_id)
);

alter table public.raffle_spins enable row level security;

create policy "admin read spins" on public.raffle_spins
  for select to authenticated
  using (public.is_admin());

alter table public.raffle_spins replica identity full;
alter publication supabase_realtime add table public.raffle_spins;

create or replace function public.spin_raffle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prize public.prizes%rowtype;
  next_spin integer;
  total_tickets integer;
  ticket integer;
  running integer := 0;
  chosen_id uuid;
  chosen_name text;
  chosen_points integer;
  chosen_tickets integer;
  rec record;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  perform 1 from public.raffle_config where id = 1 for update;

  select coalesce(max(spin_number), 0) + 1 into next_spin from public.raffle_spins;

  select * into prize
  from public.prizes
  where active
    and not exists (
      select 1 from public.raffle_spins s where s.prize_id = prizes.id
    )
  order by sort_order, id
  limit 1;

  if not found then
    raise exception 'Add the next prize before spinning.';
  end if;

  select coalesce(sum(pool.tickets), 0) into total_tickets
  from (
    select greatest(floor(coalesce(sum(p.amount), 0) / 50.0)::integer, 0) as tickets
    from public.guests g
    left join public.points_ledger p on p.guest_id = g.id
    where not exists (select 1 from public.raffle_spins s where s.guest_id = g.id)
    group by g.id
  ) pool;

  if total_tickets < 1 then
    raise exception 'No one left with a ticket.';
  end if;

  ticket := floor(random() * total_tickets)::integer + 1;

  for rec in
    select
      g.id,
      g.display_name,
      coalesce(sum(p.amount), 0)::integer as points,
      greatest(floor(coalesce(sum(p.amount), 0) / 50.0)::integer, 0) as tickets
    from public.guests g
    left join public.points_ledger p on p.guest_id = g.id
    where not exists (select 1 from public.raffle_spins s where s.guest_id = g.id)
    group by g.id, g.display_name, g.created_at
    having greatest(floor(coalesce(sum(p.amount), 0) / 50.0)::integer, 0) > 0
    order by g.created_at, g.id
  loop
    running := running + rec.tickets;
    if running >= ticket then
      chosen_id := rec.id;
      chosen_name := rec.display_name;
      chosen_points := rec.points;
      chosen_tickets := rec.tickets;
      exit;
    end if;
  end loop;

  if chosen_id is null then
    raise exception 'No one left with a ticket.';
  end if;

  insert into public.raffle_spins (
    spin_number, guest_id, prize_id, prize_title, prize_description, points, tickets
  ) values (
    next_spin, chosen_id, prize.id, prize.title, prize.description, chosen_points, chosen_tickets
  );

  return jsonb_build_object(
    'spinNumber', next_spin,
    'guestId', chosen_id,
    'displayName', chosen_name,
    'prizeId', prize.id,
    'prizeTitle', prize.title,
    'points', chosen_points,
    'tickets', chosen_tickets
  );
end;
$$;

create or replace function public.undo_raffle_spin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  removed public.raffle_spins%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  perform 1 from public.raffle_config where id = 1 for update;

  delete from public.raffle_spins
  where spin_number = (select max(spin_number) from public.raffle_spins)
  returning * into removed;

  if not found then
    raise exception 'Nothing to undo.';
  end if;

  return jsonb_build_object(
    'spinNumber', removed.spin_number,
    'guestId', removed.guest_id,
    'prizeTitle', removed.prize_title
  );
end;
$$;

revoke all on function public.spin_raffle() from public;
revoke all on function public.undo_raffle_spin() from public;
grant execute on function public.spin_raffle() to authenticated;
grant execute on function public.undo_raffle_spin() to authenticated;
