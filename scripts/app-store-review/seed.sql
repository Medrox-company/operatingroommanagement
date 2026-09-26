-- Operatingroom Manager — isolated Apple App Review tenant seed
--
-- This script is intentionally NOT a migration. Run it manually with psql only
-- after reviewing the target database and taking an appropriate backup.
-- It never contains the review password. The password must already exist only
-- in the psql variable `app_review_password` and is sent to PostgreSQL as a
-- protocol bind parameter (never interpolated into the SQL statement text).
--
-- Required invocation properties:
--   * psql 16+ (`\bind` is required)
--   * do not enable psql echo/debug flags (-a, -e, ECHO_HIDDEN, ECHO=all)
--   * supply a 20–128 character base64url-style random password through the
--     psql variable `app_review_password`; never commit or paste it here
--
-- This script does not touch any non-review tenant. Every operational DELETE is
-- dynamically guarded by `hospital_id = 'apple-review'` inside one transaction.

\set ON_ERROR_STOP on
\set QUIET 1

\if :{?app_review_password}
\else
  \echo 'ERROR: missing required psql variable app_review_password.'
  SELECT 1 / 0 AS missing_app_review_password;
\endif

-- Validate the secret without rendering it. URL-safe characters avoid psql
-- meta-command tokenisation ambiguity while retaining ample entropy.
SELECT (
  length($1::text) BETWEEN 20 AND 128
  AND $1::text ~ '^[A-Za-z0-9_-]+$'
) AS app_review_password_valid
\bind :app_review_password
\gset

\if :app_review_password_valid
\else
  \echo 'ERROR: app_review_password must be 20–128 random base64url characters.'
  SELECT 1 / 0 AS invalid_app_review_password;
\endif

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('orm:app-review-seed:v1', 0)
);

-- Fail closed if the deployed schema no longer matches the audited contract.
-- These columns were verified against the current Data API OpenAPI schema and
-- the repository migrations on 2026-09-22. Optional legacy tables are handled
-- dynamically later, but a present legacy table must still have hospital_id.
DO $schema_contract$
DECLARE
  required_column record;
  required_table text;
  missing_tables text[] := ARRAY[]::text[];
  missing_columns text[] := ARRAY[]::text[];
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'hospitals',
    'app_users',
    'hospital_user_memberships',
    'app_modules',
    'app_submodules',
    'workflow_statuses',
    'app_settings',
    'departments',
    'staff',
    'operating_rooms',
    'room_specialty_allocations',
    'room_status_history',
    'shift_schedules',
    'management_contacts',
    'devices'
  ] LOOP
    IF pg_catalog.to_regclass('public.' || required_table) IS NULL THEN
      missing_tables := pg_catalog.array_append(missing_tables, required_table);
    END IF;
  END LOOP;

  FOR required_column IN
    SELECT *
    FROM (VALUES
      ('hospitals', 'id'),
      ('hospitals', 'hospital_name'),
      ('hospitals', 'hospital_short_name'),
      ('hospitals', 'hospital_country'),
      ('hospitals', 'hospital_notes'),
      ('hospitals', 'updated_at'),

      ('app_users', 'id'),
      ('app_users', 'email'),
      ('app_users', 'password_hash'),
      ('app_users', 'name'),
      ('app_users', 'role'),
      ('app_users', 'is_active'),
      ('app_users', 'updated_at'),

      ('hospital_user_memberships', 'hospital_id'),
      ('hospital_user_memberships', 'user_id'),
      ('hospital_user_memberships', 'password_hash'),
      ('hospital_user_memberships', 'password_changed_at'),

      ('app_modules', 'id'),
      ('app_modules', 'hospital_id'),
      ('app_modules', 'name'),
      ('app_modules', 'description'),
      ('app_modules', 'is_enabled'),
      ('app_modules', 'icon'),
      ('app_modules', 'accent_color'),
      ('app_modules', 'sort_order'),
      ('app_modules', 'allowed_roles'),
      ('app_modules', 'created_at'),
      ('app_modules', 'updated_at'),

      ('app_submodules', 'id'),
      ('app_submodules', 'module_id'),
      ('app_submodules', 'hospital_id'),
      ('app_submodules', 'name'),
      ('app_submodules', 'description'),
      ('app_submodules', 'is_enabled'),
      ('app_submodules', 'allowed_roles'),
      ('app_submodules', 'sort_order'),
      ('app_submodules', 'created_at'),
      ('app_submodules', 'updated_at'),

      ('workflow_statuses', 'id'),
      ('workflow_statuses', 'hospital_id'),
      ('workflow_statuses', 'name'),
      ('workflow_statuses', 'description'),
      ('workflow_statuses', 'accent_color'),
      ('workflow_statuses', 'icon'),
      ('workflow_statuses', 'sort_order'),
      ('workflow_statuses', 'default_duration_minutes'),
      ('workflow_statuses', 'is_active'),
      ('workflow_statuses', 'is_special'),
      ('workflow_statuses', 'special_type'),
      ('workflow_statuses', 'include_in_statistics'),
      ('workflow_statuses', 'show_in_timeline'),
      ('workflow_statuses', 'show_in_room_detail'),
      ('workflow_statuses', 'created_at'),
      ('workflow_statuses', 'updated_at'),

      ('app_settings', 'id'),
      ('app_settings', 'hospital_id'),
      ('app_settings', 'background_type'),
      ('app_settings', 'background_colors'),
      ('app_settings', 'background_direction'),
      ('app_settings', 'background_opacity'),
      ('app_settings', 'background_image_url'),
      ('app_settings', 'background_image_opacity'),
      ('app_settings', 'background_image_blur'),
      ('app_settings', 'background_animation'),
      ('app_settings', 'background_animation_speed'),
      ('app_settings', 'created_at'),
      ('app_settings', 'updated_at'),

      ('departments', 'id'),
      ('departments', 'hospital_id'),
      ('departments', 'name'),
      ('departments', 'short_code'),
      ('departments', 'description'),
      ('departments', 'is_active'),
      ('departments', 'accent_color'),
      ('departments', 'sort_order'),

      ('staff', 'id'),
      ('staff', 'hospital_id'),
      ('staff', 'name'),
      ('staff', 'role'),
      ('staff', 'is_active'),
      ('staff', 'skill_level'),
      ('staff', 'availability'),
      ('staff', 'is_external'),
      ('staff', 'is_recommended'),
      ('staff', 'sick_leave_days'),
      ('staff', 'vacation_days'),
      ('staff', 'notes'),

      ('operating_rooms', 'id'),
      ('operating_rooms', 'hospital_id'),
      ('operating_rooms', 'name'),
      ('operating_rooms', 'department'),
      ('operating_rooms', 'status'),
      ('operating_rooms', 'queue_count'),
      ('operating_rooms', 'operations_24h'),
      ('operating_rooms', 'is_septic'),
      ('operating_rooms', 'is_emergency'),
      ('operating_rooms', 'is_locked'),
      ('operating_rooms', 'is_enhanced_hygiene'),
      ('operating_rooms', 'is_paused'),
      ('operating_rooms', 'phase_started_at'),
      ('operating_rooms', 'operation_started_at'),
      ('operating_rooms', 'current_step_index'),
      ('operating_rooms', 'estimated_end_time'),
      ('operating_rooms', 'doctor_id'),
      ('operating_rooms', 'nurse_id'),
      ('operating_rooms', 'anesthesiologist_id'),
      ('operating_rooms', 'weekly_schedule'),
      ('operating_rooms', 'status_history'),
      ('operating_rooms', 'completed_operations'),
      ('operating_rooms', 'sort_order'),
      ('operating_rooms', 'hourly_operating_cost'),
      ('operating_rooms', 'state_revision'),
      ('operating_rooms', 'updated_at'),

      ('room_specialty_allocations', 'id'),
      ('room_specialty_allocations', 'hospital_id'),
      ('room_specialty_allocations', 'operating_room_id'),
      ('room_specialty_allocations', 'department_id'),
      ('room_specialty_allocations', 'allocation_date'),
      ('room_specialty_allocations', 'day_part'),
      ('room_specialty_allocations', 'allocation_kind'),

      ('room_status_history', 'id'),
      ('room_status_history', 'hospital_id'),
      ('room_status_history', 'operating_room_id'),
      ('room_status_history', 'event_type'),
      ('room_status_history', 'step_index'),
      ('room_status_history', 'step_name'),
      ('room_status_history', 'duration_seconds'),
      ('room_status_history', 'timestamp'),
      ('room_status_history', 'metadata'),

      ('shift_schedules', 'id'),
      ('shift_schedules', 'hospital_id'),
      ('shift_schedules', 'staff_id'),
      ('shift_schedules', 'operating_room_id'),
      ('shift_schedules', 'shift_date'),
      ('shift_schedules', 'shift_type'),
      ('shift_schedules', 'start_time'),
      ('shift_schedules', 'end_time'),
      ('shift_schedules', 'is_available'),

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
      missing_columns := pg_catalog.array_append(
        missing_columns,
        required_column.table_name || '.' || required_column.column_name
      );
    END IF;
  END LOOP;

  IF pg_catalog.cardinality(missing_tables) > 0
     OR pg_catalog.cardinality(missing_columns) > 0 THEN
    RAISE EXCEPTION
      'App Review seed schema mismatch. Missing tables: %. Missing columns: %',
      missing_tables,
      missing_columns;
  END IF;

  IF pg_catalog.to_regprocedure(
    'public.set_membership_password(uuid,text,text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'Missing required function public.set_membership_password(uuid,text,text)';
  END IF;

  IF pg_catalog.to_regprocedure(
    'public.verify_membership_password(text,text,text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'Missing required function public.verify_membership_password(text,text,text)';
  END IF;

  IF pg_catalog.to_regprocedure('extensions.crypt(text,text)') IS NULL
     OR pg_catalog.to_regprocedure('extensions.gen_salt(text,integer)') IS NULL THEN
    RAISE EXCEPTION 'Missing required pgcrypto functions in schema extensions';
  END IF;
END;
$schema_contract$;

-- These three global-key tables use UPSERT below. Lock them before checking
-- reserved IDs so an unrelated session cannot create a conflicting tenant,
-- account, or settings row in the gap between the guard and the write.
LOCK TABLE
  public.app_settings,
  public.app_users,
  public.hospitals
IN SHARE ROW EXCLUSIVE MODE;

-- Collision and source-template checks happen before the first write.
DO $collision_guards$
DECLARE
  review_hospital constant text := 'apple-review';
  review_marker constant text := 'APP_REVIEW_SYNTHETIC_V1';
  review_user_id constant uuid := '7bc0b61c-06c4-4eb0-9a8a-d9e54b42a501'::uuid;
  review_email constant text := 'appreview@operatingroom.eu';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.hospitals
    WHERE id = review_hospital
      AND hospital_notes IS DISTINCT FROM review_marker
  ) THEN
    RAISE EXCEPTION
      'Tenant % exists without the exact synthetic marker; refusing to modify it',
      review_hospital;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE id = review_user_id
      AND lower(email) <> lower(review_email)
  ) THEN
    RAISE EXCEPTION 'Reserved review user UUID is already used by another email';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE lower(email) = lower(review_email)
      AND id <> review_user_id
  ) THEN
    RAISE EXCEPTION 'Review email is already used by another user UUID';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE id = review_user_id
      AND (
        lower(email) <> lower(review_email)
        OR name <> 'Apple App Review'
        OR role <> 'admin'
      )
  ) THEN
    RAISE EXCEPTION 'Existing review account does not match its reserved identity';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.hospital_user_memberships
    WHERE user_id = review_user_id::text
      AND hospital_id <> review_hospital
  ) THEN
    RAISE EXCEPTION 'Review account has membership outside the isolated review tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_settings
    WHERE id = 'apple-review-global'
      AND hospital_id <> review_hospital
  ) THEN
    RAISE EXCEPTION 'Reserved review settings ID belongs to another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.departments
    WHERE id IN (
      'review-dept-chir',
      'review-dept-trau',
      'review-dept-uro',
      'review-dept-gyn'
    )
      AND hospital_id <> review_hospital
  ) THEN
    RAISE EXCEPTION 'A reserved review department ID belongs to another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.staff
    WHERE id IN (
      'review-doctor-a',
      'review-doctor-b',
      'review-doctor-c',
      'review-doctor-d',
      'review-nurse-a',
      'review-nurse-b',
      'review-nurse-c',
      'review-nurse-d'
    )
      AND hospital_id <> review_hospital
  ) THEN
    RAISE EXCEPTION 'A reserved review staff ID belongs to another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.operating_rooms
    WHERE id IN (
      'review-room-01',
      'review-room-02',
      'review-room-03',
      'review-room-04'
    )
      AND hospital_id <> review_hospital
  ) THEN
    RAISE EXCEPTION 'A reserved review room ID belongs to another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.shift_schedules
    WHERE hospital_id <> review_hospital
      AND id IN (
        SELECT pg_catalog.format(
          'review-shift-%s-%s',
          member.staff_id,
          pg_catalog.to_char(CURRENT_DATE + day_offset, 'YYYYMMDD')
        )
        FROM (VALUES
          ('review-doctor-a'),
          ('review-nurse-a'),
          ('review-doctor-b'),
          ('review-nurse-b'),
          ('review-doctor-c'),
          ('review-nurse-c'),
          ('review-doctor-d'),
          ('review-nurse-d')
        ) AS member(staff_id)
        CROSS JOIN pg_catalog.generate_series(0, 7) AS days(day_offset)
      )
  ) THEN
    RAISE EXCEPTION 'A reserved review shift ID belongs to another tenant';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.hospitals WHERE id = 'default') THEN
    RAISE EXCEPTION 'Missing source tenant default';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.app_settings
    WHERE id = 'default-global'
      AND hospital_id = 'default'
  ) THEN
    RAISE EXCEPTION 'Missing source settings row default/default-global';
  END IF;

  IF EXISTS (
    SELECT expected.id
    FROM (VALUES
      ('dashboard'), ('timeline'), ('flow'), ('statistics'),
      ('staff'), ('alerts'), ('settings'), ('devices')
    ) AS expected(id)
    EXCEPT
    SELECT id FROM public.app_modules WHERE hospital_id = 'default'
  ) THEN
    RAISE EXCEPTION 'Default tenant is missing one or more required application modules';
  END IF;

  IF EXISTS (
    SELECT expected.id
    FROM (VALUES
      ('dashboard.spatial'),
      ('settings.hospital'),
      ('settings.modules'),
      ('settings.diagnostics'),
      ('settings.database'),
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
    ) AS expected(id)
    EXCEPT
    SELECT id FROM public.app_submodules WHERE hospital_id = 'default'
  ) THEN
    RAISE EXCEPTION 'Default tenant is missing one or more required application submodules';
  END IF;

  IF EXISTS (
    SELECT expected.id
    FROM (VALUES
      ('status-ready'),
      ('status-patient-arrived'),
      ('status-surgery-start'),
      ('status-surgery-end'),
      ('status-departure'),
      ('status-cleaning')
    ) AS expected(id)
    EXCEPT
    SELECT id
    FROM public.workflow_statuses
    WHERE hospital_id = 'default'
  ) THEN
    RAISE EXCEPTION 'Default tenant is missing required workflow statuses';
  END IF;
END;
$collision_guards$;

INSERT INTO public.hospitals (
  id,
  hospital_name,
  hospital_short_name,
  hospital_country,
  hospital_notes,
  updated_at
)
VALUES (
  'apple-review',
  'Operatingroom Manager – App Review',
  'REVIEW',
  'Česká republika',
  'APP_REVIEW_SYNTHETIC_V1',
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET hospital_name = EXCLUDED.hospital_name,
    hospital_short_name = EXCLUDED.hospital_short_name,
    hospital_country = EXCLUDED.hospital_country,
    hospital_notes = EXCLUDED.hospital_notes,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.app_users (
  id,
  email,
  password_hash,
  name,
  role,
  is_active,
  updated_at
)
VALUES (
  '7bc0b61c-06c4-4eb0-9a8a-d9e54b42a501'::uuid,
  'appreview@operatingroom.eu',
  extensions.crypt(
    pg_catalog.md5(pg_catalog.random()::text || pg_catalog.clock_timestamp()::text),
    extensions.gen_salt('bf', 12)
  ),
  'Apple App Review',
  'admin',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.hospital_user_memberships (
  hospital_id,
  user_id
)
VALUES (
  'apple-review',
  '7bc0b61c-06c4-4eb0-9a8a-d9e54b42a501'
)
ON CONFLICT (hospital_id, user_id) DO NOTHING;

-- Keep review configuration an exact derivative of `default`; remove only
-- stale review-tenant rows whose IDs no longer exist in the source template.
DELETE FROM public.app_submodules AS review_submodule
WHERE review_submodule.hospital_id = 'apple-review'
  AND NOT EXISTS (
    SELECT 1
    FROM public.app_submodules AS source_submodule
    WHERE source_submodule.hospital_id = 'default'
      AND source_submodule.id = review_submodule.id
  );

DELETE FROM public.app_modules AS review_module
WHERE review_module.hospital_id = 'apple-review'
  AND NOT EXISTS (
    SELECT 1
    FROM public.app_modules AS source_module
    WHERE source_module.hospital_id = 'default'
      AND source_module.id = review_module.id
  );

DELETE FROM public.workflow_statuses AS review_status
WHERE review_status.hospital_id = 'apple-review'
  AND NOT EXISTS (
    SELECT 1
    FROM public.workflow_statuses AS source_status
    WHERE source_status.hospital_id = 'default'
      AND source_status.id = review_status.id
  );

DELETE FROM public.app_settings
WHERE hospital_id = 'apple-review'
  AND id <> 'apple-review-global';

-- Clone only audited configuration columns from the default tenant.
INSERT INTO public.app_modules (
  id,
  hospital_id,
  name,
  description,
  is_enabled,
  icon,
  accent_color,
  sort_order,
  allowed_roles,
  created_at,
  updated_at
)
SELECT
  id,
  'apple-review',
  name,
  description,
  is_enabled,
  icon,
  accent_color,
  sort_order,
  allowed_roles,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM public.app_modules
WHERE hospital_id = 'default'
ON CONFLICT (id, hospital_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_enabled = EXCLUDED.is_enabled,
    icon = EXCLUDED.icon,
    accent_color = EXCLUDED.accent_color,
    sort_order = EXCLUDED.sort_order,
    allowed_roles = EXCLUDED.allowed_roles,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.app_submodules (
  id,
  module_id,
  hospital_id,
  name,
  description,
  is_enabled,
  allowed_roles,
  sort_order,
  created_at,
  updated_at
)
SELECT
  id,
  module_id,
  'apple-review',
  name,
  description,
  is_enabled,
  allowed_roles,
  sort_order,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM public.app_submodules
WHERE hospital_id = 'default'
ON CONFLICT (id, hospital_id) DO UPDATE
SET module_id = EXCLUDED.module_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_enabled = EXCLUDED.is_enabled,
    allowed_roles = EXCLUDED.allowed_roles,
    sort_order = EXCLUDED.sort_order,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.workflow_statuses (
  id,
  hospital_id,
  name,
  description,
  accent_color,
  icon,
  sort_order,
  default_duration_minutes,
  is_active,
  is_special,
  special_type,
  include_in_statistics,
  show_in_timeline,
  show_in_room_detail,
  created_at,
  updated_at
)
SELECT
  id,
  'apple-review',
  name,
  description,
  accent_color,
  icon,
  sort_order,
  default_duration_minutes,
  is_active,
  is_special,
  special_type,
  include_in_statistics,
  show_in_timeline,
  show_in_room_detail,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM public.workflow_statuses
WHERE hospital_id = 'default'
ON CONFLICT (id, hospital_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    accent_color = EXCLUDED.accent_color,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    default_duration_minutes = EXCLUDED.default_duration_minutes,
    is_active = EXCLUDED.is_active,
    is_special = EXCLUDED.is_special,
    special_type = EXCLUDED.special_type,
    include_in_statistics = EXCLUDED.include_in_statistics,
    show_in_timeline = EXCLUDED.show_in_timeline,
    show_in_room_detail = EXCLUDED.show_in_room_detail,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.app_settings (
  id,
  hospital_id,
  background_type,
  background_colors,
  background_direction,
  background_opacity,
  background_image_url,
  background_image_opacity,
  background_image_blur,
  background_animation,
  background_animation_speed,
  created_at,
  updated_at
)
SELECT
  'apple-review-global',
  'apple-review',
  background_type,
  background_colors,
  background_direction,
  background_opacity,
  background_image_url,
  background_image_opacity,
  background_image_blur,
  background_animation,
  background_animation_speed,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM public.app_settings
WHERE id = 'default-global'
  AND hospital_id = 'default'
ON CONFLICT (id) DO UPDATE
SET hospital_id = EXCLUDED.hospital_id,
    background_type = EXCLUDED.background_type,
    background_colors = EXCLUDED.background_colors,
    background_direction = EXCLUDED.background_direction,
    background_opacity = EXCLUDED.background_opacity,
    background_image_url = EXCLUDED.background_image_url,
    background_image_opacity = EXCLUDED.background_image_opacity,
    background_image_blur = EXCLUDED.background_image_blur,
    background_animation = EXCLUDED.background_animation,
    background_animation_speed = EXCLUDED.background_animation_speed,
    updated_at = EXCLUDED.updated_at;

-- Start from the default role lists, then make the review account explicit.
-- Timeline needs the admin override because the current default tenant omits it.
UPDATE public.app_modules
SET allowed_roles = pg_catalog.array_remove(
      COALESCE(allowed_roles, ARRAY[]::text[]),
      'admin'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE hospital_id = 'apple-review';

UPDATE public.app_modules
SET allowed_roles = pg_catalog.array_append(allowed_roles, 'admin'),
    updated_at = CURRENT_TIMESTAMP
WHERE hospital_id = 'apple-review'
  AND id IN (
    'dashboard',
    'timeline',
    'flow',
    'statistics',
    'staff',
    'alerts',
    'settings',
    'devices'
  );

UPDATE public.app_submodules
SET allowed_roles = pg_catalog.array_remove(
      COALESCE(allowed_roles, ARRAY[]::text[]),
      'admin'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE hospital_id = 'apple-review';

UPDATE public.app_submodules
SET allowed_roles = pg_catalog.array_append(allowed_roles, 'admin'),
    updated_at = CURRENT_TIMESTAMP
WHERE hospital_id = 'apple-review'
  AND id IN (
    'dashboard.spatial',
    'settings.access',
    'settings.rooms',
    'settings.specialties',
    'settings.schedule',
    'settings.staff',
    'settings.staff-overview',
    'settings.statuses',
    'settings.calendar',
    'settings.notifications',
    'settings.statistics',
    'settings.management',
    'settings.devices'
  );

-- Clear only the review tenant's operational data, children before parents.
-- Legacy/optional tables are discovered dynamically. Before deleting any
-- parent row, lock every cleanup relation and every inbound FK relation. Then
-- fail closed if a row outside the review tenant references a review parent,
-- or if a referencing table has no hospital_id from which isolation can be
-- proven. This prevents ON DELETE CASCADE / SET NULL from modifying another
-- tenant through globally keyed legacy foreign keys.
DO $tenant_cleanup$
DECLARE
  review_hospital constant text := 'apple-review';
  cleanup_tables constant text[] := ARRAY[
    'notifications_log',
    'room_status_history',
    'room_specialty_allocations',
    'safety_checklists',
    'schedules',
    'shift_schedules',
    'equipment',
    'operating_procedures',
    'patients',
    'procedures',
    'spatial_projects',
    'management_contacts',
    'devices',
    'operating_rooms',
    'staff',
    'sub_departments',
    'departments'
  ];
  target_table text;
  relation_to_lock record;
  foreign_key record;
  join_predicate text;
  child_has_hospital_id boolean;
  unsafe_reference_exists boolean;
BEGIN
  -- Validate tenant scoping before taking locks or deleting anything.
  FOREACH target_table IN ARRAY cleanup_tables LOOP
    IF pg_catalog.to_regclass('public.' || target_table) IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS column_definition
      WHERE column_definition.table_schema = 'public'
        AND column_definition.table_name = target_table
        AND column_definition.column_name = 'hospital_id'
    ) THEN
      RAISE EXCEPTION
        'Refusing cleanup: table public.% exists but has no hospital_id',
        target_table;
    END IF;

  END LOOP;

  -- SHARE ROW EXCLUSIVE blocks concurrent INSERT/UPDATE/DELETE on both the
  -- target rows and every table whose FK action could otherwise race the
  -- reference check below. OID ordering gives all seed sessions one lock order.
  FOR relation_to_lock IN
    WITH target_relations AS (
      SELECT relation.oid
      FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace
        ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = ANY(cleanup_tables)
        AND relation.relkind IN ('r', 'p')
    ), relevant_relations AS (
      SELECT oid FROM target_relations
      UNION
      SELECT constraint_definition.conrelid
      FROM pg_catalog.pg_constraint AS constraint_definition
      WHERE constraint_definition.contype = 'f'
        AND constraint_definition.confrelid IN (SELECT oid FROM target_relations)
    )
    SELECT
      namespace.nspname AS schema_name,
      relation.relname AS table_name,
      relation.oid
    FROM relevant_relations
    JOIN pg_catalog.pg_class AS relation
      ON relation.oid = relevant_relations.oid
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE relation.relkind IN ('r', 'p')
    ORDER BY relation.oid
  LOOP
    EXECUTE pg_catalog.format(
      'LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',
      relation_to_lock.schema_name,
      relation_to_lock.table_name
    );
  END LOOP;

  -- Inspect live FK metadata rather than assuming column names. All columns in
  -- a composite FK are paired in ordinal order. A child without hospital_id is
  -- inherently ambiguous and therefore blocks cleanup whenever it references a
  -- review parent.
  FOR foreign_key IN
    SELECT
      constraint_definition.oid,
      constraint_definition.conname,
      constraint_definition.conrelid,
      constraint_definition.confrelid,
      constraint_definition.conkey,
      constraint_definition.confkey,
      child_namespace.nspname AS child_schema,
      child_relation.relname AS child_table,
      parent_namespace.nspname AS parent_schema,
      parent_relation.relname AS parent_table
    FROM pg_catalog.pg_constraint AS constraint_definition
    JOIN pg_catalog.pg_class AS child_relation
      ON child_relation.oid = constraint_definition.conrelid
    JOIN pg_catalog.pg_namespace AS child_namespace
      ON child_namespace.oid = child_relation.relnamespace
    JOIN pg_catalog.pg_class AS parent_relation
      ON parent_relation.oid = constraint_definition.confrelid
    JOIN pg_catalog.pg_namespace AS parent_namespace
      ON parent_namespace.oid = parent_relation.relnamespace
    WHERE constraint_definition.contype = 'f'
      AND parent_namespace.nspname = 'public'
      AND parent_relation.relname = ANY(cleanup_tables)
    ORDER BY constraint_definition.oid
  LOOP
    SELECT pg_catalog.string_agg(
      pg_catalog.format(
        'child_row.%I = parent_row.%I',
        child_attribute.attname,
        parent_attribute.attname
      ),
      ' AND '
      ORDER BY key_position.position
    )
    INTO join_predicate
    FROM pg_catalog.generate_subscripts(foreign_key.conkey, 1)
      AS key_position(position)
    JOIN pg_catalog.pg_attribute AS child_attribute
      ON child_attribute.attrelid = foreign_key.conrelid
     AND child_attribute.attnum = (foreign_key.conkey)[key_position.position]
    JOIN pg_catalog.pg_attribute AS parent_attribute
      ON parent_attribute.attrelid = foreign_key.confrelid
     AND parent_attribute.attnum = (foreign_key.confkey)[key_position.position];

    IF join_predicate IS NULL THEN
      RAISE EXCEPTION
        'Refusing cleanup: cannot resolve columns for inbound FK %',
        foreign_key.conname;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns AS column_definition
      WHERE column_definition.table_schema = foreign_key.child_schema
        AND column_definition.table_name = foreign_key.child_table
        AND column_definition.column_name = 'hospital_id'
    )
    INTO child_has_hospital_id;

    IF child_has_hospital_id THEN
      EXECUTE pg_catalog.format(
        'SELECT EXISTS (' ||
        'SELECT 1 FROM %I.%I AS child_row ' ||
        'JOIN %I.%I AS parent_row ON %s ' ||
        'WHERE parent_row.hospital_id = $1 ' ||
        'AND child_row.hospital_id::text IS DISTINCT FROM $1)',
        foreign_key.child_schema,
        foreign_key.child_table,
        foreign_key.parent_schema,
        foreign_key.parent_table,
        join_predicate
      )
      INTO unsafe_reference_exists
      USING review_hospital;
    ELSE
      EXECUTE pg_catalog.format(
        'SELECT EXISTS (' ||
        'SELECT 1 FROM %I.%I AS child_row ' ||
        'JOIN %I.%I AS parent_row ON %s ' ||
        'WHERE parent_row.hospital_id = $1)',
        foreign_key.child_schema,
        foreign_key.child_table,
        foreign_key.parent_schema,
        foreign_key.parent_table,
        join_predicate
      )
      INTO unsafe_reference_exists
      USING review_hospital;
    END IF;

    IF unsafe_reference_exists THEN
      RAISE EXCEPTION
        'Refusing cleanup: inbound FK % from %.% to %.% is cross-tenant or lacks hospital_id',
        foreign_key.conname,
        foreign_key.child_schema,
        foreign_key.child_table,
        foreign_key.parent_schema,
        foreign_key.parent_table;
    END IF;
  END LOOP;

  FOREACH target_table IN ARRAY cleanup_tables LOOP
    IF pg_catalog.to_regclass('public.' || target_table) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE pg_catalog.format(
      'DELETE FROM public.%I WHERE hospital_id = $1',
      target_table
    ) USING review_hospital;
  END LOOP;
END;
$tenant_cleanup$;

INSERT INTO public.departments (
  id,
  hospital_id,
  name,
  short_code,
  description,
  is_active,
  accent_color,
  sort_order
)
VALUES
  ('review-dept-chir', 'apple-review', 'Chirurgie', 'CHIR', 'Syntetický operační obor pro App Review', true, '#B3004D', 0),
  ('review-dept-trau', 'apple-review', 'Traumatologie', 'TRAU', 'Syntetický operační obor pro App Review', true, '#3B82F6', 1),
  ('review-dept-uro',  'apple-review', 'Urologie', 'URO', 'Syntetický operační obor pro App Review', true, '#22C55E', 2),
  ('review-dept-gyn',  'apple-review', 'Gynekologie', 'GYN', 'Syntetický operační obor pro App Review', true, '#A855F7', 3);

INSERT INTO public.staff (
  id,
  hospital_id,
  name,
  role,
  is_active,
  skill_level,
  availability,
  is_external,
  is_recommended,
  sick_leave_days,
  vacation_days,
  notes
)
VALUES
  ('review-doctor-a', 'apple-review', 'Ukázkový lékař A', 'DOCTOR', true, 'L3', 100, false, true, 0, 0, 'Syntetický personál pro App Review'),
  ('review-doctor-b', 'apple-review', 'Ukázkový lékař B', 'DOCTOR', true, 'L2', 100, false, false, 0, 0, 'Syntetický personál pro App Review'),
  ('review-doctor-c', 'apple-review', 'Ukázkový lékař C', 'DOCTOR', true, 'L2', 100, false, false, 0, 0, 'Syntetický personál pro App Review'),
  ('review-doctor-d', 'apple-review', 'Ukázkový lékař D', 'DOCTOR', true, 'L1', 100, false, false, 0, 0, 'Syntetický personál pro App Review'),
  ('review-nurse-a',  'apple-review', 'Ukázková sestra A', 'NURSE', true, 'L3', 100, false, true, 0, 0, 'Syntetický personál pro App Review'),
  ('review-nurse-b',  'apple-review', 'Ukázková sestra B', 'NURSE', true, 'L2', 100, false, false, 0, 0, 'Syntetický personál pro App Review'),
  ('review-nurse-c',  'apple-review', 'Ukázková sestra C', 'NURSE', true, 'L2', 100, false, false, 0, 0, 'Syntetický personál pro App Review'),
  ('review-nurse-d',  'apple-review', 'Ukázková sestra D', 'NURSE', true, 'L1', 100, false, false, 0, 0, 'Syntetický personál pro App Review');

-- Review rooms are scheduled 24/7 so the UI never changes to "mimo provoz"
-- because Apple tests in an unknown time zone. This is synthetic review data.
WITH active_steps AS (
  SELECT
    id,
    name,
    accent_color,
    (pg_catalog.row_number() OVER (ORDER BY sort_order, id) - 1)::integer AS step_index
  FROM public.workflow_statuses
  WHERE hospital_id = 'apple-review'
    AND is_active = true
    AND is_special = false
),
schedule AS (
  SELECT pg_catalog.jsonb_build_object(
    'monday',    pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
    'tuesday',   pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
    'wednesday', pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
    'thursday',  pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
    'friday',    pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
    'saturday',  pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0),
    'sunday',    pg_catalog.jsonb_build_object('enabled', true, 'startHour', 0, 'startMinute', 0, 'endHour', 23, 'endMinute', 59, 'breakMinutes', 0)
  ) AS value
),
seed_rows AS (
  SELECT *
  FROM (VALUES
    ('review-room-01', 'CHIRURGIE – 1',     'Chirurgie',     'BUSY',     'status-surgery-start',  'review-doctor-a', 'review-nurse-a', 0, 18, 38, 42, 12500::numeric),
    ('review-room-02', 'TRAUMATOLOGIE – 1', 'Traumatologie', 'BUSY',     'status-patient-arrived', 'review-doctor-b', 'review-nurse-b', 1, 5,  5,  75, 11800::numeric),
    ('review-room-03', 'UROLOGIE – 1',      'Urologie',      'FREE',     'status-ready',           'review-doctor-c', 'review-nurse-c', 2, 0,  NULL, NULL, 10200::numeric),
    ('review-room-04', 'GYNEKOLOGIE – 1',   'Gynekologie',   'CLEANING', 'status-cleaning',        'review-doctor-d', 'review-nurse-d', 3, 8,  95, 12, 11000::numeric)
  ) AS rows(
    id,
    name,
    department,
    status,
    workflow_id,
    doctor_id,
    nurse_id,
    sort_order,
    phase_minutes_ago,
    operation_minutes_ago,
    estimate_minutes_from_now,
    hourly_operating_cost
  )
)
INSERT INTO public.operating_rooms (
  id,
  hospital_id,
  name,
  department,
  status,
  queue_count,
  operations_24h,
  is_septic,
  is_emergency,
  is_locked,
  is_enhanced_hygiene,
  is_paused,
  phase_started_at,
  operation_started_at,
  current_step_index,
  estimated_end_time,
  doctor_id,
  nurse_id,
  anesthesiologist_id,
  weekly_schedule,
  status_history,
  completed_operations,
  sort_order,
  hourly_operating_cost,
  state_revision
)
SELECT
  seed_rows.id,
  'apple-review',
  seed_rows.name,
  seed_rows.department,
  seed_rows.status,
  0,
  1,
  false,
  false,
  false,
  false,
  false,
  CURRENT_TIMESTAMP - pg_catalog.make_interval(mins => seed_rows.phase_minutes_ago),
  CASE
    WHEN seed_rows.operation_minutes_ago IS NULL THEN NULL
    ELSE CURRENT_TIMESTAMP - pg_catalog.make_interval(mins => seed_rows.operation_minutes_ago)
  END,
  active_steps.step_index,
  CASE
    WHEN seed_rows.estimate_minutes_from_now IS NULL THEN NULL
    ELSE CURRENT_TIMESTAMP + pg_catalog.make_interval(mins => seed_rows.estimate_minutes_from_now)
  END,
  seed_rows.doctor_id,
  seed_rows.nurse_id,
  NULL,
  schedule.value,
  pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
      'stepIndex', active_steps.step_index,
      'startedAt', CURRENT_TIMESTAMP - pg_catalog.make_interval(mins => seed_rows.phase_minutes_ago),
      'color', active_steps.accent_color,
      'stepName', active_steps.name
    )
  ),
  '[]'::jsonb,
  seed_rows.sort_order,
  seed_rows.hourly_operating_cost,
  0
FROM seed_rows
JOIN active_steps ON active_steps.id = seed_rows.workflow_id
CROSS JOIN schedule;

-- Seven days of measured, synthetic cycles make Timeline and Statistics useful
-- without introducing any patient identifiers.
WITH active_steps AS (
  SELECT
    id,
    name,
    (pg_catalog.row_number() OVER (ORDER BY sort_order, id) - 1)::integer AS step_index
  FROM public.workflow_statuses
  WHERE hospital_id = 'apple-review'
    AND is_active = true
    AND is_special = false
),
room_seed AS (
  SELECT *
  FROM (VALUES
    ('review-room-01', 1),
    ('review-room-02', 2),
    ('review-room-03', 3),
    ('review-room-04', 4)
  ) AS rooms(room_id, room_order)
),
cycle_seed AS (
  SELECT
    room_seed.room_id,
    room_seed.room_order,
    day_offset,
    CURRENT_TIMESTAMP
      - pg_catalog.make_interval(days => day_offset, hours => 4 + room_seed.room_order) AS started_at
  FROM room_seed
  CROSS JOIN pg_catalog.generate_series(0, 6) AS days(day_offset)
),
event_seed AS (
  SELECT
    cycle_seed.*,
    event.event_type,
    event.minute_offset,
    event.duration_seconds,
    event.workflow_id,
    event.fallback_name
  FROM cycle_seed
  CROSS JOIN LATERAL (VALUES
    ('operation_start', 0,  NULL::integer, 'status-patient-arrived', 'Příjezd na sál'),
    ('step_change',    10,  600,           'status-surgery-start',  'Chirurgický výkon'),
    ('step_change',    65,  3300,          'status-surgery-end',    'Ukončení výkonu'),
    ('operation_end',  80,  4800,          'status-cleaning',       'Operation End')
  ) AS event(event_type, minute_offset, duration_seconds, workflow_id, fallback_name)
)
INSERT INTO public.room_status_history (
  id,
  hospital_id,
  operating_room_id,
  event_type,
  step_index,
  step_name,
  duration_seconds,
  "timestamp",
  metadata
)
SELECT
  pg_catalog.gen_random_uuid(),
  'apple-review',
  event_seed.room_id,
  event_seed.event_type,
  active_steps.step_index,
  CASE
    WHEN event_seed.event_type = 'operation_end' THEN event_seed.fallback_name
    ELSE active_steps.name
  END,
  event_seed.duration_seconds,
  event_seed.started_at + pg_catalog.make_interval(mins => event_seed.minute_offset),
  pg_catalog.jsonb_build_object(
    'synthetic', true,
    'source', 'app_review_seed',
    'cycleDayOffset', event_seed.day_offset
  )
FROM event_seed
JOIN active_steps ON active_steps.id = event_seed.workflow_id;

-- Mirror the latest measured cycle in the room snapshot for the fast first
-- dashboard render. Timestamps match the lifecycle log and are de-duplicated by
-- the application when both sources are loaded.
WITH active_steps AS (
  SELECT
    id,
    name,
    accent_color,
    (pg_catalog.row_number() OVER (ORDER BY sort_order, id) - 1)::integer AS step_index
  FROM public.workflow_statuses
  WHERE hospital_id = 'apple-review'
    AND is_active = true
    AND is_special = false
),
room_seed AS (
  SELECT *
  FROM (VALUES
    ('review-room-01', 1),
    ('review-room-02', 2),
    ('review-room-03', 3),
    ('review-room-04', 4)
  ) AS rooms(room_id, room_order)
),
cycle_seed AS (
  SELECT
    room_id,
    CURRENT_TIMESTAMP
      - pg_catalog.make_interval(hours => 4 + room_order) AS started_at
  FROM room_seed
)
UPDATE public.operating_rooms AS room
SET completed_operations = pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'startedAt', cycle_seed.started_at,
        'endedAt', cycle_seed.started_at + pg_catalog.make_interval(mins => 80),
        'statusHistory', pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'stepIndex', arrival.step_index,
            'startedAt', cycle_seed.started_at,
            'color', arrival.accent_color,
            'stepName', arrival.name
          ),
          pg_catalog.jsonb_build_object(
            'stepIndex', surgery.step_index,
            'startedAt', cycle_seed.started_at + pg_catalog.make_interval(mins => 10),
            'color', surgery.accent_color,
            'stepName', surgery.name
          ),
          pg_catalog.jsonb_build_object(
            'stepIndex', surgery_end.step_index,
            'startedAt', cycle_seed.started_at + pg_catalog.make_interval(mins => 65),
            'color', surgery_end.accent_color,
            'stepName', surgery_end.name
          )
        )
      )
    ),
    updated_at = CURRENT_TIMESTAMP
FROM cycle_seed
CROSS JOIN active_steps AS arrival
CROSS JOIN active_steps AS surgery
CROSS JOIN active_steps AS surgery_end
WHERE room.hospital_id = 'apple-review'
  AND room.id = cycle_seed.room_id
  AND arrival.id = 'status-patient-arrived'
  AND surgery.id = 'status-surgery-start'
  AND surgery_end.id = 'status-surgery-end';

WITH room_department AS (
  SELECT *
  FROM (VALUES
    ('review-room-01', 'review-dept-chir'),
    ('review-room-02', 'review-dept-trau'),
    ('review-room-03', 'review-dept-uro'),
    ('review-room-04', 'review-dept-gyn')
  ) AS mapping(room_id, department_id)
)
INSERT INTO public.room_specialty_allocations (
  id,
  hospital_id,
  operating_room_id,
  department_id,
  allocation_date,
  day_part,
  allocation_kind
)
SELECT
  pg_catalog.gen_random_uuid(),
  'apple-review',
  room_department.room_id,
  room_department.department_id,
  CURRENT_DATE + day_offset,
  day_part,
  'SPECIALTY'
FROM room_department
CROSS JOIN pg_catalog.generate_series(0, 7) AS days(day_offset)
CROSS JOIN (VALUES ('AM'), ('PM')) AS parts(day_part);

WITH staff_room AS (
  SELECT *
  FROM (VALUES
    ('review-doctor-a', 'review-room-01'),
    ('review-nurse-a',  'review-room-01'),
    ('review-doctor-b', 'review-room-02'),
    ('review-nurse-b',  'review-room-02'),
    ('review-doctor-c', 'review-room-03'),
    ('review-nurse-c',  'review-room-03'),
    ('review-doctor-d', 'review-room-04'),
    ('review-nurse-d',  'review-room-04')
  ) AS mapping(staff_id, room_id)
)
INSERT INTO public.shift_schedules (
  id,
  hospital_id,
  staff_id,
  operating_room_id,
  shift_date,
  shift_type,
  start_time,
  end_time,
  is_available
)
SELECT
  pg_catalog.format(
    'review-shift-%s-%s',
    staff_room.staff_id,
    pg_catalog.to_char(CURRENT_DATE + day_offset, 'YYYYMMDD')
  ),
  'apple-review',
  staff_room.staff_id,
  staff_room.room_id,
  CURRENT_DATE + day_offset,
  'MORNING',
  '06:00'::time,
  '18:00'::time,
  true
FROM staff_room
CROSS JOIN pg_catalog.generate_series(0, 7) AS days(day_offset);

-- The review password stays a psql variable and is transmitted as a protocol
-- bind parameter. \gset captures only booleans; no secret is printed.
SELECT public.set_membership_password(
  '7bc0b61c-06c4-4eb0-9a8a-d9e54b42a501'::uuid,
  'apple-review'::text,
  $1::text
) AS app_review_password_set
\bind :app_review_password
\gset

\if :app_review_password_set
\else
  \echo 'ERROR: set_membership_password did not update the review membership.'
  SELECT 1 / 0 AS app_review_password_not_set;
\endif

SELECT (
  SELECT pg_catalog.count(*) = 1
  FROM public.verify_membership_password(
    'appreview@operatingroom.eu'::text,
    $1::text,
    'apple-review'::text
  )
) AS app_review_password_verified
\bind :app_review_password
\gset

\unset app_review_password

\if :app_review_password_verified
\else
  \echo 'ERROR: membership password verification failed.'
  SELECT 1 / 0 AS app_review_password_not_verified;
\endif

-- Transactional postconditions. Any deviation rolls the entire seed back.
DO $postconditions$
DECLARE
  review_user_id constant uuid := '7bc0b61c-06c4-4eb0-9a8a-d9e54b42a501'::uuid;
BEGIN
  IF (SELECT pg_catalog.count(*) FROM public.hospitals WHERE id = 'apple-review') <> 1 THEN
    RAISE EXCEPTION 'Review tenant postcondition failed';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM public.app_users WHERE id = review_user_id AND role = 'admin' AND is_active) <> 1 THEN
    RAISE EXCEPTION 'Review user postcondition failed';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM public.hospital_user_memberships WHERE user_id = review_user_id::text) <> 1
     OR (SELECT pg_catalog.count(*) FROM public.hospital_user_memberships WHERE user_id = review_user_id::text AND hospital_id = 'apple-review' AND password_hash IS NOT NULL AND password_changed_at IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'Review membership isolation or password postcondition failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.app_modules
    WHERE hospital_id = 'apple-review'
      AND id = 'timeline'
      AND 'admin' = ANY(COALESCE(allowed_roles, ARRAY[]::text[]))
  ) THEN
    RAISE EXCEPTION 'Timeline admin override is missing';
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
    RAISE EXCEPTION 'A sensitive settings submodule is available to the review admin';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM public.departments WHERE hospital_id = 'apple-review') <> 4
     OR (SELECT pg_catalog.count(*) FROM public.staff WHERE hospital_id = 'apple-review') <> 8
     OR (SELECT pg_catalog.count(*) FROM public.operating_rooms WHERE hospital_id = 'apple-review') <> 4
     OR (SELECT pg_catalog.count(*) FROM public.room_status_history WHERE hospital_id = 'apple-review') <> 112
     OR (SELECT pg_catalog.count(*) FROM public.room_specialty_allocations WHERE hospital_id = 'apple-review') <> 64
     OR (SELECT pg_catalog.count(*) FROM public.shift_schedules WHERE hospital_id = 'apple-review') <> 64 THEN
    RAISE EXCEPTION 'Synthetic dataset row-count postcondition failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.operating_rooms
    WHERE hospital_id = 'apple-review'
      AND id NOT LIKE 'review-room-%'
  ) OR EXISTS (
    SELECT 1
    FROM public.staff
    WHERE hospital_id = 'apple-review'
      AND id NOT LIKE 'review-%'
  ) OR EXISTS (
    SELECT 1
    FROM public.departments
    WHERE hospital_id = 'apple-review'
      AND id NOT LIKE 'review-dept-%'
  ) THEN
    RAISE EXCEPTION 'Non-synthetic identifier found in review operational data';
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
    RAISE EXCEPTION 'A review room does not have the exact synthetic 24/7 schedule';
  END IF;

  IF EXISTS (SELECT 1 FROM public.management_contacts WHERE hospital_id = 'apple-review')
     OR EXISTS (SELECT 1 FROM public.devices WHERE hospital_id = 'apple-review') THEN
    RAISE EXCEPTION 'Review tenant must not contain management contacts or devices';
  END IF;
END;
$postconditions$;

COMMIT;

\set QUIET 0
\echo 'App Review tenant seed committed. Run verify.sql before the first review login.'
