-- Guests no longer insert ledger rows themselves. Rewards are granted
-- by these functions, which read the amounts from config and challenges.

drop policy if exists "insert own points or admin" on public.points_ledger;
create policy "admin insert points" on public.points_ledger
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "insert own entries or admin" on public.raffle_ledger;
create policy "admin insert entries" on public.raffle_ledger
  for insert to authenticated
  with check (public.is_admin());

create or replace function public.grant_my_reward(p_source text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.guests%rowtype;
  cfg public.app_config%rowtype;
  ch public.challenges%rowtype;
  challenge_id uuid;
  points integer := 0;
  entries integer := 0;
  points_label text := '';
  entries_label text := '';
  entries_key text := p_source;
  awarded_points boolean := false;
  awarded_entries boolean := false;
begin
  select * into g from public.guests where auth_user_id = auth.uid();
  if g.id is null then
    raise exception 'No guest profile.';
  end if;

  select * into cfg from public.app_config where id = 1;
  if cfg.id is null then
    raise exception 'Event config is missing.';
  end if;

  if p_source = 'createProfile' then
    points := coalesce((cfg.point_values->>'createProfile')::integer, 0);
    points_label := 'Created your party profile';
    entries_key := 'registration';
    if cfg.raffle_enabled and (cfg.raffle_entry_sources ? 'registration') then
      entries := coalesce((cfg.raffle_entry_sources->'registration'->>'entries')::integer, 0);
      entries_label := coalesce(cfg.raffle_entry_sources->'registration'->>'label', 'Registration');
    end if;
  elsif p_source = 'selectRelationshipStatus' then
    if coalesce(g.relationship_status_id, '') = '' then
      raise exception 'Set a relationship status first.';
    end if;
    points := coalesce((cfg.point_values->>'selectRelationshipStatus')::integer, 0);
    points_label := 'Shared relationship status';
  elsif p_source = 'profilePhoto' then
    if coalesce(g.photo_url, '') = '' then
      raise exception 'Add a profile photo first.';
    end if;
    points := coalesce((cfg.point_values->>'profilePhoto')::integer, 0);
    points_label := 'Added a profile photo';
  elsif p_source = 'uploadLook' then
    if coalesce(g.look_photo_url, '') = '' then
      raise exception 'Upload a look first.';
    end if;
    points := coalesce((cfg.point_values->>'uploadLook')::integer, 0);
    points_label := 'Uploaded Loc Party look';
    if cfg.raffle_enabled and (cfg.raffle_entry_sources ? 'uploadLook') then
      entries := coalesce((cfg.raffle_entry_sources->'uploadLook'->>'entries')::integer, 0);
      entries_label := coalesce(cfg.raffle_entry_sources->'uploadLook'->>'label', 'Uploaded a Loc Party look');
    end if;
  elsif p_source ~ '^challenge:[0-9a-fA-F-]{36}$' then
    challenge_id := split_part(p_source, ':', 2)::uuid;
    select * into ch from public.challenges where id = challenge_id and active;
    if ch.id is null then
      raise exception 'This challenge is not available.';
    end if;
    if not exists (
      select 1 from public.completions c
      where c.guest_id = g.id and c.challenge_id = ch.id and c.status = 'approved'
    ) then
      raise exception 'That challenge is not complete.';
    end if;
    points := greatest(ch.point_value, 0);
    points_label := ch.title;
    if cfg.raffle_enabled and ch.entry_value > 0 then
      entries := ch.entry_value;
      entries_label := ch.title;
    end if;
  else
    raise exception 'That reward is not available.';
  end if;

  if points > 0 then
    begin
      insert into public.points_ledger (guest_id, source_key, amount, label)
      values (g.id, p_source, points, points_label);
      awarded_points := true;
    exception when unique_violation then
      awarded_points := false;
    end;
  end if;

  if entries > 0 then
    begin
      insert into public.raffle_ledger (guest_id, source_key, count, label)
      values (g.id, entries_key, entries, entries_label);
      awarded_entries := true;
    exception when unique_violation then
      awarded_entries := false;
    end;
  end if;

  return jsonb_build_object(
    'awarded', awarded_points or awarded_entries,
    'points', case when awarded_points then points else 0 end,
    'entries', case when awarded_entries then entries else 0 end
  );
end;
$$;

create or replace function public.buy_raffle_entries(p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.guests%rowtype;
  cfg public.app_config%rowtype;
  raffle_status text;
  cost_each integer;
  total_cost integer;
  balance integer;
  source_key text;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 20 then
    raise exception 'Choose between 1 and 20 entries.';
  end if;

  select * into g from public.guests where auth_user_id = auth.uid() for update;
  if g.id is null then
    raise exception 'No guest profile.';
  end if;

  select * into cfg from public.app_config where id = 1;
  if cfg.id is null then
    raise exception 'Event config is missing.';
  end if;
  select status into raffle_status from public.raffle_config where id = 1;
  if not cfg.raffle_enabled or raffle_status is distinct from 'open' then
    raise exception 'The raffle is not open.';
  end if;

  cost_each := coalesce((cfg.point_values->>'buyEntryCost')::integer, 50);
  if cost_each < 1 or cost_each > 100000 then
    raise exception 'Raffle entries are not for sale.';
  end if;
  total_cost := cost_each * p_quantity;

  select coalesce(sum(amount), 0) into balance
  from public.points_ledger
  where guest_id = g.id;

  if balance < total_cost then
    return jsonb_build_object('ok', false, 'reason', 'insufficient');
  end if;

  source_key := 'buyEntry:' || gen_random_uuid()::text;
  insert into public.points_ledger (guest_id, source_key, amount, label)
  values (
    g.id,
    source_key,
    -total_cost,
    'Bought ' || p_quantity || ' raffle ' || case when p_quantity = 1 then 'entry' else 'entries' end
  );
  insert into public.raffle_ledger (guest_id, source_key, count, label)
  values (g.id, source_key, p_quantity, 'Bought with points');

  return jsonb_build_object('ok', true, 'points', total_cost, 'entries', p_quantity);
end;
$$;

revoke all on function public.grant_my_reward(text) from public;
revoke all on function public.buy_raffle_entries(integer) from public;
grant execute on function public.grant_my_reward(text) to authenticated;
grant execute on function public.buy_raffle_entries(integer) to authenticated;
