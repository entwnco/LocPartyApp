-- Guests enter the booth code word, not the company name. Loc Shop
-- booths already had those words. The card rotates 2 loc, 2 body, and
-- 2 marketplace squares.

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

update public.bingo_vendor_riddles
set answer = case vendor_id
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
  else answer
end
where vendor_id in (
  'vendor-03', 'vendor-04', 'vendor-05', 'vendor-06',
  'vendor-15', 'vendor-16', 'vendor-17', 'vendor-18', 'vendor-19', 'vendor-21'
);

update public.bingo_squares
set prompt = 'Solve the riddle to find your booth. Enter the code word from that booth.'
where completion_mode = 'vendor_code';

update public.bingo_squares
set
  title = 'Marketplace Stop',
  prompt = 'Visit a marketplace booth and learn one thing they offer.',
  area = 'The Marketplace',
  completion_mode = 'self',
  pool_id = null,
  pool_offset = 0
where id = 'task-08';
