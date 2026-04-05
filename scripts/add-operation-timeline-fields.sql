-- Add operation_started_at and status_history columns to operating_rooms table
-- operation_started_at: stores when "Příjezd na sál" was activated (operation start)
-- status_history: JSON array storing history of status changes with timestamps

ALTER TABLE operating_rooms 
ADD COLUMN IF NOT EXISTS operation_started_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE operating_rooms 
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN operating_rooms.operation_started_at IS 'Timestamp when operation started (Příjezd na sál activated)';
COMMENT ON COLUMN operating_rooms.status_history IS 'JSON array of status changes: [{stepIndex: number, startedAt: string, color: string}]';
