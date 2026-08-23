-- 16-set-user-password.sql
--
-- Nastavení hesla uživatele. Heslo se hashuje bcryptem přímo v databázi,
-- takže se nikde neobjeví v otevřené podobě — ani v aplikačním kódu,
-- ani v logu dotazů.
--
-- Kdo smí heslo měnit, řeší aplikace (app/api/admin/user-password/route.ts).
-- Funkce je SECURITY DEFINER a volá se výhradně servisním klíčem, takže se
-- k ní běžný klient nedostane — RLS ani granty pro anon/authenticated
-- na app_users neexistují (viz scripts/19).

BEGIN;

CREATE OR REPLACE FUNCTION public.set_user_password(
  p_user_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_updated integer;
BEGIN
  -- Pojistka na úrovni databáze. Aplikace kontroluje víc, ale tohle platí
  -- i kdyby se funkce volala odjinud.
  IF p_password IS NULL OR length(p_password) < 10 THEN
    RAISE EXCEPTION 'Heslo musí mít alespoň 10 znaků';
  END IF;

  UPDATE public.app_users
     SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
         password_changed_at = now()
   WHERE id = p_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$function$;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

COMMENT ON FUNCTION public.set_user_password(uuid, text) IS
  'Nastaví bcrypt hash hesla. Volat pouze servisním klíčem ze serverové části aplikace.';

-- Ať se k funkci nedostane nikdo přes veřejný klíč.
REVOKE ALL ON FUNCTION public.set_user_password(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_password(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.set_user_password(uuid, text) FROM authenticated;

COMMIT;

-- Kontrola:
--   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'set_user_password';
