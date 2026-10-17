-- Hosts redeem a guest's points in person. The guest shows a code; the
-- host chooses an amount from 50 up to the guest's current balance.

create table public.point_redemptions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  guest_name text not null default '',
  email text not null default '',
  amount integer not null check (amount >= 50),
  balance_before integer not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.point_redemptions enable row level security;

create policy "admin read redemptions" on public.point_redemptions
  for select to authenticated
  using (public.is_admin());

create or replace function public.preview_point_redemption(
  p_guest_id uuid default null,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.guests%rowtype;
  guest_email text;
  balance integer;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  if p_guest_id is not null then
    select * into g from public.guests where id = p_guest_id;
  elsif coalesce(trim(p_email), '') <> '' then
    select guests.* into g
    from public.guests
    join auth.users u on u.id = guests.auth_user_id
    where lower(u.email) = lower(trim(p_email));
  else
    raise exception 'Scan a guest code or enter an email.';
  end if;

  if not found or g.id is null then
    raise exception 'No guest matches that code.';
  end if;

  select u.email into guest_email
  from auth.users u
  where u.id = g.auth_user_id;

  select coalesce(sum(amount), 0)::integer into balance
  from public.points_ledger
  where guest_id = g.id;

  return jsonb_build_object(
    'guestId', g.id,
    'displayName', coalesce(g.display_name, ''),
    'email', coalesce(guest_email, ''),
    'points', balance
  );
end;
$$;

create or replace function public.redeem_guest_points(
  p_guest_id uuid,
  p_amount integer,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.guests%rowtype;
  guest_email text;
  balance integer;
  note_text text;
  redemption_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  if p_guest_id is null then
    raise exception 'No guest matches that code.';
  end if;
  if p_amount is null or p_amount < 50 then
    raise exception 'Redeem at least 50 points.';
  end if;

  select * into g from public.guests where id = p_guest_id for update;
  if g.id is null then
    raise exception 'No guest matches that code.';
  end if;

  select coalesce(sum(amount), 0)::integer into balance
  from public.points_ledger
  where guest_id = g.id;

  if p_amount > balance then
    raise exception 'They only have % points.', balance;
  end if;

  select u.email into guest_email
  from auth.users u
  where u.id = g.auth_user_id;

  note_text := left(trim(coalesce(p_note, '')), 140);

  insert into public.point_redemptions (guest_id, guest_name, email, amount, balance_before, note)
  values (g.id, coalesce(g.display_name, ''), coalesce(guest_email, ''), p_amount, balance, note_text)
  returning id into redemption_id;

  insert into public.points_ledger (guest_id, source_key, amount, label)
  values (
    g.id,
    'redeem:' || redemption_id::text,
    -p_amount,
    case
      when note_text = '' then 'Redeemed points'
      else 'Redeemed: ' || left(note_text, 80)
    end
  );

  return jsonb_build_object(
    'ok', true,
    'guestId', g.id,
    'displayName', coalesce(g.display_name, ''),
    'email', coalesce(guest_email, ''),
    'amount', p_amount,
    'points', balance - p_amount,
    'note', note_text
  );
end;
$$;

revoke all on function public.preview_point_redemption(uuid, text) from public;
grant execute on function public.preview_point_redemption(uuid, text) to authenticated;

revoke all on function public.redeem_guest_points(uuid, integer, text) from public;
grant execute on function public.redeem_guest_points(uuid, integer, text) to authenticated;
