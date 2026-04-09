-- Fix skills sort_order to be sequential (0, 1, 2, ...)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order, created_at) - 1 AS new_order
  FROM skills
)
UPDATE skills SET sort_order = numbered.new_order
FROM numbered WHERE skills.id = numbered.id;

-- Fix experience sort_order to be sequential
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order, created_at) - 1 AS new_order
  FROM experience
)
UPDATE experience SET sort_order = numbered.new_order
FROM numbered WHERE experience.id = numbered.id;

-- Fix music_tracks sort_order to be sequential
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order, created_at) - 1 AS new_order
  FROM music_tracks
)
UPDATE music_tracks SET sort_order = numbered.new_order
FROM numbered WHERE music_tracks.id = numbered.id;
