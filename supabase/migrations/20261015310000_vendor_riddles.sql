-- Approved riddles live with the vendor. A square chooses one, and that
-- clue and answer are what the guest sees for the booth they were dealt.

create table public.bingo_vendor_riddles (
  id text primary key,
  vendor_id text not null references public.bingo_vendors (id) on delete cascade,
  clue text not null,
  answer text not null,
  sort_order integer not null default 0
);

alter table public.bingo_vendor_riddles enable row level security;
revoke all on public.bingo_vendor_riddles from public, anon, authenticated;

insert into public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) values
  ('riddle-01', 'vendor-01', $c$Got loc questions? Come and see,
How healthy your crown can be.
Tips and repair demos steal the show,
Find the booth that helps your locs glow.$c$, 'Beauty Fro', 1),
  ('riddle-03', 'vendor-03', $c$A house with no bedrooms, but plenty of care,
Named for a goddess, come find us there.
Buildup-free locs are our special delight,
Find the house that keeps your crown light.$c$, 'House of Isis', 3),
  ('riddle-04', 'vendor-04', $c$A green gemstone is part of my name,
Natural hair care is part of my game.
A three-letter first name completes your clue,
Find my booth, I'm waiting for you!$c$, 'Kim Jade', 4),
  ('riddle-05', 'vendor-05', $c$Some turn heads, but we spell ours with a Z,
Add LOC to the front—now who could we be?
Micro locs, interlocking, oils made to shine,
Find the booth with that name on the sign.$c$, 'LOC HEADZ', 5),
  ('riddle-15', 'vendor-15', $c$A key unlocks a door, it's true,
But mine brings lovely scents to you.
From body to car, there's fragrance to share,
Follow your nose and find me there.$c$, 'A Key Scent', 15),
  ('riddle-16', 'vendor-16', $c$Silky-smooth skin, a beautiful glow,
A touch of heaven from head to toe.
A little self-care, something divine,
Find the booth where beauty shines.$c$, 'Divinely Yu', 16),
  ('riddle-17', 'vendor-17', $c$Good vibes and sweet scents fill the air,
With oils and little charms for your hair.
A name that rhymes with "yes" is your clue,
Find the creative booth waiting for you.$c$, 'Jess Vibez Creations', 17),
  ('riddle-18', 'vendor-18', $c$My name has a scent, but soap steals the show,
Handmade with nature to help your skin glow.
Bars and body butters, all made with care,
Follow the freshness and find me there.$c$, 'Na''Scent Organics', 18),
  ('riddle-19', 'vendor-19', $c$From plants and petals, good things grow,
Little skincare must-haves help you glow.
Think of the outdoors and what you need,
Find the booth where nature takes the lead.$c$, 'Nature''s Essentials', 19),
  ('riddle-20', 'vendor-20', $c$Soft as velvet, sweet as a rose,
A lovely new fragrance delights your nose.
Body oils and perfumes fill the room,
Follow the scent of a flower in bloom.$c$, 'Velvet Bloom', 20),
  ('riddle-21', 'vendor-21', $c$You might think of bees when you hear my name,
But skin and body care is my game.
Add a little healing to the plot,
Then find the booth with the honey pot.$c$, 'The Healing Honeypot', 21),
  ('riddle-23', 'vendor-23', $c$A mighty elephant is part of my name,
But clothing and style are my claim to fame.
Follow the threads to see what's new,
A fresh fashion find is waiting for you.$c$, 'Indlovu Threads', 23),
  ('riddle-24', 'vendor-24', $c$💎 I sparkle on fingers, I shine on a chain,
Find me where treasures and jewels reign.
I'm pretty and precious, a glittery sight…
Find the spot where the gems shine bright! ✨$c$, 'M Rochelle Jewels', 24),
  ('riddle-25', 'vendor-25', $c$Three little letters begin my name,
Bonnets and scrunchies are part of my game.
Bags and keychains, treasures to show,
Find the shop with goodies to go!$c$, 'TPCOnlineShop.com', 25),
  ('riddle-26', 'vendor-26', $c$Beads at your waist, some shine on your wrist,
Locs get some love—don't miss this twist.
Three little letters will show you the way,
Find all these treasures on display.$c$, 'TYA', 26),
  ('riddle-27', 'vendor-27', $c$Images and streetwear come together just right,
With prints and keychains made bold and bright.
A name with two parts is part of the trail,
Find the creative booth called Ju-Nel.$c$, 'Ju-Nel', 27),
  ('riddle-28', 'vendor-28', $c$Red, gold, and green with roots running deep,
Culture and pride are treasures we keep.
Think of the city, then think of a man,
Put them together and find me if you can.$c$, 'Urban Rastaman', 28),
  ('riddle-29', 'vendor-29', $c$Some treasures sparkle, some treasures grow,
With leaves and roots they steal the show.
A gem of a find, fresh and green,
Discover the prettiest plants you've seen.$c$, 'Gemi Green', 29),
  ('riddle-30', 'vendor-30', $c$Not every gift comes wrapped in a bow,
Some shine in the people you come to know.
Big dreams and visions are part of the clue,
Find the nonprofit that believes in you.$c$, 'Gifted Ones', 30),
  ('riddle-32', 'vendor-32', $c$Some tea gets spilled, but there's no cup,
Just real-life wisdom to lift you up.
Big dreams and purpose are leading the way,
Find the booth with something to say.$c$, 'Spill the T.E.A.', 32);

update public.bingo_vendors v
set clue = r.clue, code_word = r.answer
from public.bingo_vendor_riddles r
where r.vendor_id = v.id;

update public.bingo_squares
set prompt = 'Solve the riddle to find your booth. The answer is the booth''s name.'
where completion_mode = 'vendor_code';

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
  if length(coalesce(p_clue, '')) > 800 then
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
    ), '[]'::jsonb),
    'riddles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'vendorId', r.vendor_id,
          'clue', r.clue,
          'answer', r.answer
        )
        order by r.sort_order
      )
      from public.bingo_vendor_riddles r
    ), '[]'::jsonb)
  );
end;
$$;
