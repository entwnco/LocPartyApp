-- Games rotate onto their squares but do not use a code word.
-- Vendor words describe the craft, not the booth name.

alter table public.bingo_games alter column code_word drop not null;

update public.bingo_games set code_word = null;

update public.bingo_squares
set completion_mode = 'self'
where id in ('task-16', 'task-17');

update public.bingo_vendors
set code_word = case id
  when 'vendor-03' then 'RINSECLEAR'
  when 'vendor-04' then 'ORCHARD'
  when 'vendor-05' then 'PALMROLL'
  when 'vendor-06' then 'ROOTBEAT'
  when 'vendor-15' then 'CEDAR'
  when 'vendor-16' then 'LATHER'
  when 'vendor-17' then 'EMBERS'
  when 'vendor-18' then 'CLAY'
  when 'vendor-19' then 'CANOPY'
  when 'vendor-21' then 'NECTAR'
  else code_word
end
where id in (
  'vendor-03', 'vendor-04', 'vendor-05', 'vendor-06',
  'vendor-15', 'vendor-16', 'vendor-17', 'vendor-18', 'vendor-19', 'vendor-21'
);

create or replace function public.redeem_bingo_code(p_square_id text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  sq public.bingo_squares%rowtype;
  member record;
  expected text;
  normalized text;
begin
  select g.id into gid from public.guests g where g.auth_user_id = auth.uid();
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
    v.code_word as code_word
  into member
  from public.bingo_pool_members m
  join public.bingo_vendors v on v.id = m.vendor_id
  where m.pool_id = sq.pool_id
    and m.position = public.bingo_slot_position(sq.pool_id, sq.pool_offset);

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

revoke all on function public.redeem_bingo_code(text, text) from public;
grant execute on function public.redeem_bingo_code(text, text) to authenticated;
