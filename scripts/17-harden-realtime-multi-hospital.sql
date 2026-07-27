-- Spolehlivý Realtime a tenantová izolace pro nepřetržitý multi-hospital provoz.
-- Skript je idempotentní a atomický: lze jej bezpečně spustit opakovaně.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Monotónní revize dovolí klientům bezpečně zahodit opožděnou websocketovou
-- událost (např. po probuzení stanice ze spánku).
ALTER TABLE public.operating_rooms
  ADD COLUMN IF NOT EXISTS state_revision bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_operating_room_state_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.state_revision := OLD.state_revision + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operating_rooms_bump_state_revision
  ON public.operating_rooms;

CREATE TRIGGER operating_rooms_bump_state_revision
  BEFORE UPDATE ON public.operating_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_operating_room_state_revision();

-- Všechny tabulky, které klient sleduje přes centrální Realtime kanál,
-- musí být v publikaci. FULL zachová hospital_id i u DELETE událostí.
DO $$
DECLARE
  table_name text;
  realtime_tables text[] := ARRAY[
    'operating_rooms',
    'room_status_history',
    'staff',
    'devices',
    'notifications_log',
    'workflow_statuses',
    'app_settings',
    'room_specialty_allocations'
  ];
BEGIN
  FOREACH table_name IN ARRAY realtime_tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I REPLICA IDENTITY FULL',
        table_name
      );

      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          table_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Původní migrace zařízení omylem vynechala z tenantové RLS smyčky.
-- Odstraníme všechny staré veřejné politiky a nahradíme je jedinou bariérou.
DO $$
DECLARE
  policy_name text;
BEGIN
  IF to_regclass('public.devices') IS NOT NULL THEN
    ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

    FOR policy_name IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'devices'
    LOOP
      EXECUTE format(
        'DROP POLICY %I ON public.devices',
        policy_name
      );
    END LOOP;

    CREATE POLICY tenant_isolation
      ON public.devices
      FOR ALL TO authenticated
      USING (hospital_id = (auth.jwt() ->> 'hospital_id'))
      WITH CHECK (hospital_id = (auth.jwt() ->> 'hospital_id'));

    REVOKE ALL ON public.devices FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
  END IF;
END $$;

-- Složené indexy odpovídají nejčastějším tenantovým dotazům aplikace.
CREATE INDEX IF NOT EXISTS idx_room_status_history_hospital_timestamp
  ON public.room_status_history (hospital_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_room_status_history_hospital_room_timestamp
  ON public.room_status_history (hospital_id, operating_room_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_log_hospital_created
  ON public.notifications_log (hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_devices_hospital_last_seen
  ON public.devices (hospital_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_statuses_hospital_sort
  ON public.workflow_statuses (hospital_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_staff_hospital_name
  ON public.staff (hospital_id, name);

COMMIT;
