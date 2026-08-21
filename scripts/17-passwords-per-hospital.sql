-- 17-passwords-per-hospital.sql
--
-- Hesla rolí nově patří ke dvojici role + nemocnice, ne k roli globálně.
--
-- Před touto migrací měla každá role jedno heslo pro všechna zařízení.
-- Účet cos@nemocnice.cz měl členství v Liberci i v Hradci a stejné heslo
-- otevíralo obojí — sestra z jednoho zařízení se dostala do druhého jen
-- přepnutím v rozbalovacím seznamu. Změna hesla navíc dopadala na všechny
-- nemocnice zároveň, přestože panel tvrdil, že spravuje jednu.
--
-- Superadministrátor zůstává mimo: přihlašuje se přes Google s dvoufázovým
-- ověřením a má přístup ke všem zařízením.
--
-- Administrátor se nově váže na nemocnici stejně jako provozní role.
-- Aby o přístup nepřišel, dostane v kroku 2 členství ve všech existujících
-- zařízeních se svým dosavadním heslem.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Heslo u členství
-- ---------------------------------------------------------------------------

ALTER TABLE public.hospital_user_memberships
  ADD COLUMN IF NOT EXISTS password_hash       text,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

COMMENT ON COLUMN public.hospital_user_memberships.password_hash IS
  'Bcrypt otisk hesla pro tuto roli v této nemocnici. NULL znamená, že role se do zařízení zatím přihlásit nemůže.';

-- ---------------------------------------------------------------------------
-- 2. Administrátor nesmí přijít o přístup
-- ---------------------------------------------------------------------------
-- Do teď měl globální přístup bez ohledu na členství. Od této migrace se
-- řídí členstvím, takže mu ho dopředu založíme ve všech zařízeních.

INSERT INTO public.hospital_user_memberships (hospital_id, user_id)
SELECT h.id, u.id::text
  FROM public.hospitals h
 CROSS JOIN public.app_users u
 WHERE u.role = 'admin'
ON CONFLICT (hospital_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Převzetí dosavadních hesel
-- ---------------------------------------------------------------------------
-- Aby se po nasazení nikdo neocitl venku, každé členství zdědí dosavadní
-- heslo své role. Od té chvíle je ale možné je měnit po jednotlivých
-- zařízeních nezávisle.

UPDATE public.hospital_user_memberships m
   SET password_hash = u.password_hash
  FROM public.app_users u
 WHERE u.id::text = m.user_id
   AND m.password_hash IS NULL
   AND u.password_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Ověření hesla proti konkrétní nemocnici
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_membership_password(
  p_email       text,
  p_password    text,
  p_hospital_id text
)
RETURNS TABLE(id uuid, email text, name text, role text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Superadministrátor má přístup ke všem zařízením, heslo je u účtu.
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.role, u.is_active
    FROM public.app_users u
   WHERE lower(u.email) = lower(p_email)
     AND u.role = 'superadmin'
     AND u.is_active = true
     AND u.password_hash IS NOT NULL
     AND u.password_hash = extensions.crypt(p_password, u.password_hash);

  IF FOUND THEN
    RETURN;
  END IF;

  -- Ostatní role: heslo patří ke členství ve vybraném zařízení.
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.role, u.is_active
    FROM public.app_users u
    JOIN public.hospital_user_memberships m
      ON m.user_id = u.id::text
   WHERE lower(u.email) = lower(p_email)
     AND u.role <> 'superadmin'
     AND u.is_active = true
     AND m.hospital_id = p_hospital_id
     AND m.password_hash IS NOT NULL
     AND m.password_hash = extensions.crypt(p_password, m.password_hash);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Nastavení hesla pro konkrétní nemocnici
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_membership_password(
  p_user_id     uuid,
  p_hospital_id text,
  p_password    text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_updated integer;
  v_role    text;
BEGIN
  IF p_password IS NULL OR length(p_password) < 10 THEN
    RAISE EXCEPTION 'Heslo musí mít alespoň 10 znaků';
  END IF;

  SELECT role INTO v_role FROM public.app_users WHERE id = p_user_id;

  IF v_role = 'superadmin' THEN
    -- Superadministrátor nemá heslo vázané na zařízení.
    UPDATE public.app_users
       SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
           password_changed_at = now()
     WHERE id = p_user_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
  END IF;

  UPDATE public.hospital_user_memberships
     SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
         password_changed_at = now()
   WHERE user_id = p_user_id::text
     AND hospital_id = p_hospital_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_membership_password(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_membership_password(uuid, text, text)     FROM PUBLIC, anon, authenticated;

COMMIT;

-- Kontrola:
--   SELECT h.hospital_name, u.email, u.role, (m.password_hash IS NOT NULL) AS ma_heslo
--     FROM hospital_user_memberships m
--     JOIN app_users u ON u.id::text = m.user_id
--     JOIN hospitals h ON h.id = m.hospital_id
--    ORDER BY h.hospital_name, u.role;
