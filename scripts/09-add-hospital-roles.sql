-- Add new hospital role demo users (ARO, COS, Management, Primar)
-- The role column is already text (no CHECK constraint), so we can just insert.
-- Password verification is handled application-side in AuthContext (demo mode).

-- Make sure pgcrypto is available for gen_random_uuid (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Optional: add allowed_roles column to app_modules so we can control module visibility per role.
-- Admin always sees all modules (enforced in app layer). NULL/empty = visible to all roles.
ALTER TABLE public.app_modules
  ADD COLUMN IF NOT EXISTS allowed_roles text[];

-- Seed sensible defaults for existing modules based on typical hospital workflow
-- Admin is always allowed (handled application-side), so we just specify non-admin roles here.
UPDATE public.app_modules SET allowed_roles = ARRAY['aro','cos','management','primar','user']   WHERE id = 'dashboard'  AND allowed_roles IS NULL;
UPDATE public.app_modules SET allowed_roles = ARRAY['aro','cos','management','primar','user']   WHERE id = 'timeline'   AND allowed_roles IS NULL;
UPDATE public.app_modules SET allowed_roles = ARRAY['management','primar','cos','user']         WHERE id = 'statistics' AND allowed_roles IS NULL;
UPDATE public.app_modules SET allowed_roles = ARRAY['cos','management','user']                  WHERE id = 'staff'      AND allowed_roles IS NULL;
UPDATE public.app_modules SET allowed_roles = ARRAY['aro','cos','management','primar','user']   WHERE id = 'alerts'     AND allowed_roles IS NULL;
-- 'settings' intentionally left with NULL allowed_roles → admin-only (enforced by isAdmin check in UI)
