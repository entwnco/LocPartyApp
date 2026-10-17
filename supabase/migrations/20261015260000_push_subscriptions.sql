-- Phones that opted into announcement alerts. Guests write their own
-- subscription through save_push_subscription. The send function reads
-- the table with the service role.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from public, anon, authenticated;
grant select, delete on public.push_subscriptions to service_role;

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  if p_endpoint is null or length(p_endpoint) < 12 or length(p_endpoint) > 2000 then
    raise exception 'Invalid push endpoint';
  end if;
  if p_p256dh is null or p_auth is null or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'Invalid push keys';
  end if;
  if position('https://' in p_endpoint) <> 1 then
    raise exception 'Invalid push endpoint';
  end if;

  select id into gid from public.guests where auth_user_id = auth.uid();
  if gid is null then
    raise exception 'No guest profile';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (guest_id, endpoint, p256dh, auth_key)
  values (gid, p_endpoint, p_p256dh, p_auth);
end;
$$;

revoke all on function public.save_push_subscription(text, text, text) from public;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
