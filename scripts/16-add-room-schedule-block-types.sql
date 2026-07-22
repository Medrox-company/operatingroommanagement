-- Systémové bloky rozpisu: běžný operační obor, uzavřený sál a servis.
-- Existující záznamy zůstávají beze změny jako SPECIALTY.

BEGIN;

ALTER TABLE room_specialty_allocations
  ALTER COLUMN department_id DROP NOT NULL;

ALTER TABLE room_specialty_allocations
  ADD COLUMN IF NOT EXISTS allocation_kind text NOT NULL DEFAULT 'SPECIALTY';

ALTER TABLE room_specialty_allocations
  DROP CONSTRAINT IF EXISTS room_specialty_allocations_kind_check;

ALTER TABLE room_specialty_allocations
  ADD CONSTRAINT room_specialty_allocations_kind_check
  CHECK (
    (allocation_kind = 'SPECIALTY' AND department_id IS NOT NULL)
    OR (allocation_kind IN ('CLOSED', 'SERVICE') AND department_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_room_specialty_allocations_kind
  ON room_specialty_allocations (hospital_id, allocation_date, allocation_kind);

COMMIT;
