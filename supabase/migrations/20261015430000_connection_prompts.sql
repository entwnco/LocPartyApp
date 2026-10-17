-- New Connection and One More Connection had a placeholder prompt.

update public.bingo_squares set
  prompt = 'Meet someone you have not talked to yet. Trade names and one reason you came to Loc Party.'
where id = 'task-19';

update public.bingo_squares set
  prompt = 'Find a different guest and swap one thing you want to do before the night is over.'
where id = 'task-15';
