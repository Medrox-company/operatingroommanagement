-- Operatingroom Manager — read-only verification for the Apple App Review tenant
--
-- Run with psql after seed.sql and before the first reviewer login. This file
-- starts a REPEATABLE READ, READ ONLY transaction and always rolls it back.
-- It never asks for or handles the review password.
--
-- A reviewer login can legitimately register one device afterward. This strict
-- pre-login verification intentionally requires zero devices and zero management
-- contacts, so rerun seed.sql before using this check for a fresh submission.

\set ON_ERROR_STOP on

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
SELECT pg_catalog.pg_advisory_xact_lock_shared(
  pg_catalog.hashtextextended('orm:app-review-seed:v1', 0)
);

DO $schema_contract$
DECLARE
  required_column record;
BEGIN
  FOR required_column IN
    SELECT *
    FROM (VALUES
      ('hospitals', 'id'),
      ('hospitals', 'hospital_notes'),
      ('app_users', 'id'),
      ('app_users', 'email'),
      ('app_users', 'name'),
      ('app_users', 'role'),
      ('app_users', 'is_active'),
      ('hospital_user_memberships', 'hospital_id'),
      ('hospital_user_memberships', 'user_id'),
      ('hospital_user_memberships', 'password_hash'),
      ('hospital_user_memberships', 'password_changed_at'),
      ('app_modules', 'id'),
      ('app_modules', 'hospital_id'),
      ('app_modules', 'is_enabled'),
      ('app_modules', 'allowed_roles'),
      ('app_submodules', 'id'),
      ('app_submodules', 'hospital_id'),
      ('app_submodules', 'is_enabled'),
      ('app_submodules', 'allowed_roles'),
      ('workflow_statuses', 'id'),
      ('workflow_statuses', 'hospital_id'),
      ('app_settings', 'id'),
      ('app_settings', 'hospital_id'),
      ('departments', 'id'),
      ('departments', 'hospital_id'),
      ('staff', 'id'),
      ('staff', 'hospital_id'),
      ('staff', 'name'),
      ('staff', 'notes'),
      ('operating_rooms', 'id'),
      ('operating_rooms', 'hospital_id'),
      ('operating_rooms', 'weekly_schedule'),
      ('room_status_history', 'hospital_id'),
      ('room_status_history', 'operating_room_id'),
      ('room_status_history', 'metadata'),
      ('room_specialty_allocations', 'hospital_id'),
      ('shift_schedules', 'hospital_id'),
      ('management_contacts', 'hospital_id'),
      ('devices', 'hospital_id')
    ) AS contract(table_name, column_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = required_column.table_name
        AND column_name = required_column.column_name
    ) THEN
      RAISE EXCEPTION
        'Verification schema mismatch: missing public.%.%',
        required_column.table_name,
        required_column.column_name;
    END IF;
  END LOOP;
END;
$schema_contract$;

DO $review_contract$
DECLARE
  review_user_id constant uuid := '7bc0b61c-06c4-4eb0-9a8a-d9e54b42a501'::uuid;
BEGIN
  IF (SELECT pg_catalog.count(*) FROM public.hospitals WHERE id = 'apple-review' AND hospital_notes = 'APP_REVIEW_SYNTHETIC_V1') <> 1 THEN
    RAISE EXCEPTION 'Missing review tenant or exact synthetic marker';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM public.app_users WHERE id = review_user_id AND lower(email) = 'appreview@operatingroom.eu' AND name = 'Apple App Review' AND role = 'admin' AND is_active) <> 1 THEN
    RAISE EXCEPTION 'Review account identity/role/active-state check failed';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM public.app_users WHERE lower(email) = 'appreview@operatingroom.eu') <> 1 THEN
    RAISE EXCEPTION 'Review email is not globally unique';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM public.hospital_user_memberships WHERE user_id = review_user_id::text) <> 1
     OR (SELECT pg_catalog.count(*) FROM public.hospital_user_memberships WHERE user_id = review_user_id::text AND hospital_id = 'apple-review' AND password_hash IS NOT NULL AND password_changed_at IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'Review membership is missing, not isolated, or has no password';
  END IF;

  IF EXISTS (
    SELECT id FROM public.app_modules WHERE hospital_id = 'default'
    EXCEPT
    SELECT id FROM public.app_modules WHERE hospital_id = 'apple-review'
  ) OR EXISTS (
    SELECT id FROM public.app_modules WHERE hospital_id = 'apple-review'
    EXCEPT
    SELECT id FROM public.app_modules WHERE hospital_id = 'default'
  ) THEN
    RAISE EXCEPTION 'Review module IDs differ from the default template';
  END IF;

  IF EXISTS (
    SELECT id FROM public.app_submodules WHERE hospital_id = 'default'
    EXCEPT
    SELECT id FROM public.app_submodules WHERE hospital_id = 'apple-review'
  ) OR EXISTS (
    SELECT id FROM public.app_submodules WHERE hospital_id = 'apple-review'
    EXCEPT
    SELECT id FROM public.app_submodules WHERE hospital_id = 'default'
  ) THEN
    RAISE EXCEPTION 'Review submodule IDs differ from the default template';
  END IF;

  IF EXISTS (
    SELECT id FROM public.workflow_statuses WHERE hospital_id = 'default'
    EXCEPT
    SELECT id FROM public.workflow_statuses WHERE hospital_id = 'apple-review'
  ) OR EXISTS (
    SELECT id FROM public.workflow_statuses WHERE hospital_id = 'apple-review'
    EXCEPT
    SELECT id FROM public.workflow_statuses WHERE hospital_id = 'default'
  ) THEN
    RAISE EXCEPTION 'Review workflow IDs differ from the default template';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM public.app_settings WHERE hospital_id = 'apple-review' AND id = 'apple-review-global') <> 1
     OR (SELECT pg_catalog.count(*) FROM public.app_settings WHERE hospital_id = 'apple-review') <> 1 THEN
    RAISE EXCEPTION 'Review settings row is missing or not unique';
  END IF;

  IF EXISTS (
    SELECT required.id
    FROM (VALUES
      ('dashboard'),
      ('timeline'),
      ('flow'),
      ('statistics'),
      ('staff'),
      ('alerts'),
      ('settings'),
      ('devices')
    ) AS required(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.app_modules AS module
      WHERE module.hospital_id = 'apple-review'
        AND module.id = required.id
        AND module.is_enabled = true
        AND 'admin' = ANY(COALESCE(module.allowed_roles, ARRAY[]::text[]))
    )
  ) THEN
    RAISE EXCEPTION 'One or more review modules are unavailable to admin';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_submodules
    WHERE hospital_id = 'apple-review'
      AND id IN (
        'settings.hospital',
        'settings.modules',
        'settings.database',
        'settings.diagnostics'
      )
      AND 'admin' = ANY(COALESCE(allowed_roles, ARRAY[]::text[]))
  ) THEN
    RAISE EXCEPTION 'Sensitive settings are exposed to the review admin';
  END IF;

  IF EXISTS (
    SELECT required.id
    FROM (VALUES
      ('dashboard.spatial'),
      ('settings.access'),
      ('settings.rooms'),
      ('settings.specialties'),
      ('settings.schedule'),
      ('settings.staff'),
      ('settings.staff-overview'),
      ('settings.statuses'),
      ('settings.calendar'),
      ('settings.notifications'),
      ('settings.statistics'),
      ('settings.management'),
      ('settings.devices')
    ) AS required(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.app_submodules AS submodule
      WHERE submodule.hospital_id = 'apple-review'
        AND submodule.id = required.id
        AND submodule.is_enabled = true
        AND 'admin' = ANY(COALESCE(submodule.allowed_roles, ARRAY[]::text[]))
    )
  ) THEN
    RAISE EXCEPTION 'One or more intended review submodules are unavailable to admin';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM public.departments WHERE hospital_id = 'apple-review') <> 4
     OR (SELECT pg_catalog.count(*) FROM public.staff WHERE hospital_id = 'apple-review') <> 8
     OR (SELECT pg_catalog.count(*) FROM public.operating_rooms WHERE hospital_id = 'apple-review') <> 4
     OR (SELECT pg_catalog.count(*) FROM public.room_status_history WHERE hospital_id = 'apple-review') <> 112
     OR (SELECT pg_catalog.count(*) FROM public.room_specialty_allocations WHERE hospital_id = 'apple-review') <> 64
     OR (SELECT pg_catalog.count(*) FROM public.shift_schedules WHERE hospital_id = 'apple-review') <> 64 THEN
    RAISE EXCEPTION 'Synthetic dataset counts are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.operating_rooms
    WHERE hospital_id = 'apple-review' AND id NOT LIKE 'review-room-%'
  ) OR EXISTS (
    SELECT 1 FROM public.staff
    WHERE hospital_id = 'apple-review' AND id NOT LIKE 'review-%'
  ) OR EXISTS (
    SELECT 1 FROM public.departments
    WHERE hospital_id = 'apple-review' AND id NOT LIKE 'review-dept-%'
  ) THEN
    RAISE EXCEPTION 'Non-synthetic identifiers exist in review operational data';
  END IF;

  IF EXISTS (
    SELECT id, name, role
    FROM public.staff
    WHERE hospital_id = 'apple-review'
    EXCEPT
    SELECT *
    FROM (VALUES
      ('review-doctor-a', 'Ukázkový lékař A', 'DOCTOR'),
      ('review-doctor-b', 'Ukázkový lékař B', 'DOCTOR'),
      ('review-doctor-c', 'Ukázkový lékař C', 'DOCTOR'),
      ('review-doctor-d', 'Ukázkový lékař D', 'DOCTOR'),
      ('review-nurse-a', 'Ukázková sestra A', 'NURSE'),
      ('review-nurse-b', 'Ukázková sestra B', 'NURSE'),
      ('review-nurse-c', 'Ukázková sestra C', 'NURSE'),
      ('review-nurse-d', 'Ukázková sestra D', 'NURSE')
    ) AS allowed(id, name, role)
  ) OR EXISTS (
    SELECT *
    FROM (VALUES
      ('review-doctor-a', 'Ukázkový lékař A', 'DOCTOR'),
      ('review-doctor-b', 'Ukázkový lékař B', 'DOCTOR'),
      ('review-doctor-c', 'Ukázkový lékař C', 'DOCTOR'),
      ('review-doctor-d', 'Ukázkový lékař D', 'DOCTOR'),
      ('review-nurse-a', 'Ukázková sestra A', 'NURSE'),
      ('review-nurse-b', 'Ukázková sestra B', 'NURSE'),
      ('review-nurse-c', 'Ukázková sestra C', 'NURSE'),
      ('review-nurse-d', 'Ukázková sestra D', 'NURSE')
    ) AS expected(id, name, role)
    EXCEPT
    SELECT id, name, role
    FROM public.staff
    WHERE hospital_id = 'apple-review'
  ) OR EXISTS (
    SELECT 1
    FROM public.staff
    WHERE hospital_id = 'apple-review'
      AND notes IS DISTINCT FROM 'Syntetický personál pro App Review'
  ) THEN
    RAISE EXCEPTION 'Unexpected or missing staff identity exists in the review tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.room_status_history
    WHERE hospital_id = 'apple-review'
      AND (
        metadata ->> 'synthetic' IS DISTINCT FROM 'true'
        OR metadata ->> 'source' IS DISTINCT FROM 'app_review_seed'
      )
  ) THEN
    RAISE EXCEPTION 'Unmarked status-history rows exist in the review tenant';
  END IF;

  IF EXISTS (SELECT 1 FROM public.management_contacts WHERE hospital_id = 'apple-review') THEN
    RAISE EXCEPTION 'Review tenant contains a management contact';
  END IF;

  IF EXISTS (SELECT 1 FROM public.devices WHERE hospital_id = 'apple-review') THEN
    RAISE EXCEPTION 'Review tenant contains a device before first login';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.operating_rooms
    WHERE hospital_id = 'apple-review'
      AND weekly_schedule IS DISTINCT FROM pg_catalog.jsonb_build_object(
        'monday',    pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
        'tuesday',   pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
        'wednesday', pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
        'thursday',  pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
        'friday',    pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
        'saturday',  pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
        'sunday',    pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0)
      )
  ) THEN
    RAISE EXCEPTION 'A review room is not configured for synthetic 24/7 availability';
  END IF;

  IF pg_catalog.has_table_privilege('authenticated', 'public.app_users', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.hospitals', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.hospital_user_memberships', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.app_users', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.hospitals', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.hospital_user_memberships', 'SELECT') THEN
    RAISE EXCEPTION 'A client role can directly read an internal identity/tenant table';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('app_modules'),
      ('app_submodules'),
      ('workflow_statuses'),
      ('app_settings'),
      ('departments'),
      ('staff'),
      ('operating_rooms'),
      ('room_status_history'),
      ('room_specialty_allocations'),
      ('shift_schedules'),
      ('management_contacts'),
      ('devices')
    ) AS review_table(table_name)
    WHERE pg_catalog.has_table_privilege('anon', 'public.' || review_table.table_name, 'SELECT')
       OR pg_catalog.has_table_privilege('anon', 'public.' || review_table.table_name, 'INSERT')
       OR pg_catalog.has_table_privilege('anon', 'public.' || review_table.table_name, 'UPDATE')
       OR pg_catalog.has_table_privilege('anon', 'public.' || review_table.table_name, 'DELETE')
  ) THEN
    RAISE EXCEPTION 'Anonymous role has direct privileges on review-facing tenant data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'app_modules',
        'app_submodules',
        'workflow_statuses',
        'app_settings',
        'departments',
        'staff',
        'operating_rooms',
        'room_status_history',
        'room_specialty_allocations',
        'shift_schedules',
        'management_contacts',
        'devices'
      )
      AND relation.relrowsecurity = false
  ) THEN
    RAISE EXCEPTION 'RLS is disabled on one or more review-facing tables';
  END IF;

  -- Catalog-level write guard for the only configuration tables directly
  -- granted UPDATE to authenticated clients. Every applicable UPDATE/ALL policy
  -- must require both this tenant and app_role=superadmin; an admin review
  -- account must not be able to change module grants through the Data API.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename IN ('app_modules', 'app_submodules')
      AND policy.cmd IN ('ALL', 'UPDATE')
      AND (
        'public' = ANY(policy.roles::text[])
        OR 'authenticated' = ANY(policy.roles::text[])
      )
      AND (
        COALESCE(policy.qual, '') NOT LIKE '%hospital_id%'
        OR COALESCE(policy.qual, '') NOT LIKE '%app_role%'
        OR COALESCE(policy.qual, '') NOT LIKE '%superadmin%'
        OR COALESCE(policy.with_check, '') NOT LIKE '%hospital_id%'
        OR COALESCE(policy.with_check, '') NOT LIKE '%app_role%'
        OR COALESCE(policy.with_check, '') NOT LIKE '%superadmin%'
      )
  ) OR EXISTS (
    SELECT required.table_name
    FROM (VALUES ('app_modules'), ('app_submodules')) AS required(table_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policies AS policy
      WHERE policy.schemaname = 'public'
        AND policy.tablename = required.table_name
        AND policy.cmd = 'UPDATE'
        AND (
          'public' = ANY(policy.roles::text[])
          OR 'authenticated' = ANY(policy.roles::text[])
        )
        AND COALESCE(policy.qual, '') LIKE '%hospital_id%'
        AND COALESCE(policy.qual, '') LIKE '%app_role%'
        AND COALESCE(policy.qual, '') LIKE '%superadmin%'
        AND COALESCE(policy.with_check, '') LIKE '%hospital_id%'
        AND COALESCE(policy.with_check, '') LIKE '%app_role%'
        AND COALESCE(policy.with_check, '') LIKE '%superadmin%'
    )
  ) THEN
    RAISE EXCEPTION 'Module configuration UPDATE policy is not tenant-scoped and superadmin-only';
  END IF;
END;
$review_contract$;

-- Limited SELECT-only RLS smoke test: exercise the same JWT claims used by the
-- application for rooms, staff, and modules, and prove the default tenant is
-- hidden. This read-only verifier intentionally does not simulate mutations;
-- module/submodule write authorization is catalog-audited immediately above.
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  pg_catalog.jsonb_build_object(
    'role', 'authenticated',
    'sub', '7bc0b61c-06c4-4eb0-9a8a-d9e54b42a501',
    'hospital_id', 'apple-review',
    'app_role', 'admin'
  )::text,
  true
) AS claims_for_rls_check
\gset
\unset claims_for_rls_check

SET LOCAL ROLE authenticated;

SELECT
  (SELECT pg_catalog.count(*) FROM public.operating_rooms WHERE hospital_id = 'apple-review') = 4
    AS rls_review_rooms_visible,
  NOT EXISTS (SELECT 1 FROM public.operating_rooms WHERE hospital_id = 'default')
    AS rls_default_rooms_hidden,
  (SELECT pg_catalog.count(*) FROM public.staff WHERE hospital_id = 'apple-review') = 8
    AS rls_review_staff_visible,
  NOT EXISTS (SELECT 1 FROM public.staff WHERE hospital_id = 'default')
    AS rls_default_staff_hidden,
  EXISTS (
    SELECT 1
    FROM public.app_modules
    WHERE hospital_id = 'apple-review'
      AND id = 'timeline'
      AND 'admin' = ANY(COALESCE(allowed_roles, ARRAY[]::text[]))
  ) AS rls_review_modules_visible,
  NOT EXISTS (SELECT 1 FROM public.app_modules WHERE hospital_id = 'default')
    AS rls_default_modules_hidden
\gset

RESET ROLE;

\if :rls_review_rooms_visible
\else
  SELECT 1 / 0 AS rls_review_rooms_not_visible;
\endif

\if :rls_default_rooms_hidden
\else
  SELECT 1 / 0 AS rls_default_rooms_visible;
\endif

\if :rls_review_staff_visible
\else
  SELECT 1 / 0 AS rls_review_staff_not_visible;
\endif

\if :rls_default_staff_hidden
\else
  SELECT 1 / 0 AS rls_default_staff_visible;
\endif

\if :rls_review_modules_visible
\else
  SELECT 1 / 0 AS rls_review_modules_not_visible;
\endif

\if :rls_default_modules_hidden
\else
  SELECT 1 / 0 AS rls_default_modules_visible;
\endif

SELECT dataset, rows
FROM (
  VALUES
    ('departments', (SELECT pg_catalog.count(*) FROM public.departments WHERE hospital_id = 'apple-review')),
    ('staff', (SELECT pg_catalog.count(*) FROM public.staff WHERE hospital_id = 'apple-review')),
    ('operating_rooms', (SELECT pg_catalog.count(*) FROM public.operating_rooms WHERE hospital_id = 'apple-review')),
    ('room_status_history', (SELECT pg_catalog.count(*) FROM public.room_status_history WHERE hospital_id = 'apple-review')),
    ('room_specialty_allocations', (SELECT pg_catalog.count(*) FROM public.room_specialty_allocations WHERE hospital_id = 'apple-review')),
    ('shift_schedules', (SELECT pg_catalog.count(*) FROM public.shift_schedules WHERE hospital_id = 'apple-review')),
    ('management_contacts', (SELECT pg_catalog.count(*) FROM public.management_contacts WHERE hospital_id = 'apple-review')),
    ('devices', (SELECT pg_catalog.count(*) FROM public.devices WHERE hospital_id = 'apple-review'))
) AS summary(dataset, rows)
ORDER BY dataset;

ROLLBACK;

\echo 'App Review tenant verification passed (read-only transaction rolled back).'
