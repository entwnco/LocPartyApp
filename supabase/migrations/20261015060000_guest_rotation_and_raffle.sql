-- Each guest keeps the rotation that was next when they joined.
-- The raffle stays in the database, hidden until app_config.raffle_enabled.

alter table public.guests
  add column if not exists bingo_rotation jsonb;

alter table public.app_config
  add column if not exists raffle_enabled boolean not null default false;

update public.app_config
set hunt_body = replace(hunt_body, 'earn points and raffle entries', 'earn points')
where id = 1;

-- Existing guests take a slot in join order, then the cursors move on.
do $$
declare
  guest_row record;
  slot integer := 0;
  pool record;
  member_count integer;
begin
  for guest_row in
    select id from public.guests order by created_at, id
  loop
    update public.guests g
    set bingo_rotation = (
      select coalesce(jsonb_object_agg(r.pool_id, slot % counts.cnt), '{}'::jsonb)
      from public.bingo_rotation r
      join lateral (
        select count(*)::integer as cnt
        from public.bingo_pool_members m
        where m.pool_id = r.pool_id
      ) counts on counts.cnt > 0
    )
    where g.id = guest_row.id;
    slot := slot + 1;
  end loop;

  for pool in select pool_id from public.bingo_rotation loop
    select count(*)::integer into member_count
    from public.bingo_pool_members
    where pool_id = pool.pool_id;
    if member_count > 0 then
      update public.bingo_rotation
      set current_index = slot % member_count
      where pool_id = pool.pool_id;
    end if;
  end loop;
end $$;

alter table public.guests
  alter column bingo_rotation set default '{}'::jsonb;

update public.guests set bingo_rotation = '{}'::jsonb where bingo_rotation is null;

alter table public.guests
  alter column bingo_rotation set not null;

create or replace function public.assign_bingo_rotation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned jsonb := '{}'::jsonb;
  rec record;
  member_count integer;
begin
  for rec in
    select pool_id, current_index
    from public.bingo_rotation
    order by pool_id
    for update
  loop
    assigned := assigned || jsonb_build_object(rec.pool_id, rec.current_index);
    select count(*)::integer into member_count
    from public.bingo_pool_members
    where pool_id = rec.pool_id;
    if member_count > 0 then
      update public.bingo_rotation
      set current_index = (rec.current_index + 1) % member_count
      where pool_id = rec.pool_id;
    end if;
  end loop;

  new.bingo_rotation := assigned;
  return new;
end;
$$;

drop trigger if exists guests_assign_bingo_rotation on public.guests;
create trigger guests_assign_bingo_rotation
  before insert on public.guests
  for each row
  execute function public.assign_bingo_rotation();

create or replace function public.preserve_party_group()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.group_number := old.group_number;
  new.bingo_rotation := old.bingo_rotation;
  return new;
end;
$$;

create or replace function public.bingo_slot_position(p_pool_id text, p_offset integer, p_index integer)
returns integer
language sql
stable
as $$
  select case
    when cnt = 0 then null
    else (coalesce(p_index, 0) + coalesce(p_offset, 0)) % cnt
  end
  from (
    select count(*)::integer as cnt
    from public.bingo_pool_members m
    where m.pool_id = p_pool_id
  ) counts;
$$;

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
        end as assignment_detail
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
                'name', coalesce(v.name, gm.name),
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
  if sq.completion_mode <> 'vendor_code' then
    raise exception 'this square does not take a code';
  end if;
  if exists (select 1 from public.bingo_completions c where c.guest_id = gid and c.square_id = sq.id) then
    raise exception 'already completed';
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

drop function if exists public.bingo_slot_position(text, integer);
