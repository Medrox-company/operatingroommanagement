-- 15-google-identity-superadmin.sql
--
-- Propojení Google identity (Supabase Auth) s účtem superadministrátora
-- v tabulce app_users.
--
-- Přihlášení přes Google probíhá takto:
--   1. prohlížeč se přihlásí u Googlu přes Supabase Auth
--   2. server ověří vydaný token, porovná e-mail se seznamem povolených adres
--      (proměnná prostředí SUPERADMIN_GOOGLE_EMAILS — záměrně mimo databázi)
--   3. server dohledá řádek v app_users podle google_email a vystaví or_session
--
-- Seznam povolených adres NENÍ v databázi schválně: kdyby se někdo dostal
-- k zápisu do app_users, nemohl by si tím sám přidělit superadmin přístup.
-- Databáze říká "která adresa patří ke kterému účtu", proměnná prostředí
-- říká "která adresa vůbec smí dovnitř". Musí platit obojí.

BEGIN;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS google_email      text,
  ADD COLUMN IF NOT EXISTS google_subject    text,
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at     timestamptz;

COMMENT ON COLUMN public.app_users.google_email IS
  'E-mail Google účtu propojeného s tímto uživatelem. Sám o sobě přístup nedává — adresa musí být i v SUPERADMIN_GOOGLE_EMAILS.';
COMMENT ON COLUMN public.app_users.google_subject IS
  'Stabilní identifikátor Google účtu (claim sub). Vyplní se při prvním úspěšném přihlášení a dál se kontroluje — chrání před změnou vlastníka e-mailové adresy.';
COMMENT ON COLUMN public.app_users.mfa_enrolled_at IS
  'Kdy uživatel dokončil nastavení dvoufázového ověření.';

-- Jedna Google adresa smí patřit nejvýš jednomu účtu.
CREATE UNIQUE INDEX IF NOT EXISTS app_users_google_email_key
  ON public.app_users (lower(google_email))
  WHERE google_email IS NOT NULL;

-- Propojení účtu superadministrátora se zadanou adresou.
UPDATE public.app_users
   SET google_email = 'jedlicka.jaroslav@gmail.com'
 WHERE role = 'superadmin'
   AND email = 'superadmin@nemocnice.cz';

COMMIT;

-- Kontrola:
--   SELECT email, role, google_email, mfa_enrolled_at FROM app_users WHERE role = 'superadmin';
--
-- ODBLOKOVÁNÍ PŘI ZTRÁTĚ TELEFONU (viz docs/prihlaseni-google-nastaveni.md):
--   Smazání MFA faktoru se provádí v Supabase, ne tady:
--     DELETE FROM auth.mfa_factors
--      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jedlicka.jaroslav@gmail.com');
--     UPDATE public.app_users SET mfa_enrolled_at = NULL WHERE role = 'superadmin';
--   Při dalším přihlášení projde znovu průvodce nastavením.
