-- Checked challenge proofs: the expected answer stays in a table guests
-- cannot read. Multiple-choice options stay on the challenge itself.

alter table public.challenges
  add column choices jsonb not null default '[]'::jsonb;

create table public.challenge_answers (
  challenge_id uuid primary key references public.challenges (id) on delete cascade,
  answer text not null default ''
);

alter table public.challenge_answers enable row level security;

create policy "admin all challenge answers"
  on public.challenge_answers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Guests can insert their own completions directly. Without this, a guest
-- could mark a secret code, QR scan, or multiple-choice challenge approved
-- and skip the check. Review-required proofs are forced back to pending.
create or replace function public.guard_guest_completion()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actual text;
begin
  select c.proof_type into actual
  from public.challenges c
  where c.id = new.challenge_id;

  if actual is null then
    raise exception 'This challenge is not available.';
  end if;

  if public.is_admin() or coalesce(current_setting('app.proof_checked', true), '') = '1' then
    return new;
  end if;

  new.proof_type := actual;

  if actual in ('secret_code', 'qr_scan', 'multiple_choice') then
    raise exception 'Submit that answer through the challenge check.';
  end if;

  if actual in ('photo_upload', 'video_upload', 'short_answer', 'admin_approval') then
    if tg_op = 'UPDATE' and old.status = 'approved' then
      raise exception 'That challenge is already complete.';
    end if;
    new.status := 'pending';
    new.reviewed_at := null;
    return new;
  end if;

  if actual = 'check_in' then
    new.status := 'approved';
    return new;
  end if;

  raise exception 'Unknown proof type.';
end;
$$;

create trigger guard_guest_completion
  before insert or update on public.completions
  for each row
  execute function public.guard_guest_completion();

create or replace function public.submit_checked_proof(p_challenge_id uuid, p_value text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  ch public.challenges%rowtype;
  expected text;
  given text;
  completion_id uuid;
begin
  select g.id into gid
  from public.guests g
  where g.auth_user_id = auth.uid();

  if gid is null then
    raise exception 'No guest profile.';
  end if;

  select * into ch
  from public.challenges c
  where c.id = p_challenge_id;

  if ch.id is null or not ch.active then
    raise exception 'This challenge is not available.';
  end if;

  if ch.proof_type not in ('secret_code', 'qr_scan', 'multiple_choice') then
    raise exception 'This challenge does not use a checked answer.';
  end if;

  if exists (
    select 1
    from public.completions c
    where c.guest_id = gid
      and c.challenge_id = ch.id
      and c.status = 'approved'
  ) then
    raise exception 'Already completed.';
  end if;

  select a.answer into expected
  from public.challenge_answers a
  where a.challenge_id = ch.id;

  if expected is null or trim(expected) = '' then
    raise exception 'This challenge is not set up yet.';
  end if;

  if ch.proof_type = 'multiple_choice' then
    given := trim(coalesce(p_value, ''));
    if given = '' or not exists (
      select 1
      from jsonb_array_elements_text(coalesce(ch.choices, '[]'::jsonb)) as opt(val)
      where trim(opt.val) = given
    ) then
      raise exception 'That is not one of the choices.';
    end if;
    if given <> trim(expected) then
      raise exception 'That is not the right answer.';
    end if;
  else
    given := public.normalize_bingo_code(p_value);
    if given = '' or given <> public.normalize_bingo_code(expected) then
      if ch.proof_type = 'qr_scan' then
        raise exception 'That code does not match this challenge.';
      end if;
      raise exception 'That code is not right.';
    end if;
  end if;

  perform set_config('app.proof_checked', '1', true);

  insert into public.completions (
    guest_id, challenge_id, proof_type, proof_payload, status, submitted_at, reviewed_at
  ) values (
    gid,
    ch.id,
    ch.proof_type,
    jsonb_build_object('type', ch.proof_type, 'matched', true),
    'approved',
    now(),
    now()
  )
  on conflict (guest_id, challenge_id) do update
    set proof_type = excluded.proof_type,
        proof_payload = excluded.proof_payload,
        status = 'approved',
        submitted_at = now(),
        reviewed_at = now()
  returning id into completion_id;

  perform set_config('app.proof_checked', '', true);

  return jsonb_build_object(
    'status', 'approved',
    'completionId', completion_id
  );
end;
$$;

revoke all on function public.submit_checked_proof(uuid, text) from public;
grant execute on function public.submit_checked_proof(uuid, text) to authenticated;

-- Placeholder vendor-visit challenge, when that seed row is already loaded.
insert into public.challenge_answers (challenge_id, answer)
select id, 'VENDOR'
from public.challenges
where id = '20000000-0000-4000-8000-000000000002'
on conflict (challenge_id) do nothing;
