-- Add completed_operations column to track finished operations for timeline display
ALTER TABLE operating_rooms 
ADD COLUMN IF NOT EXISTS completed_operations JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN operating_rooms.completed_operations IS 'Array of completed operations with their start/end times and status history for timeline display';
