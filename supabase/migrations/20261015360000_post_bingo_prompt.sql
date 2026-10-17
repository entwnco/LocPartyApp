-- The Post Bingo square should not tell guests that following is optional.

update public.bingo_squares
set prompt = 'Post "bingo" under a Loc Party post.'
where id = 'task-12';
