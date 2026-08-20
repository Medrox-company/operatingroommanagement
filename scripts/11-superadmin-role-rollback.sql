-- ============================================================================
-- Zpětný krok k migraci 11 — návrat role `superadmin` na `user`
-- Spouštět jen tehdy, když je potřeba vrátit stav před zavedením
-- superadministrátora.
-- ============================================================================

BEGIN;

UPDATE public.app_users
SET role          = 'user',
    email         = 'user@nemocnice.cz',
    name          = 'Uživatel',
    password_hash = crypt('user123', gen_salt('bf')),
    updated_at    = now()
WHERE email = 'superadmin@nemocnice.cz';

UPDATE public.app_users
SET role = 'user', updated_at = now()
WHERE role = 'superadmin';

-- Vrácení role 'user' do modulů, kde byla původně
UPDATE public.app_modules
SET allowed_roles = allowed_roles || ARRAY['user'],
    updated_at    = now()
WHERE id IN ('dashboard','timeline','staff','devices')
  AND allowed_roles IS NOT NULL
  AND NOT ('user' = ANY(allowed_roles));

ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('admin','user','aro','cos','management','primar'));

COMMIT;
