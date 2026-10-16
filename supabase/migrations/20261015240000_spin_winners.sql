-- Winners are an ordered list. Prizes are matched to that order in person.
-- Each row keeps the name and email from the moment of the spin.

alter table public.raffle_spins
  add column if not exists email text not null default '',
  add column if not exists guest_name text not null default '';

create or replace function public.spin_raffle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_spin integer;
  total_tickets integer;
  ticket integer;
  running integer := 0;
  chosen_id uuid;
  chosen_name text;
  chosen_email text;
  chosen_points integer;
  chosen_tickets integer;
  rec record;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  perform 1 from public.raffle_config where id = 1 for update;

  select coalesce(max(spin_number), 0) + 1 into next_spin from public.raffle_spins;

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
      u.email,
      coalesce(sum(p.amount), 0)::integer as points,
      greatest(floor(coalesce(sum(p.amount), 0) / 50.0)::integer, 0) as tickets
    from public.guests g
    join auth.users u on u.id = g.auth_user_id
    left join public.points_ledger p on p.guest_id = g.id
    where not exists (select 1 from public.raffle_spins s where s.guest_id = g.id)
    group by g.id, g.display_name, g.created_at, u.email
    having greatest(floor(coalesce(sum(p.amount), 0) / 50.0)::integer, 0) > 0
    order by g.created_at, g.id
  loop
    running := running + rec.tickets;
    if running >= ticket then
      chosen_id := rec.id;
      chosen_name := rec.display_name;
      chosen_email := coalesce(rec.email, '');
      chosen_points := rec.points;
      chosen_tickets := rec.tickets;
      exit;
    end if;
  end loop;

  if chosen_id is null then
    raise exception 'No one left with a ticket.';
  end if;

  insert into public.raffle_spins (
    spin_number, guest_id, guest_name, email, points, tickets
  ) values (
    next_spin, chosen_id, coalesce(chosen_name, ''), chosen_email, chosen_points, chosen_tickets
  );

  return jsonb_build_object(
    'spinNumber', next_spin,
    'guestId', chosen_id,
    'displayName', chosen_name,
    'email', chosen_email,
    'points', chosen_points,
    'tickets', chosen_tickets
  );
end;
$$;

revoke all on function public.spin_raffle() from public;
grant execute on function public.spin_raffle() to authenticated;
