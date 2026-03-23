-- Add columns for real-time synchronized states
-- These states need to be shared across all devices instantly

-- is_paused: Whether the operation is currently paused
ALTER TABLE operating_rooms ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- patient_called_at: Timestamp when patient was called (null = not called yet)
ALTER TABLE operating_rooms ADD COLUMN IF NOT EXISTS patient_called_at TIMESTAMPTZ DEFAULT NULL;

-- patient_arrived_at: Timestamp when patient arrived (null = not arrived yet)
ALTER TABLE operating_rooms ADD COLUMN IF NOT EXISTS patient_arrived_at TIMESTAMPTZ DEFAULT NULL;

-- phase_started_at: Timestamp when the current phase started (for elapsed time sync)
ALTER TABLE operating_rooms ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ DEFAULT NOW();
