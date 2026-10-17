-- Named games stay in the games rotation. Digital drops take a hidden
-- answer. Art and the look square take a photo. Four trivia questions
-- replace the connection squares that were removed.

alter table public.bingo_squares drop constraint if exists bingo_squares_completion_mode_check;
alter table public.bingo_squares add constraint bingo_squares_completion_mode_check
  check (completion_mode in ('vendor_code', 'game_code', 'self', 'photo', 'free', 'answer', 'true_false'));

update public.bingo_games
set name = 'Connect 4'
where id = 'connect-four';

update public.bingo_squares set
  title = 'Game Stop',
  prompt = 'Head to the game area and play a round of the game named on this square.',
  area = 'Game Stop',
  completion_mode = 'self',
  pool_id = 'games',
  pool_offset = 0
where id = 'task-16';

update public.bingo_squares set
  title = 'Next Game Stop',
  prompt = 'Head to the game area and play a round of the game named on this square.',
  area = 'Game Stop',
  completion_mode = 'self',
  pool_id = 'games',
  pool_offset = 1
where id = 'task-17';

update public.bingo_squares set
  title = 'Art Wall',
  prompt = 'Take a photo with a visual artist who inspires you.',
  area = 'Art',
  completion_mode = 'photo',
  pool_id = null,
  pool_offset = 0
where id = 'task-13';

update public.bingo_squares set
  title = 'Next Art Wall',
  prompt = 'Take a photo with a visual artist who inspires you.',
  area = 'Art',
  completion_mode = 'photo',
  pool_id = null,
  pool_offset = 0
where id = 'task-14';

update public.bingo_squares set
  title = 'Loc Party Look',
  prompt = 'Take a photo of your Loc Party look.',
  area = 'Look',
  completion_mode = 'photo',
  pool_id = null,
  pool_offset = 0
where id = 'task-18';

update public.bingo_squares set
  title = 'Who Sings the Anthem',
  prompt = 'Go to https://play.thelocpartyorlando.com/ and name who sings the Loc Party Anthem.',
  area = 'Internet',
  completion_mode = 'answer',
  pool_id = null,
  pool_offset = 0
where id = 'task-11';

update public.bingo_squares set
  title = 'Comment Bingo',
  prompt = 'On Instagram, open @thelocpartyorlando, find the Loc Party post, and comment BINGO. Enter the code you receive. Follow the page for live event updates.',
  area = 'Internet',
  completion_mode = 'answer',
  pool_id = null,
  pool_offset = 0
where id = 'task-12';

update public.bingo_squares set
  title = 'Company Name',
  prompt = 'What is the name of the company that produces The Loc Party?',
  area = 'Trivia',
  completion_mode = 'answer',
  pool_id = null,
  pool_offset = 0
where id = 'task-19';

update public.bingo_squares set
  title = 'Loc Pioneer',
  prompt = 'Who is one of the most recognized pioneers of dreadlocks in the U.S.?',
  area = 'Trivia',
  completion_mode = 'answer',
  pool_id = null,
  pool_offset = 0
where id = 'task-23';

update public.bingo_squares set
  title = 'Faster Growth',
  prompt = 'True or false: not washing your locs will make them grow faster.',
  area = 'Trivia',
  completion_mode = 'true_false',
  pool_id = null,
  pool_offset = 0
where id = 'task-15';

update public.bingo_squares set
  title = 'Conditioner',
  prompt = 'True or false: conditioner is bad for your locs.',
  area = 'Trivia',
  completion_mode = 'true_false',
  pool_id = null,
  pool_offset = 0
where id = 'task-24';

insert into public.bingo_square_answers (square_id, answer) values
  ('task-11', 'artist'),
  ('task-12', ''),
  ('task-19', 'Entwined'),
  ('task-23', 'Bob Marley'),
  ('task-15', 'FALSE'),
  ('task-24', 'FALSE')
on conflict (square_id) do update set answer = excluded.answer;

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
  if mode not in ('self', 'photo', 'vendor_code', 'answer', 'true_false') then
    raise exception 'Choose how this square is completed';
  end if;

  pool := nullif(trim(coalesce(p_pool_id, '')), '');
  stop_n := coalesce(p_pool_offset, 0);
  if mode in ('answer', 'true_false') then
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
  expected_norm text;
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

  if sq.completion_mode in ('answer', 'true_false') then
    select a.answer into expected
    from public.bingo_square_answers a
    where a.square_id = sq.id;
    normalized := public.normalize_bingo_code(p_code);
    expected_norm := public.normalize_bingo_code(expected);
    if expected is null or normalized = '' or not (
      normalized = expected_norm
      or (
        expected_norm = 'ENTWINED'
        and normalized in ('THEENTWINEDCOMPANY', 'ENTWINEDCOMPANY', 'ENTWINEDLOCSTUDIO')
      )
    ) then
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

create or replace function public.get_bingo_square_answers()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return coalesce(
    (select jsonb_object_agg(a.square_id, a.answer) from public.bingo_square_answers a),
    '{}'::jsonb
  );
end;
$$;

create or replace function public.set_bingo_square_answer(p_square_id text, p_answer text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mode text;
  stored text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select s.completion_mode into mode from public.bingo_squares s where s.id = p_square_id;
  if mode is null then
    raise exception 'unknown square';
  end if;
  if mode not in ('answer', 'true_false') then
    raise exception 'This square does not take a hidden answer';
  end if;
  if length(coalesce(p_answer, '')) > 80 then
    raise exception 'That answer is too long';
  end if;
  if mode = 'true_false' then
    stored := public.normalize_bingo_code(p_answer);
    if stored not in ('TRUE', 'FALSE') then
      raise exception 'Choose true or false';
    end if;
  else
    stored := trim(coalesce(p_answer, ''));
  end if;
  insert into public.bingo_square_answers (square_id, answer)
  values (p_square_id, stored)
  on conflict (square_id) do update set answer = excluded.answer;
end;
$$;

revoke all on function public.get_bingo_square_answers() from public;
revoke all on function public.set_bingo_square_answer(text, text) from public;
grant execute on function public.get_bingo_square_answers() to authenticated;
grant execute on function public.set_bingo_square_answer(text, text) to authenticated;
