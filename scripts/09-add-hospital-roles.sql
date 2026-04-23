-- Add new hospital role demo users (ARO, COS, Management, Primar)
-- First we must widen the CHECK constraint on app_users.role to accept new values.

-- 1) Drop existing CHECK constraint on role (name may vary between setups, so drop defensively)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.app_users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.app_users DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Recreate a permissive CHECK with all supported roles
ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('admin','user','aro','cos','management','primar'));

-- 3) Make sure pgcrypto is available for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4) Insert / upsert demo accounts
-- ARO (Anestheziologicko-resuscitační oddělení)
INSERT INTO public.app_users (id, email, name, role, is_active, password_hash)
VALUES (gen_random_uuid(), 'aro@nemocnice.cz', 'ARO oddělení', 'aro', true, '$demo$aro123')
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_active = true,
      updated_at = now();

-- COS (Centrální operační sály)
INSERT INTO public.app_users (id, email, name, role, is_active, password_hash)
VALUES (gen_random_uuid(), 'cos@nemocnice.cz', 'Centrální operační sály', 'cos', true, '$demo$cos123')
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_active = true,
      updated_at = now();

-- Management
INSERT INTO public.app_users (id, email, name, role, is_active, password_hash)
VALUES (gen_random_uuid(), 'management@nemocnice.cz', 'Management', 'management', true, '$demo$mgmt123')
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_active = true,
      updated_at = now();

-- Primar (Primářské přehledy)
INSERT INTO public.app_users (id, email, name, role, is_active, password_hash)
VALUES (gen_random_uuid(), 'primar@nemocnice.cz', 'Primariát', 'primar', true, '$demo$primar123')
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_active = true,
      updated_at = now();

-- 5) Add allowed_roles column to app_modules for per-role module visibility
ALTER TABLE public.app_modules
  ADD COLUMN IF NOT EXISTS allowed_roles text[];

-- 6) Seed reasonable defaults (admin always has access, enforced application-side)
UPDATE public.app_modules SET allowed_roles = ARRAY['aro','cos','management','primar','user']   WHERE id = 'dashboard'  AND allowed_roles IS NULL;
UPDATE public.app_modules SET allowed_roles = ARRAY['aro','cos','management','primar','user']   WHERE id = 'timeline'   AND allowed_roles IS NULL;
UPDATE public.app_modules SET allowed_roles = ARRAY['management','primar','cos','user']         WHERE id = 'statistics' AND allowed_roles IS NULL;
UPDATE public.app_modules SET allowed_roles = ARRAY['cos','management','user']                  WHERE id = 'staff'      AND allowed_roles IS NULL;
UPDATE public.app_modules SET allowed_roles = ARRAY['aro','cos','management','primar','user']   WHERE id = 'alerts'     AND allowed_roles IS NULL;
-- 'settings' left NULL → admin-only (enforced in UI)
