-- Local-only bingo board: 25 fixed squares, rotating loc-shop vendors
-- and Game Stop games. Do not push this to the hosted project.

create table public.bingo_vendors (
  id text primary key,
  name text not null,
  description text not null default '',
  category_id text not null,
  category_label text not null,
  station_id text,
  station_label text,
  code_word text unique,
  rotation_eligible boolean not null default false,
  attending boolean not null default true,
  sort_order integer not null
);

create table public.bingo_games (
  id text primary key,
  name text not null,
  code_word text unique,
  sort_order integer not null
);

create table public.bingo_squares (
  id text primary key,
  title text not null,
  prompt text not null,
  area text not null,
  points integer not null default 0,
  row_index smallint not null check (row_index between 0 and 4),
  col_index smallint not null check (col_index between 0 and 4),
  completion_mode text not null check (completion_mode in ('vendor_code', 'game_code', 'self', 'photo', 'free')),
  pool_id text,
  pool_offset smallint not null default 0,
  unique (row_index, col_index)
);

create table public.bingo_rotation (
  pool_id text primary key,
  current_index integer not null default 0 check (current_index >= 0)
);

create table public.bingo_pool_members (
  pool_id text not null references public.bingo_rotation (pool_id) on delete cascade,
  position integer not null check (position >= 0),
  vendor_id text references public.bingo_vendors (id),
  game_id text references public.bingo_games (id),
  primary key (pool_id, position),
  check ((vendor_id is not null) <> (game_id is not null))
);

create table public.bingo_completions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  square_id text not null references public.bingo_squares (id),
  vendor_id text references public.bingo_vendors (id),
  game_id text references public.bingo_games (id),
  code_word text,
  photo_data text,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (guest_id, square_id)
);

create or replace function public.normalize_bingo_code(raw text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.bingo_slot_position(p_pool_id text, p_offset integer)
returns integer
language sql
stable
as $$
  select case
    when cnt = 0 then null
    else (r.current_index + coalesce(p_offset, 0)) % cnt
  end
  from public.bingo_rotation r
  cross join lateral (
    select count(*)::integer as cnt
    from public.bingo_pool_members m
    where m.pool_id = p_pool_id
  ) counts
  where r.pool_id = p_pool_id;
$$;

-- Vendors attending the event. Code words exist only for the loc-shop rotation.
insert into public.bingo_vendors (
  id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order
) values
  ('vendor-01', 'Beauty Fro', 'Consultations, repair demos, loc care tips', 'loc-hair-care', 'Loc & Hair Care', 'marketplace', 'The Marketplace', null, false, true, 1),
  ('vendor-02', 'Entwined Loc Studio', 'Loc studio', 'loc-hair-care', 'Loc & Hair Care', 'marketplace', 'The Marketplace', null, false, true, 2),
  ('vendor-03', 'House of Isis', 'Buildup-free loc care and natural hair products', 'loc-hair-care', 'Loc & Hair Care', 'loc-shop', 'The Loc Shop', 'RINSECLEAR', true, true, 3),
  ('vendor-04', 'Kim Jade', 'Natural organic hair care', 'loc-hair-care', 'Loc & Hair Care', 'loc-shop', 'The Loc Shop', 'ORCHARD', true, true, 4),
  ('vendor-05', 'LOC HEADZ', 'Micro locs, interlocking, and oils', 'loc-hair-care', 'Loc & Hair Care', 'loc-shop', 'The Loc Shop', 'PALMROLL', true, true, 5),
  ('vendor-06', 'Natural Hair Really Rocks by Moemo', 'Natural hair products', 'loc-hair-care', 'Loc & Hair Care', 'loc-shop', 'The Loc Shop', 'ROOTBEAT', true, true, 6),
  ('vendor-07', 'The Loc Opulence', 'Loc stylist', 'loc-hair-care', 'Loc & Hair Care', 'marketplace', 'The Marketplace', null, false, true, 7),
  ('vendor-08', 'A3 Confections', 'Croffles with toppings', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', null, false, true, 8),
  ('vendor-09', 'Brothers Millennial', 'Real fruit popsicles', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', null, false, true, 9),
  ('vendor-10', 'Candyland Designs', 'Couture cakes and cocktails', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', null, false, true, 10),
  ('vendor-11', 'Chelsea''s Snatchin'' Kitchen', 'Wings, burgers, hot dogs, fries, sodas, cookies', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', null, false, true, 11),
  ('vendor-12', 'D³ Cuisines', 'Caribbean-Southern bowls, seafood rice, juices', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', null, false, true, 12),
  ('vendor-13', 'Kitchen Arrabon', 'Cakes, cookies, baked goods', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', null, false, true, 13),
  ('vendor-14', 'The Flavor District', '$5 cakes', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', null, false, true, 14),
  ('vendor-15', 'A Key Scent', 'Body care, teas, skincare, car fragrance', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'CEDAR', true, true, 15),
  ('vendor-16', 'Aly Divinely Yu', 'Hair oils, body oils, lotions, soaps', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'LATHER', true, true, 16),
  ('vendor-17', 'Jess Vibez Creations', 'Oils, body butters, incense, hair charms', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'EMBERS', true, true, 17),
  ('vendor-18', 'Na'' Scent Organics', 'Handmade skincare', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'CLAY', true, true, 18),
  ('vendor-19', 'Nature''s Essentials', 'Skin care', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'CANOPY', true, true, 19),
  ('vendor-20', 'Velvet Bloom', 'Perfume and body oils', 'body-care-fragrance', 'Body Care & Fragrance', 'marketplace', 'The Marketplace', null, false, true, 20),
  ('vendor-21', 'The Healing Honeypot', 'Skin and body care', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'NECTAR', true, true, 21),
  ('vendor-22', 'Adina Kajoy', 'Beauty, fashion, and lifestyle', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', null, false, true, 22),
  ('vendor-23', 'Indlovu Threads', 'Clothing', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', null, false, true, 23),
  ('vendor-24', 'M Rochelle Jewels', 'Jewelry', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', null, false, true, 24),
  ('vendor-25', 'TPCOnlineShop.com', 'Bonnets, scrunchies, bags, keychains', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', null, false, true, 25),
  ('vendor-26', 'TYA', 'Waist beads, bracelets, and loc products', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', null, false, true, 26),
  ('vendor-27', 'Ju-Nel', 'Luxury street energy', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', null, false, true, 27),
  ('vendor-28', 'Urban Rastaman', 'Rasta culture', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', null, false, true, 28),
  ('vendor-29', 'Gemi Green', 'Plants', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', null, false, true, 29),
  ('vendor-30', 'Gifted Ones', 'Visionary non-profit', 'community-services', 'Community & Services', 'game-stop', 'Game Stop', null, false, true, 30),
  ('vendor-32', 'Spill the T.E.A.', 'Soulful, strategic living', 'community-services', 'Community & Services', 'game-stop', 'Game Stop', null, false, true, 31),
  ('vendor-33', 'Tat Like Tattoo', 'Selling lemonade', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', null, false, true, 32);

insert into public.bingo_games (id, name, sort_order) values
  ('hopscotch', 'Hopscotch', 1),
  ('double-dutch', 'Double Dutch', 2),
  ('connect-four', 'Connect Four', 3),
  ('jenga', 'Jenga', 4),
  ('cornhole', 'Cornhole', 5);

insert into public.bingo_rotation (pool_id, current_index) values
  ('loc-hair', 0),
  ('body-care', 0),
  ('games', 0);

insert into public.bingo_pool_members (pool_id, position, vendor_id) values
  ('loc-hair', 0, 'vendor-03'),
  ('loc-hair', 1, 'vendor-04'),
  ('loc-hair', 2, 'vendor-05'),
  ('loc-hair', 3, 'vendor-06'),
  ('body-care', 0, 'vendor-15'),
  ('body-care', 1, 'vendor-16'),
  ('body-care', 2, 'vendor-17'),
  ('body-care', 3, 'vendor-18'),
  ('body-care', 4, 'vendor-19'),
  ('body-care', 5, 'vendor-21');

insert into public.bingo_pool_members (pool_id, position, game_id) values
  ('games', 0, 'hopscotch'),
  ('games', 1, 'double-dutch'),
  ('games', 2, 'connect-four'),
  ('games', 3, 'jenga'),
  ('games', 4, 'cornhole');

insert into public.bingo_squares (
  id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset
) values
  ('task-01', 'Loc-Care Insider', 'Visit a loc-care booth and ask for one tip you can use in your routine.', 'Marketplace', 20, 0, 0, 'vendor_code', 'loc-hair', 0),
  ('task-21', 'Loc Stories', 'Exchange a loc journey, care tip, or style question with another guest.', 'Social', 30, 0, 1, 'self', null, 0),
  ('task-02', 'Flavor Finder', 'Visit a food booth and ask which item they recommend for a first-time customer.', 'Marketplace', 20, 0, 2, 'self', null, 0),
  ('task-13', 'Art Walk', 'Explore the Gallerie and choose the piece that first catches your attention.', 'Gallerie', 10, 0, 3, 'self', null, 0),
  ('task-03', 'Scent & Self-Care', 'Visit a skin, body, or fragrance booth and learn about one product that interests you.', 'Marketplace', 20, 0, 4, 'vendor_code', 'body-care', 0),
  ('task-16', 'Opening Move', 'Join a game and learn another player''s name.', 'Game Stop', 20, 1, 0, 'self', 'games', 0),
  ('task-07', 'Local Love', 'Ask a vendor what inspired them to start their business.', 'Marketplace', 30, 1, 1, 'self', null, 0),
  ('task-22', 'Connection Corner', 'Find something in common with someone you have not met.', 'Social', 20, 1, 2, 'self', null, 0),
  ('task-08', 'Insider Find', 'Ask a vendor which product or service deserves more attention — and why.', 'Marketplace', 30, 1, 3, 'self', null, 0),
  ('task-18', 'Selfie Season', 'Create a photo or pose at the station. A no-face version counts; posting is optional.', 'Creations', 10, 1, 4, 'photo', null, 0),
  ('task-04', 'Style Your Locs', 'Visit a fashion or accessories booth and find something you would pair with your look.', 'Marketplace', 20, 2, 0, 'self', null, 0),
  ('task-14', 'Ask the Artist', 'Ask an artist or attendant about the inspiration or technique behind a piece.', 'Gallerie', 30, 2, 1, 'self', null, 0),
  ('free', 'FREE SPACE', 'Welcome to Loc Party!', 'Party', 0, 2, 2, 'free', null, 0),
  ('task-20', 'Cool Down', 'Stop at Libations, check out what is available, and take a breather. No purchase required.', 'Libations', 10, 2, 3, 'self', null, 0),
  ('task-05', 'Community Connection', 'Visit a community organization and learn what they offer or how to get involved.', 'Marketplace', 20, 2, 4, 'self', null, 0),
  ('task-19', 'Duo Content', 'Create something at the station with another guest. Get their permission before photographing or sharing them.', 'Creations', 20, 3, 0, 'photo', null, 0),
  ('task-09', 'Made With Love', 'Ask a vendor how one of their products is made, selected, or designed.', 'Marketplace', 20, 3, 1, 'self', null, 0),
  ('task-17', 'Good Sport Award', 'Play a round and thank your opponent or teammates afterward.', 'Game Stop', 20, 3, 2, 'self', 'games', 1),
  ('task-10', 'Gift for Someone Special', 'Find a potential gift and ask the vendor what makes it a good choice.', 'Marketplace', 20, 3, 3, 'self', null, 0),
  ('task-23', 'Pass the Energy', 'Give someone a sincere compliment about their style, creativity, or contribution to the party.', 'Social', 20, 3, 4, 'self', null, 0),
  ('task-06', 'Hidden Gem', 'Stop at a booth you had not planned to visit and discover what they offer.', 'Marketplace', 20, 4, 0, 'self', null, 0),
  ('task-15', 'Agree to Disagree', 'Compare your interpretation of a piece with another guest''s.', 'Gallerie', 20, 4, 1, 'self', null, 0),
  ('task-11', 'Compare Notes', 'Swap favorite booth recommendations with another guest, then visit their pick.', 'Marketplace', 30, 4, 2, 'self', null, 0),
  ('task-24', 'Party Pulse', 'Ask another guest which song belongs on the Loc Party playlist.', 'Social', 20, 4, 3, 'self', null, 0),
  ('task-12', 'Keep in Touch', 'Find out how to reconnect with a business you liked after Loc Party. Saving their details is optional.', 'Marketplace', 20, 4, 4, 'self', null, 0);

delete from public.vendors
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);

insert into public.vendors (name, category, description, location, is_featured, active, sort_order)
select
  b.name,
  b.category_label,
  b.description,
  coalesce(b.station_label, ''),
  b.rotation_eligible,
  true,
  b.sort_order
from public.bingo_vendors b
where b.attending
  and not exists (select 1 from public.vendors v where v.name = b.name);

create or replace function public.get_bingo_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select g.id into gid from public.guests g where g.auth_user_id = auth.uid();

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
        and m.position = public.bingo_slot_position(s.pool_id, s.pool_offset)
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
          and m.position = public.bingo_slot_position(s.pool_id, s.pool_offset)
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
                  select public.bingo_slot_position(r.pool_id, s.pool_offset)
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
    coalesce(v.code_word, gm.code_word) as code_word
  into member
  from public.bingo_pool_members m
  left join public.bingo_vendors v on v.id = m.vendor_id
  left join public.bingo_games gm on gm.id = m.game_id
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

create or replace function public.complete_bingo_square(p_square_id text, p_photo text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  sq public.bingo_squares%rowtype;
begin
  select g.id into gid from public.guests g where g.auth_user_id = auth.uid();
  if gid is null then
    raise exception 'no guest profile';
  end if;

  select * into sq from public.bingo_squares s where s.id = p_square_id;
  if sq.id is null then
    raise exception 'unknown square';
  end if;
  if sq.completion_mode not in ('self', 'photo', 'free') then
    raise exception 'this square needs the code from the booth on duty';
  end if;
  if sq.completion_mode = 'photo' and length(coalesce(p_photo, '')) < 32 then
    raise exception 'a photo is required for this square';
  end if;
  if exists (select 1 from public.bingo_completions c where c.guest_id = gid and c.square_id = sq.id) then
    return jsonb_build_object('squareId', sq.id, 'points', 0, 'title', sq.title, 'already', true);
  end if;

  insert into public.bingo_completions (guest_id, square_id, photo_data, points)
  values (gid, sq.id, case when sq.completion_mode = 'photo' then p_photo else null end, sq.points);

  if sq.points > 0 then
    insert into public.points_ledger (guest_id, source_key, amount, label)
    values (gid, 'bingo:' || sq.id, sq.points, sq.title);
  end if;

  return jsonb_build_object('squareId', sq.id, 'points', sq.points, 'title', sq.title, 'already', false);
end;
$$;

create or replace function public.advance_bingo_pool(p_pool_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  member_count integer;
  next_index integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select count(*)::integer into member_count
  from public.bingo_pool_members
  where pool_id = p_pool_id;
  if member_count = 0 then
    raise exception 'unknown rotation';
  end if;

  update public.bingo_rotation
  set current_index = (current_index + 1) % member_count
  where pool_id = p_pool_id
  returning current_index into next_index;

  if next_index is null then
    raise exception 'unknown rotation';
  end if;

  return jsonb_build_object('poolId', p_pool_id, 'currentIndex', next_index);
end;
$$;

revoke all on function public.normalize_bingo_code(text) from public;
revoke all on function public.bingo_slot_position(text, integer) from public;
revoke all on function public.get_bingo_board() from public;
revoke all on function public.get_bingo_staff_board() from public;
revoke all on function public.redeem_bingo_code(text, text) from public;
revoke all on function public.complete_bingo_square(text, text) from public;
revoke all on function public.advance_bingo_pool(text) from public;

grant execute on function public.get_bingo_board() to authenticated;
grant execute on function public.redeem_bingo_code(text, text) to authenticated;
grant execute on function public.complete_bingo_square(text, text) to authenticated;
grant execute on function public.get_bingo_staff_board() to authenticated;
grant execute on function public.advance_bingo_pool(text) to authenticated;

alter table public.bingo_vendors enable row level security;
alter table public.bingo_games enable row level security;
alter table public.bingo_squares enable row level security;
alter table public.bingo_rotation enable row level security;
alter table public.bingo_pool_members enable row level security;
alter table public.bingo_completions enable row level security;

create policy "admin reads bingo vendors" on public.bingo_vendors
  for select to authenticated using (public.is_admin());
create policy "admin reads bingo games" on public.bingo_games
  for select to authenticated using (public.is_admin());
create policy "read bingo squares" on public.bingo_squares
  for select to authenticated using (true);
create policy "admin reads bingo rotation" on public.bingo_rotation
  for select to authenticated using (public.is_admin());
create policy "admin reads bingo pool members" on public.bingo_pool_members
  for select to authenticated using (public.is_admin());
create policy "read own bingo completions" on public.bingo_completions
  for select to authenticated using (
    public.is_admin()
    or guest_id in (select g.id from public.guests g where g.auth_user_id = auth.uid())
  );

alter publication supabase_realtime add table
  public.bingo_rotation,
  public.bingo_completions;
