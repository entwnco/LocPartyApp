-- The working card from docs/bingo-card.md. Square ids stay put, so a
-- completion already recorded on a square remains completed.

update public.bingo_squares set
  title = 'Loc Booth',
  prompt = 'Visit the loc-care booth on this square and ask for their word.',
  area = 'The Loc Shop',
  points = 20,
  completion_mode = 'vendor_code',
  pool_id = 'loc-hair',
  pool_offset = 0
where id = 'task-01';

update public.bingo_squares set
  title = 'Next Loc Booth',
  prompt = 'Visit the loc-care booth on this square and ask for their word.',
  area = 'The Loc Shop',
  points = 20,
  completion_mode = 'vendor_code',
  pool_id = 'loc-hair',
  pool_offset = 1
where id = 'task-02';

update public.bingo_squares set
  title = 'Body Booth',
  prompt = 'Visit the body-care booth on this square and ask for their word.',
  area = 'The Loc Shop',
  points = 20,
  completion_mode = 'vendor_code',
  pool_id = 'body-care',
  pool_offset = 0
where id = 'task-03';

update public.bingo_squares set
  title = 'Next Body Booth',
  prompt = 'Visit the body-care booth on this square and ask for their word.',
  area = 'The Loc Shop',
  points = 20,
  completion_mode = 'vendor_code',
  pool_id = 'body-care',
  pool_offset = 1
where id = 'task-07';

update public.bingo_squares set
  title = 'Third Body Booth',
  prompt = 'Visit the body-care booth on this square and ask for their word.',
  area = 'The Loc Shop',
  points = 20,
  completion_mode = 'vendor_code',
  pool_id = 'body-care',
  pool_offset = 2
where id = 'task-08';

update public.bingo_squares set
  title = 'Fashion Booth',
  prompt = 'Visit the fashion booth on this square and ask for their word.',
  area = 'Marketplace',
  points = 20,
  completion_mode = 'vendor_code',
  pool_id = 'fashion',
  pool_offset = 0
where id = 'task-04';

update public.bingo_squares set
  title = 'Next Fashion Booth',
  prompt = 'Visit the fashion booth on this square and ask for their word.',
  area = 'Marketplace',
  points = 20,
  completion_mode = 'vendor_code',
  pool_id = 'fashion',
  pool_offset = 1
where id = 'task-09';

update public.bingo_squares set
  title = 'Wallpapers',
  prompt = 'Text 3213406734 and see how many wallpapers they offer.',
  area = 'Internet',
  points = 20,
  completion_mode = 'self',
  pool_id = null,
  pool_offset = 0
where id = 'task-10';

update public.bingo_squares set
  title = 'Who Wrote the Song',
  prompt = 'Find out who wrote the song.',
  area = 'Internet',
  points = 20,
  completion_mode = 'self',
  pool_id = null,
  pool_offset = 0
where id = 'task-11';

update public.bingo_squares set
  title = 'Post Bingo',
  prompt = 'Post "bingo" under a Loc Party post. Following is optional.',
  area = 'Internet',
  points = 20,
  completion_mode = 'self',
  pool_id = null,
  pool_offset = 0
where id = 'task-12';

update public.bingo_squares set
  title = 'New Connection',
  prompt = 'This guest-to-guest prompt is still being written.',
  area = 'Social',
  points = 20,
  completion_mode = 'self',
  pool_id = null,
  pool_offset = 0
where id = 'task-19';

update public.bingo_squares set
  title = 'One More Connection',
  prompt = 'This guest-to-guest prompt is still being written.',
  area = 'Social',
  points = 20,
  completion_mode = 'self',
  pool_id = null,
  pool_offset = 0
where id = 'task-15';

update public.bingo_squares set
  title = 'Free Space Free Gift!',
  prompt = 'Head over to Entwined Loc Studio for your free gift.',
  area = 'Party',
  points = 0,
  completion_mode = 'free',
  pool_id = null,
  pool_offset = 0
where id = 'free';

update public.bingo_squares set
  completion_mode = 'self',
  pool_id = 'games',
  pool_offset = 0
where id = 'task-16';

update public.bingo_squares set
  completion_mode = 'self',
  pool_id = 'games',
  pool_offset = 1
where id = 'task-17';
