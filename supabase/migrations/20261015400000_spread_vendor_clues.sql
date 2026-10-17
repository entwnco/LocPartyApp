-- Vendor clues were clustered on the left. Put one in each corner and
-- one on each side of the center square. Square ids stay put.
-- The unique cell constraint is dropped for the swap, then put back.

alter table public.bingo_squares drop constraint bingo_squares_row_index_col_index_key;

update public.bingo_squares as s
set row_index = m.row_index, col_index = m.col_index
from (values
  ('task-02', 4, 4),
  ('task-04', 4, 0),
  ('task-07', 2, 1),
  ('task-09', 2, 3),
  ('task-14', 0, 2),
  ('task-20', 2, 0),
  ('task-06', 1, 1),
  ('task-12', 3, 1)
) as m(id, row_index, col_index)
where s.id = m.id;

alter table public.bingo_squares
  add constraint bingo_squares_row_index_col_index_key unique (row_index, col_index);
