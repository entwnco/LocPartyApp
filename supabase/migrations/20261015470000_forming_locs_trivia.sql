-- Connection Corner becomes the last trivia question.

update public.bingo_squares set
  title = 'Without Twisting',
  prompt = 'True or false: locs can be formed without twisting or palm rolling.',
  area = 'Trivia',
  completion_mode = 'true_false',
  pool_id = null,
  pool_offset = 0
where id = 'task-22';

insert into public.bingo_square_answers (square_id, answer) values
  ('task-22', 'TRUE')
on conflict (square_id) do update set answer = excluded.answer;
