-- Staff can rewrite a square. Completions stay on the square id.
-- Clues and answers live on the booth. Pool membership stays put.

alter table public.bingo_vendors
  add column if not exists clue text not null default '';

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
  if mode not in ('self', 'photo', 'vendor_code') then
    raise exception 'Choose how this square is completed';
  end if;

  pool := nullif(trim(coalesce(p_pool_id, '')), '');
  stop_n := coalesce(p_pool_offset, 0);
  if mode = 'vendor_code' and pool is null then
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

create or replace function public.update_bingo_vendor_clue(
  p_vendor_id text,
  p_clue text,
  p_code_word text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  word text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from public.bingo_vendors v where v.id = p_vendor_id) then
    raise exception 'unknown booth';
  end if;
  if length(coalesce(p_clue, '')) > 300 then
    raise exception 'That clue is too long';
  end if;
  word := nullif(trim(coalesce(p_code_word, '')), '');
  if word is not null and length(word) > 40 then
    raise exception 'That answer is too long';
  end if;

  update public.bingo_vendors
  set clue = coalesce(p_clue, ''), code_word = word
  where id = p_vendor_id;
end;
$$;

revoke all on function public.update_bingo_square(text, text, text, text, integer, text, text, integer) from public;
revoke all on function public.update_bingo_vendor_clue(text, text, text) from public;
grant execute on function public.update_bingo_square(text, text, text, text, integer, text, text, integer) to authenticated;
grant execute on function public.update_bingo_vendor_clue(text, text, text) to authenticated;

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
        )
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

create or replace function public.get_bingo_staff_board()
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

  return jsonb_build_object(
    'squares', coalesce((
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
          'poolId', s.pool_id,
          'poolOffset', s.pool_offset,
          'assignmentName', a.assignment_name,
          'codeWord', a.code_word,
          'completionCount', (
            select count(*) from public.bingo_completions c where c.square_id = s.id
          )
        )
        order by s.row_index, s.col_index
      )
      from public.bingo_squares s
      left join lateral (
        select
          coalesce(v.name, gm.name) as assignment_name,
          coalesce(v.code_word, gm.code_word) as code_word
        from public.bingo_pool_members m
        left join public.bingo_vendors v on v.id = m.vendor_id
        left join public.bingo_games gm on gm.id = m.game_id
        where m.pool_id = s.pool_id
          and m.position = public.bingo_slot_position(
            s.pool_id,
            s.pool_offset,
            (select r.current_index from public.bingo_rotation r where r.pool_id = s.pool_id)
          )
      ) a on true
    ), '[]'::jsonb),
    'pools', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.pool_id,
          'label', case r.pool_id
            when 'loc-hair' then 'Loc & Hair Care'
            when 'body-care' then 'Body Care & Fragrance'
            when 'games' then 'Game Stop'
            else r.pool_id
          end,
          'currentIndex', r.current_index,
          'members', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'position', m.position,
                'vendorId', m.vendor_id,
                'name', coalesce(v.name, gm.name),
                'clue', coalesce(v.clue, ''),
                'codeWord', coalesce(v.code_word, gm.code_word),
                'onDuty', m.position = any (array(
                  select public.bingo_slot_position(r.pool_id, s.pool_offset, r.current_index)
                  from public.bingo_squares s
                  where s.pool_id = r.pool_id
                ))
              )
              order by m.position
            ), '[]'::jsonb)
            from public.bingo_pool_members m
            left join public.bingo_vendors v on v.id = m.vendor_id
            left join public.bingo_games gm on gm.id = m.game_id
            where m.pool_id = r.pool_id
          )
        )
        order by r.pool_id
      )
      from public.bingo_rotation r
    ), '[]'::jsonb)
  );
end;
$$;

alter publication supabase_realtime add table public.bingo_squares;
