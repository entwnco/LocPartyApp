-- Replace invented booth words with ones a guest can hear and spell.

update public.bingo_vendors
set code_word = case id
  when 'vendor-15' then 'CEDAR'
  when 'vendor-18' then 'CLAY'
  else code_word
end
where id in ('vendor-15', 'vendor-18');
