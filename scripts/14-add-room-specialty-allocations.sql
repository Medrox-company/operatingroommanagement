-- Rozpis operačních oborů pro jednotlivé sály a kalendářní dny.
-- Každý řádek je vždy oddělen hospital_id a nelze jej číst přes jiný tenant JWT.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS room_specialty_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id text NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  operating_room_id text NOT NULL REFERENCES operating_rooms(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  allocation_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_specialty_allocations_unique_day
    UNIQUE (hospital_id, operating_room_id, allocation_date)
);

CREATE INDEX IF NOT EXISTS idx_room_specialty_allocations_hospital_date
  ON room_specialty_allocations (hospital_id, allocation_date);

CREATE INDEX IF NOT EXISTS idx_room_specialty_allocations_room_date
  ON room_specialty_allocations (hospital_id, operating_room_id, allocation_date);

ALTER TABLE room_specialty_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_specialty_allocations_tenant_isolation
  ON room_specialty_allocations;

CREATE POLICY room_specialty_allocations_tenant_isolation
  ON room_specialty_allocations
  FOR ALL TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id'))
  WITH CHECK (hospital_id = (auth.jwt() ->> 'hospital_id'));

REVOKE ALL ON room_specialty_allocations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON room_specialty_allocations TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE room_specialty_allocations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
