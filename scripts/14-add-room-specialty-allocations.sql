-- Rozpis operačních oborů pro jednotlivé sály a kalendářní dny.
-- Každý řádek je vždy oddělen hospital_id a nelze jej číst přes jiný tenant JWT.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS room_specialty_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id text NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  operating_room_id text NOT NULL REFERENCES operating_rooms(id) ON DELETE CASCADE,
  department_id text REFERENCES departments(id) ON DELETE RESTRICT,
  allocation_date date NOT NULL,
  allocation_kind text NOT NULL DEFAULT 'SPECIALTY',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_specialty_allocations_unique_day
    UNIQUE (hospital_id, operating_room_id, allocation_date),
  CONSTRAINT room_specialty_allocations_kind_check
    CHECK (
      (allocation_kind = 'SPECIALTY' AND department_id IS NOT NULL)
      OR (allocation_kind IN ('CLOSED', 'SERVICE') AND department_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_room_specialty_allocations_hospital_date
  ON room_specialty_allocations (hospital_id, allocation_date);

CREATE INDEX IF NOT EXISTS idx_room_specialty_allocations_room_date
  ON room_specialty_allocations (hospital_id, operating_room_id, allocation_date);

CREATE INDEX IF NOT EXISTS idx_departments_hospital_active_name
  ON departments (hospital_id, is_active, name);

-- Každá nemocnice dostane vlastní obory odvozené pouze ze svých sálů.
-- Deterministické ID zajišťuje, že lze skript bezpečně spustit opakovaně.
INSERT INTO departments (
  id, hospital_id, name, description, is_active, accent_color
)
SELECT DISTINCT ON (r.hospital_id, lower(trim(r.department)))
  'department-' || md5(r.hospital_id || ':' || lower(trim(r.department))),
  r.hospital_id,
  trim(r.department),
  'Automaticky vytvořeno z konfigurace operačních sálů',
  true,
  '#38BDF8'
FROM operating_rooms r
WHERE r.department IS NOT NULL
  AND trim(r.department) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.hospital_id = r.hospital_id
      AND lower(trim(d.name)) = lower(trim(r.department))
  )
ON CONFLICT (id) DO NOTHING;

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
