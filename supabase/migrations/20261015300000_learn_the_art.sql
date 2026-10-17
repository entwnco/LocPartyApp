-- Ask the Artist sent guests to find a person. This square is a look at
-- the piece or the artist, marked by the guest.

update public.bingo_squares set
  title = 'Learn the Art',
  prompt = 'Learn something about a piece in the Gallerie, or about the artist who made it.'
where id = 'task-14';
