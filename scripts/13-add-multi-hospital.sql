-- Multi-hospital support. Existing data is assigned to the original hospital.
-- Celá migrace je atomická: při jakékoli chybě PostgreSQL provede rollback.
BEGIN;
CREATE TABLE IF NOT EXISTS hospitals (
  id text PRIMARY KEY,
  hospital_name text NOT NULL,
  hospital_short_name text,
  hospital_address text,
  hospital_city text,
  hospital_zip text,
  hospital_country text DEFAULT 'Česká republika',
  hospital_ico text,
  hospital_contact_phone text,
  hospital_contact_email text,
  hospital_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Skript je samostatný: není nutné předem spouštět migraci 08.
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS hospital_name text,
  ADD COLUMN IF NOT EXISTS hospital_short_name text,
  ADD COLUMN IF NOT EXISTS hospital_address text,
  ADD COLUMN IF NOT EXISTS hospital_city text,
  ADD COLUMN IF NOT EXISTS hospital_zip text,
  ADD COLUMN IF NOT EXISTS hospital_country text DEFAULT 'Česká republika',
  ADD COLUMN IF NOT EXISTS hospital_ico text,
  ADD COLUMN IF NOT EXISTS hospital_contact_phone text,
  ADD COLUMN IF NOT EXISTS hospital_contact_email text,
  ADD COLUMN IF NOT EXISTS hospital_notes text;

-- Kompatibilita s databází, kde už byla spuštěna starší migrace používající
-- původní anglické označení. Hodnoty se pouze zkopírují, nic se nemaže.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_settings'
      AND column_name = 'facility_name'
  ) THEN
    EXECUTE $copy$
      UPDATE app_settings SET
        hospital_name = COALESCE(hospital_name, facility_name),
        hospital_short_name = COALESCE(hospital_short_name, facility_short_name),
        hospital_address = COALESCE(hospital_address, facility_address),
        hospital_city = COALESCE(hospital_city, facility_city),
        hospital_zip = COALESCE(hospital_zip, facility_zip),
        hospital_country = COALESCE(hospital_country, facility_country),
        hospital_ico = COALESCE(hospital_ico, facility_ico),
        hospital_contact_phone = COALESCE(hospital_contact_phone, facility_contact_phone),
        hospital_contact_email = COALESCE(hospital_contact_email, facility_contact_email),
        hospital_notes = COALESCE(hospital_notes, facility_notes)
    $copy$;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS hospital_user_memberships (
  hospital_id text NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hospital_id, user_id)
);

INSERT INTO hospitals (
  id, hospital_name, hospital_short_name, hospital_address, hospital_city,
  hospital_zip, hospital_country, hospital_ico, hospital_contact_phone,
  hospital_contact_email, hospital_notes
)
SELECT 'default', COALESCE(hospital_name, 'Výchozí zdravotnické zařízení'),
       hospital_short_name, hospital_address, hospital_city, hospital_zip,
       hospital_country, hospital_ico, hospital_contact_phone,
       hospital_contact_email, hospital_notes
FROM app_settings WHERE id = 'default'
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospitals (id, hospital_name)
VALUES ('default', 'Výchozí zdravotnické zařízení')
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_user_memberships (hospital_id, user_id)
SELECT 'default', id::text FROM app_users
ON CONFLICT DO NOTHING;

ALTER TABLE operating_rooms ADD COLUMN IF NOT EXISTS hospital_id text;
UPDATE operating_rooms SET hospital_id = 'default' WHERE hospital_id IS NULL;
ALTER TABLE operating_rooms ALTER COLUMN hospital_id SET DEFAULT 'default';
ALTER TABLE operating_rooms ALTER COLUMN hospital_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE operating_rooms
    ADD CONSTRAINT operating_rooms_hospital_id_fkey
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_operating_rooms_hospital_sort
  ON operating_rooms(hospital_id, sort_order);

-- Statistiky a konfigurační data musí nést stejný tenant klíč jako sály.
ALTER TABLE IF EXISTS room_status_history ADD COLUMN IF NOT EXISTS hospital_id text;
DO $$ BEGIN
  IF to_regclass('public.room_status_history') IS NOT NULL THEN
    UPDATE room_status_history h SET hospital_id = r.hospital_id
    FROM operating_rooms r
    WHERE h.operating_room_id = r.id AND h.hospital_id IS NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS notifications_log ADD COLUMN IF NOT EXISTS hospital_id text;
DO $$ BEGIN
  IF to_regclass('public.notifications_log') IS NOT NULL THEN
    UPDATE notifications_log n SET hospital_id = r.hospital_id
    FROM operating_rooms r
    WHERE n.room_id = r.id AND n.hospital_id IS NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS staff ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS departments ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS sub_departments ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS schedules ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS shift_schedules ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS equipment ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS devices ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS procedures ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS management_contacts ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS workflow_statuses ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS app_modules ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS app_settings ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS safety_checklists ADD COLUMN IF NOT EXISTS hospital_id text;
ALTER TABLE IF EXISTS operating_procedures ADD COLUMN IF NOT EXISTS hospital_id text;

DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'room_status_history', 'notifications_log', 'staff', 'departments',
    'sub_departments', 'schedules', 'shift_schedules', 'equipment', 'devices',
    'patients', 'procedures', 'management_contacts', 'workflow_statuses',
    'app_modules', 'app_settings', 'safety_checklists', 'operating_procedures'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I SET hospital_id = ''default'' WHERE hospital_id IS NULL',
        table_name
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (hospital_id)',
        'idx_' || table_name || '_hospital', table_name
      );
    END IF;
  END LOOP;
END $$;

-- Zachová původní globální nastavení pozadí pod tenantově bezpečným ID.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM app_settings WHERE id = 'global')
     AND NOT EXISTS (SELECT 1 FROM app_settings WHERE id = 'default-global') THEN
    UPDATE app_settings SET id = 'default-global' WHERE id = 'global';
  END IF;
END $$;

-- Konfigurační klíče (např. dashboard nebo výchozí workflow status) se mohou
-- opakovat v různých nemocnicích, ale nikdy uvnitř stejné nemocnice.
DO $$ BEGIN
  ALTER TABLE app_modules DROP CONSTRAINT app_modules_pkey;
  ALTER TABLE app_modules ADD PRIMARY KEY (id, hospital_id);
EXCEPTION WHEN undefined_object OR duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE workflow_statuses DROP CONSTRAINT workflow_statuses_pkey;
  ALTER TABLE workflow_statuses ADD PRIMARY KEY (id, hospital_id);
EXCEPTION WHEN undefined_object OR duplicate_table THEN NULL;
END $$;

-- Databázová pojistka: žádný aplikační řádek nesmí existovat bez nemocnice.
-- Záměrně bez DEFAULT hodnoty, aby opomenutý hospital_id skončil chybou místo
-- tichého zapsání do původní nemocnice.
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'operating_rooms', 'room_status_history', 'notifications_log', 'staff',
    'departments', 'sub_departments', 'schedules', 'shift_schedules',
    'equipment', 'devices', 'patients', 'procedures', 'management_contacts',
    'workflow_statuses', 'app_modules', 'app_settings', 'safety_checklists',
    'operating_procedures'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN hospital_id DROP DEFAULT', table_name);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN hospital_id SET NOT NULL', table_name);
      BEGIN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE RESTRICT',
          table_name, table_name || '_hospital_fk'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hospitals_read ON hospitals;
REVOKE ALL ON hospitals FROM anon, authenticated;

ALTER TABLE hospital_user_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hospital_user_memberships FROM anon, authenticated;

-- Skutečná tenant bariéra: klientský JWT vydaný serverem obsahuje právě jedno
-- hospital_id. Ani ručně upravený filtr v prohlížeči nemůže číst jiný tenant.
DO $$
DECLARE
  table_name text;
  policy_name text;
  tables text[] := ARRAY[
    'operating_rooms', 'room_status_history', 'notifications_log', 'staff',
    'departments', 'sub_departments', 'schedules', 'shift_schedules',
    'equipment', 'patients', 'procedures', 'management_contacts',
    'workflow_statuses', 'app_modules', 'app_settings', 'safety_checklists',
    'operating_procedures'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      FOR policy_name IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = table_name
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', policy_name, table_name);
      END LOOP;
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO authenticated USING (hospital_id = (auth.jwt() ->> ''hospital_id'')) WITH CHECK (hospital_id = (auth.jwt() ->> ''hospital_id''))',
        table_name
      );
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', table_name);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
    END IF;
  END LOOP;
END $$;

COMMIT;
