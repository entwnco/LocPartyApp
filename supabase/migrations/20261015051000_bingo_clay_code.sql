-- BALM is too easy to hear as "bomb".

update public.bingo_vendors
set code_word = 'CLAY'
where id = 'vendor-18';
