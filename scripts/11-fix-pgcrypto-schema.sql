-- Fix: pgcrypto v Supabase je v schématu "extensions", ne v "public".
-- Nekvalifikované volání crypt()/gen_salt() pak selže s "function does not exist".
-- Řešení: přepíšeme RPC funkci s explicitním search_path a použijeme
-- extensions.crypt(...) / extensions.gen_salt(...) pro seed hashů.

-- 1) Ujistíme se, že pgcrypto je nainstalován (v Supabase do extensions).
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2) Přegenerujeme bcrypt hashe pro demo účty pomocí plně kvalifikovaných funkcí.
-- Tím se opraví i případ, kdy INSERT v předchozí migraci neproběhl správně
-- (crypt nebyl nalezen v search_path -> NULL hash).
UPDATE public.app_users
SET password_hash = extensions.crypt('admin123', extensions.gen_salt('bf', 10))
WHERE lower(email) = 'admin@nemocnice.cz';

UPDATE public.app_users
SET password_hash = extensions.crypt('user123', extensions.gen_salt('bf', 10))
WHERE lower(email) = 'user@nemocnice.cz';

UPDATE public.app_users
SET password_hash = extensions.crypt('aro123', extensions.gen_salt('bf', 10))
WHERE lower(email) = 'aro@nemocnice.cz';

UPDATE public.app_users
SET password_hash = extensions.crypt('cos123', extensions.gen_salt('bf', 10))
WHERE lower(email) = 'cos@nemocnice.cz';

UPDATE public.app_users
SET password_hash = extensions.crypt('mgmt123', extensions.gen_salt('bf', 10))
WHERE lower(email) = 'management@nemocnice.cz';

UPDATE public.app_users
SET password_hash = extensions.crypt('primar123', extensions.gen_salt('bf', 10))
WHERE lower(email) = 'primar@nemocnice.cz';

-- 3) Přepíšeme verify_user_password:
--    a) SECURITY DEFINER - běží s právy vlastníka (superuser), čímž obchází RLS
--       i přísný search_path služebních rolí;
--    b) SET search_path = public, extensions - crypt() tam bude nalezen;
--    c) Parametry p_email / p_password - vyhýbáme se konfliktu s názvy sloupců.
CREATE OR REPLACE FUNCTION public.verify_user_password(p_email text, p_password text)
RETURNS TABLE (id uuid, email text, name text, role text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.role, u.is_active
  FROM public.app_users u
  WHERE lower(u.email) = lower(p_email)
    AND u.is_active = true
    AND u.password_hash IS NOT NULL
    AND u.password_hash = extensions.crypt(p_password, u.password_hash);
END;
$$;

-- 4) Oprávnění: funkci smí volat jen service_role (náš server přes service klíč).
REVOKE ALL ON FUNCTION public.verify_user_password(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_user_password(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_password(text, text) TO service_role;

-- 5) Diagnostika — vypíšeme, zda hashe existují pro všechny demo účty.
DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing
  FROM public.app_users
  WHERE lower(email) IN (
    'admin@nemocnice.cz','user@nemocnice.cz','aro@nemocnice.cz',
    'cos@nemocnice.cz','management@nemocnice.cz','primar@nemocnice.cz'
  )
  AND password_hash IS NULL;

  RAISE NOTICE 'Demo účtů bez password_hash: %', missing;
END$$;
