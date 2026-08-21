-- 14-lock-app-users-rls.sql
--
-- KRITICKÁ BEZPEČNOSTNÍ OPRAVA
--
-- Tabulka app_users měla RLS zapnuté, ale politiky ve tvaru USING (true)
-- pro roli `public`. Veřejný anon klíč (ten, který je součástí JS bundlu
-- v prohlížeči) tak mohl:
--   - číst všechny účty včetně sloupce password_hash
--   - měnit a mazat účty
--
-- Ověřeno reálným dotazem:
--   GET /rest/v1/app_users?select=email,role,password_hash  -> 200 + data
--   PATCH /rest/v1/app_users?email=eq....                   -> 204
--
-- Na app_users sahá výhradně serverový kód přes SUPABASE_SERVICE_ROLE_KEY
-- (lib/supabase-server.ts, app/api/admin/*, app/api/auth/login).
-- Servisní klíč RLS obchází, takže po odstranění politik aplikace funguje
-- beze změny, ale anonymní přístup skončí na 401.

BEGIN;

DROP POLICY IF EXISTS app_users_read   ON public.app_users;
DROP POLICY IF EXISTS app_users_write  ON public.app_users;
DROP POLICY IF EXISTS app_users_update ON public.app_users;
DROP POLICY IF EXISTS app_users_delete ON public.app_users;

-- Pojistka: RLS musí zůstat zapnuté, jinak by absence politik znamenala
-- povolení všeho.
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Explicitně odebrat práva anonymní a přihlášené roli na úrovni grantů.
-- (Druhá vrstva obrany, kdyby někdo v budoucnu politiku omylem přidal.)
REVOKE ALL ON public.app_users FROM anon;
REVOKE ALL ON public.app_users FROM authenticated;

COMMIT;

-- Kontrola po spuštění:
--   SELECT count(*) FROM pg_policies WHERE tablename = 'app_users';  -> 0
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'app_users';  -> t
