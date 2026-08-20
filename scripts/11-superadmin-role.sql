-- ============================================================================
-- 11 — Zavedení role „superadmin"
--
-- Role `user` („Uživatel") se přejmenovává na `superadmin`
-- („Superadministrátor"). Superadministrátor stojí NAD administrátorem:
--   • má přístup ke všem modulům bez ohledu na app_modules.allowed_roles,
--   • jako jediný smí měnit, které role vidí které moduly,
--   • není vázaný na členství v konkrétní nemocnici (stejně jako admin).
--
-- Skript je idempotentní — opakované spuštění nic nerozbije.
-- Zpětný krok je v souboru 11-superadmin-role-rollback.sql.
-- ============================================================================

BEGIN;

-- 1) CHECK constraint na app_users.role musí novou hodnotu povolit.
--    Původní hodnota 'user' zůstává povolená kvůli starším záznamům.
DO $$
DECLARE r record;
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

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('superadmin','admin','user','aro','cos','management','primar'));

-- 2) pgcrypto kvůli crypt() / gen_salt() níže
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3) Demo účet: user@nemocnice.cz → superadmin@nemocnice.cz
--    Heslo se nastavuje nově na „super123" (bcrypt přes pgcrypto).
UPDATE public.app_users
SET role          = 'superadmin',
    email         = 'superadmin@nemocnice.cz',
    name          = 'Superadministrátor',
    password_hash = crypt('super123', gen_salt('bf')),
    is_active     = true,
    updated_at    = now()
WHERE email = 'user@nemocnice.cz';

-- 4) Případné další účty s rolí 'user' povýšit také
UPDATE public.app_users
SET role = 'superadmin', updated_at = now()
WHERE role = 'user';

-- 5) Účet nemusí existovat (čistá instalace) — pak ho založíme
INSERT INTO public.app_users (id, email, name, role, is_active, password_hash)
SELECT gen_random_uuid(), 'superadmin@nemocnice.cz', 'Superadministrátor', 'superadmin', true,
       crypt('super123', gen_salt('bf'))
WHERE NOT EXISTS (SELECT 1 FROM public.app_users WHERE role = 'superadmin');

-- 6) allowed_roles: hodnota 'user' už neexistuje, odstranit ji ze všech modulů.
--    Superadmin se do seznamů nedoplňuje — přístup ke všemu má z principu,
--    vynucuje ho aplikace (viz AuthContext.hasModuleAccess).
UPDATE public.app_modules
SET allowed_roles = array_remove(allowed_roles, 'user'),
    updated_at    = now()
WHERE allowed_roles IS NOT NULL
  AND 'user' = ANY(allowed_roles);

COMMIT;

-- Kontrola po spuštění:
--   SELECT email, name, role FROM app_users ORDER BY role;
--   SELECT id, allowed_roles FROM app_modules ORDER BY hospital_id, sort_order;
