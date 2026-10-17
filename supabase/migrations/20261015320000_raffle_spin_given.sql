-- A spin stays a winner. Given means the prize was handed over, and that
-- spin can no longer be undone.

alter table public.raffle_spins
  add column if not exists given_at timestamptz;

create or replace function public.mark_raffle_spin_given(p_spin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  spin public.raffle_spins%rowtype;
  prize public.prizes%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  perform 1 from public.raffle_config where id = 1 for update;

  select * into spin from public.raffle_spins where id = p_spin_id for update;
  if not found then
    raise exception 'Unknown spin.';
  end if;
  if spin.given_at is not null then
    raise exception 'That prize was already given.';
  end if;

  select * into prize
  from public.prizes
  where active
  order by sort_order, id
  offset spin.spin_number - 1
  limit 1;

  update public.raffle_spins
  set
    given_at = now(),
    prize_id = coalesce(spin.prize_id, prize.id),
    prize_title = case
      when spin.prize_title <> '' then spin.prize_title
      else coalesce(prize.title, '')
    end,
    prize_description = case
      when spin.prize_description <> '' then spin.prize_description
      else coalesce(prize.description, '')
    end
  where id = spin.id;
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

  select * into removed
  from public.raffle_spins
  where spin_number = (select max(spin_number) from public.raffle_spins)
  for update;

  if not found then
    raise exception 'Nothing to undo.';
  end if;
  if removed.given_at is not null then
    raise exception 'That prize was already given.';
  end if;

  delete from public.raffle_spins where id = removed.id;

  return jsonb_build_object(
    'spinNumber', removed.spin_number,
    'guestId', removed.guest_id,
    'prizeTitle', removed.prize_title
  );
end;
$$;

revoke all on function public.mark_raffle_spin_given(uuid) from public;
revoke all on function public.undo_raffle_spin() from public;
grant execute on function public.mark_raffle_spin_given(uuid) to authenticated;
grant execute on function public.undo_raffle_spin() to authenticated;
