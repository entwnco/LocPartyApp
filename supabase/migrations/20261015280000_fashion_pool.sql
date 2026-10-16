-- Fashion, Accessories & Gifts rotates on its own, separate from The Loc Shop pools.

insert into public.bingo_rotation (pool_id, current_index)
values ('fashion', 0)
on conflict (pool_id) do nothing;

insert into public.bingo_pool_members (pool_id, position, vendor_id)
select 'fashion', row_number() over (order by sort_order) - 1, id
from public.bingo_vendors
where category_id = 'fashion-accessories-gifts'
on conflict (pool_id, position) do nothing;

alter table public.guests disable trigger guests_preserve_party_group;

with numbered as (
  select id, (row_number() over (order by created_at, id) - 1) as n
  from public.guests
),
sized as (
  select count(*)::integer as total
  from public.bingo_pool_members
  where pool_id = 'fashion'
)
update public.guests g
set bingo_rotation = g.bingo_rotation || jsonb_build_object('fashion', numbered.n % sized.total)
from numbered, sized
where g.id = numbered.id
  and sized.total > 0;

alter table public.guests enable trigger guests_preserve_party_group;

update public.bingo_rotation
set current_index = (
  select count(*)::integer % (
    select count(*)::integer from public.bingo_pool_members where pool_id = 'fashion'
  )
  from public.guests
)
where pool_id = 'fashion';

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
            when 'fashion' then 'Fashion, Accessories & Gifts'
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
