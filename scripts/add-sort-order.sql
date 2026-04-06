-- Add sort_order column to operating_rooms table
ALTER TABLE operating_rooms
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for sort_order for better performance
CREATE INDEX IF NOT EXISTS idx_operating_rooms_sort_order ON operating_rooms(sort_order);

-- Initialize sort_order based on creation order if not set
WITH ranked_rooms AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_sort_order
  FROM operating_rooms
  WHERE sort_order = 0
)
UPDATE operating_rooms
SET sort_order = ranked_rooms.new_sort_order
FROM ranked_rooms
WHERE operating_rooms.id = ranked_rooms.id;
