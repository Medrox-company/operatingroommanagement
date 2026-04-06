-- Import completed_operations from operating_rooms into room_status_history
-- This migration populates room_status_history with historical operation data
-- stored in the completed_operations JSONB column

-- Insert completed operations into room_status_history table
INSERT INTO room_status_history (
  id,
  operating_room_id,
  event_type,
  timestamp,
  step_name,
  duration_seconds,
  step_index,
  metadata,
  created_at
)
SELECT
  gen_random_uuid(),
  or_table.id,
  'operation_completed',
  (op->>'endedAt')::timestamp with time zone,
  COALESCE(op->>'name', 'Výkon'),
  EXTRACT(EPOCH FROM (
    (op->>'endedAt')::timestamp with time zone - 
    (op->>'startedAt')::timestamp with time zone
  ))::integer,
  0,
  jsonb_build_object(
    'startedAt', op->>'startedAt',
    'endedAt', op->>'endedAt',
    'name', op->>'name',
    'patient', op->>'patient',
    'procedure', op->>'procedure'
  ),
  NOW()
FROM operating_rooms or_table,
LATERAL jsonb_array_elements(or_table.completed_operations) AS op
WHERE or_table.completed_operations IS NOT NULL 
  AND jsonb_array_length(or_table.completed_operations) > 0
  AND (op->>'endedAt')::timestamp with time zone IS NOT NULL
ON CONFLICT DO NOTHING;
