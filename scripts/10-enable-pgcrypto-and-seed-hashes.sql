-- Enable pgcrypto (poskytuje crypt() a gen_salt('bf') pro bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Pro jistotu: zajisti sloupec password_hash (pokud schéma ho už nemá)
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS password_hash text;

-- Seed / update demo účtů (UPSERT). Hesla zůstávají stejná jako dosud.
INSERT INTO app_users (email, name, role, is_active, password_hash)
VALUES
  ('admin@nemocnice.cz',      'Administrátor',           'admin',      true, crypt('admin123',  gen_salt('bf', 10))),
  ('user@nemocnice.cz',       'Uživatel',                'user',       true, crypt('user123',   gen_salt('bf', 10))),
  ('aro@nemocnice.cz',        'ARO oddělení',            'aro',        true, crypt('aro123',    gen_salt('bf', 10))),
  ('cos@nemocnice.cz',        'Centrální operační sály', 'cos',        true, crypt('cos123',    gen_salt('bf', 10))),
  ('management@nemocnice.cz', 'Management',              'management', true, crypt('mgmt123',   gen_salt('bf', 10))),
  ('primar@nemocnice.cz',     'Primariát',               'primar',     true, crypt('primar123', gen_salt('bf', 10)))
ON CONFLICT (email) DO UPDATE SET
  name          = EXCLUDED.name,
  role          = EXCLUDED.role,
  is_active     = EXCLUDED.is_active,
  password_hash = EXCLUDED.password_hash,
  updated_at    = NOW();

-- RPC pro bezpečné ověření hesla. Volá se výhradně ze serveru se service role key.
-- Vrací záznam uživatele BEZ password_hash jen pokud heslo sedí, jinak NULL.
CREATE OR REPLACE FUNCTION verify_user_password(
  p_email    text,
  p_password text
)
RETURNS TABLE (
  id         uuid,
  email      text,
  name       text,
  role       text,
  is_active  boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.role, u.is_active
  FROM app_users u
  WHERE lower(u.email) = lower(p_email)
    AND u.is_active = true
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$;

-- Povolit volání pouze ze service role (RLS bypass). Anon/authenticated NESMÍ.
REVOKE ALL ON FUNCTION verify_user_password(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION verify_user_password(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_user_password(text, text) TO service_role;
