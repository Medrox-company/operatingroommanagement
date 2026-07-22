-- Rozdělení jednoho dne rozpisu sálu na dopolední a odpolední blok.
-- Existující celodenní přiřazení se bezpečně zkopírují do obou částí dne.

BEGIN;

DO $$
DECLARE
  day_part_was_missing boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'room_specialty_allocations'
      AND column_name = 'day_part'
  ) INTO day_part_was_missing;

  IF day_part_was_missing THEN
    ALTER TABLE room_specialty_allocations
      ADD COLUMN day_part text NOT NULL DEFAULT 'AM';
  END IF;

  ALTER TABLE room_specialty_allocations
    DROP CONSTRAINT IF EXISTS room_specialty_allocations_unique_day;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'room_specialty_allocations_day_part_check'
      AND conrelid = 'room_specialty_allocations'::regclass
  ) THEN
    ALTER TABLE room_specialty_allocations
      ADD CONSTRAINT room_specialty_allocations_day_part_check
      CHECK (day_part IN ('AM', 'PM'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'room_specialty_allocations_unique_slot'
      AND conrelid = 'room_specialty_allocations'::regclass
  ) THEN
    ALTER TABLE room_specialty_allocations
      ADD CONSTRAINT room_specialty_allocations_unique_slot
      UNIQUE (hospital_id, operating_room_id, allocation_date, day_part);
  END IF;

  IF day_part_was_missing THEN
    INSERT INTO room_specialty_allocations (
      hospital_id, operating_room_id, department_id, allocation_date,
      day_part, created_at, updated_at
    )
    SELECT
      hospital_id, operating_room_id, department_id, allocation_date,
      'PM', created_at, updated_at
    FROM room_specialty_allocations
    WHERE day_part = 'AM'
    ON CONFLICT (hospital_id, operating_room_id, allocation_date, day_part)
      DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_room_specialty_allocations_current_slot
  ON room_specialty_allocations (hospital_id, allocation_date, day_part, operating_room_id);

COMMIT;
