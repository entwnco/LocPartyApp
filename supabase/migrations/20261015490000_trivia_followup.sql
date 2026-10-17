-- Extra trivia notes stay off the card until that guest finishes the square.

alter table public.bingo_square_answers
  add column if not exists note text not null default '';

update public.bingo_square_answers set note = 'False. Conditioner balances the pH of your hair, which prevents it from drying out and breaking. Rinse thoroughly.'
where square_id = 'task-24';

update public.bingo_square_answers set note = 'True. The hair really doesn''t need anything to loc but water and time. Water is really optional.'
where square_id = 'task-22';

create or replace function public.get_bingo_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  gid uuid;
  rotation jsonb;
begin
  select g.id, coalesce(g.bingo_rotation, '{}'::jsonb)
    into gid, rotation
  from public.guests g
  where g.auth_user_id = auth.uid();

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'prompt', s.prompt,
        'area', s.area,
        'points', s.points,
        'rowIndex', s.row_index,
        'colIndex', s.col_index,
        'completionMode', s.completion_mode,
        'assignmentName', a.assignment_name,
        'assignmentDetail', a.assignment_detail,
        'assignmentClue', a.assignment_clue,
        'completed', exists (
          select 1 from public.bingo_completions c
          where c.square_id = s.id and c.guest_id = gid
        ),
        'followUp', case
          when exists (
            select 1 from public.bingo_completions c
            where c.square_id = s.id and c.guest_id = gid
          ) then nullif((
            select n.note from public.bingo_square_answers n where n.square_id = s.id
          ), '')
          else null
        end
      )
      order by s.row_index, s.col_index
    )
    from public.bingo_squares s
    left join lateral (
      select
        coalesce(v.name, gm.name) as assignment_name,
        case
          when v.id is not null then v.description
          when gm.id is not null then 'Game Stop'
          else null
        end as assignment_detail,
        case
          when v.id is not null and coalesce(v.clue, '') <> '' then v.clue
          else null
        end as assignment_clue
      from public.bingo_pool_members m
      left join public.bingo_vendors v on v.id = m.vendor_id
      left join public.bingo_games gm on gm.id = m.game_id
      where m.pool_id = s.pool_id
        and m.position = public.bingo_slot_position(
          s.pool_id,
          s.pool_offset,
          coalesce((rotation ->> s.pool_id)::integer, 0)
        )
    ) a on true
  ), '[]'::jsonb);
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
  follow_up text;
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
    select a.answer, nullif(a.note, '') into expected, follow_up
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

    return jsonb_build_object(
      'squareId', sq.id,
      'points', sq.points,
      'title', sq.title,
      'followUp', follow_up
    );
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
