-- Single and Private business trade accent colors. Vendor-clue squares
-- share one title so the booth name stays off the card.

update public.app_config
set theme_colors = theme_colors || jsonb_build_object(
  'single', theme_colors->'private',
  'private', theme_colors->'single'
)
where id = 1
  and theme_colors ? 'single'
  and theme_colors ? 'private';

update public.bingo_squares
set title = 'Vendor Clue'
where completion_mode = 'vendor_code';
