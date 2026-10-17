-- Wallpapers takes a typed answer. The answer lives in a table guests
-- cannot read, and it is not part of the bingo card payload.
-- Point redemption only accepts multiples of 50.

alter table public.bingo_squares drop constraint if exists bingo_squares_completion_mode_check;
alter table public.bingo_squares add constraint bingo_squares_completion_mode_check
  check (completion_mode in ('vendor_code', 'game_code', 'self', 'photo', 'free', 'answer'));

create table public.bingo_square_answers (
  square_id text primary key references public.bingo_squares (id) on delete cascade,
  answer text not null
);

alter table public.bingo_square_answers enable row level security;

create policy "admin reads square answers" on public.bingo_square_answers
  for select to authenticated
  using (public.is_admin());

update public.bingo_squares set
  prompt = 'Text this number and see how many wallpapers they offer.',
  completion_mode = 'answer',
  pool_id = null,
  pool_offset = 0
where id = 'task-10';

insert into public.bingo_square_answers (square_id, answer)
values ('task-10', '6');

create or replace function public.update_bingo_square(
  p_id text,
  p_title text,
  p_prompt text,
  p_area text,
  p_points integer,
  p_completion_mode text,
  p_pool_id text,
  p_pool_offset integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mode text;
  pool text;
  stop_n integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_id is null or not exists (select 1 from public.bingo_squares s where s.id = p_id) then
    raise exception 'unknown square';
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(p_title)) > 80 then
    raise exception 'Give the square a title';
  end if;
  if length(coalesce(p_prompt, '')) > 500 or length(coalesce(p_area, '')) > 40 then
    raise exception 'That text is too long';
  end if;
  if p_points is null or p_points < 0 or p_points > 500 then
    raise exception 'Points must be between 0 and 500';
  end if;

  if p_id = 'free' then
    update public.bingo_squares
    set
      title = trim(p_title),
      prompt = coalesce(p_prompt, ''),
      area = coalesce(nullif(trim(p_area), ''), 'Party'),
      points = p_points
    where id = 'free';
    return;
  end if;

  mode := p_completion_mode;
  if mode not in ('self', 'photo', 'vendor_code', 'answer') then
    raise exception 'Choose how this square is completed';
  end if;

  pool := nullif(trim(coalesce(p_pool_id, '')), '');
  stop_n := coalesce(p_pool_offset, 0);
  if mode = 'answer' then
    pool := null;
    stop_n := 0;
  elsif mode = 'vendor_code' and pool is null then
    raise exception 'An answer square needs a category';
  end if;
  if pool is not null then
    if not exists (select 1 from public.bingo_rotation r where r.pool_id = pool) then
      raise exception 'unknown category';
    end if;
    if stop_n < 0 or stop_n > 11 then
      raise exception 'Pick a stop in the rotation';
    end if;
    if mode = 'vendor_code' and exists (
      select 1 from public.bingo_pool_members m
      where m.pool_id = pool and m.game_id is not null
    ) then
      raise exception 'Games are marked done by the guest';
    end if;
  else
    stop_n := 0;
  end if;

  update public.bingo_squares
  set
    title = trim(p_title),
    prompt = coalesce(p_prompt, ''),
    area = coalesce(nullif(trim(p_area), ''), area),
    points = p_points,
    completion_mode = mode,
    pool_id = pool,
    pool_offset = stop_n
  where id = p_id;
end;
$$;

create or replace function public.redeem_bingo_code(p_square_id text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  rotation jsonb;
  sq public.bingo_squares%rowtype;
  member record;
  expected text;
  normalized text;
begin
  select g.id, coalesce(g.bingo_rotation, '{}'::jsonb)
    into gid, rotation
  from public.guests g
  where g.auth_user_id = auth.uid();
  if gid is null then
    raise exception 'no guest profile';
  end if;

  select * into sq from public.bingo_squares s where s.id = p_square_id;
  if sq.id is null then
    raise exception 'unknown square';
  end if;
  if exists (select 1 from public.bingo_completions c where c.guest_id = gid and c.square_id = sq.id) then
    raise exception 'already completed';
  end if;

  if sq.completion_mode = 'answer' then
    select a.answer into expected
    from public.bingo_square_answers a
    where a.square_id = sq.id;
    normalized := public.normalize_bingo_code(p_code);
    if expected is null or normalized = '' or normalized <> public.normalize_bingo_code(expected) then
      raise exception 'that answer does not complete this square';
    end if;

    insert into public.bingo_completions (guest_id, square_id, points)
    values (gid, sq.id, sq.points);

    if sq.points > 0 then
      insert into public.points_ledger (guest_id, source_key, amount, label)
      values (gid, 'bingo:' || sq.id, sq.points, sq.title);
    end if;

    return jsonb_build_object('squareId', sq.id, 'points', sq.points, 'title', sq.title);
  end if;

  if sq.completion_mode <> 'vendor_code' then
    raise exception 'this square does not take a code';
  end if;

  select
    m.vendor_id,
    m.game_id,
    coalesce(v.code_word, gm.code_word) as code_word
  into member
  from public.bingo_pool_members m
  left join public.bingo_vendors v on v.id = m.vendor_id
  left join public.bingo_games gm on gm.id = m.game_id
  where m.pool_id = sq.pool_id
    and m.position = public.bingo_slot_position(
      sq.pool_id,
      sq.pool_offset,
      coalesce((rotation ->> sq.pool_id)::integer, 0)
    );

  expected := member.code_word;
  normalized := public.normalize_bingo_code(p_code);
  if expected is null or normalized = '' or normalized <> public.normalize_bingo_code(expected) then
    raise exception 'that code does not complete this square';
  end if;

  insert into public.bingo_completions (guest_id, square_id, vendor_id, game_id, code_word, points)
  values (gid, sq.id, member.vendor_id, member.game_id, normalized, sq.points);

  if sq.points > 0 then
    insert into public.points_ledger (guest_id, source_key, amount, label)
    values (gid, 'bingo:' || sq.id, sq.points, sq.title);
  end if;

  return jsonb_build_object('squareId', sq.id, 'points', sq.points, 'title', sq.title);
end;
$$;

alter table public.point_redemptions drop constraint if exists point_redemptions_amount_check;
alter table public.point_redemptions add constraint point_redemptions_amount_check
  check (amount >= 50 and amount % 50 = 0);

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
  if p_amount is null or p_amount < 50 or p_amount % 50 <> 0 then
    raise exception 'Redeem in steps of 50.';
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
