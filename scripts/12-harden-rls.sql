-- =====================================================================
-- 12 — Zpřísnění Row Level Security (RLS)
-- =====================================================================
-- PROBLÉM: Původní politiky (01-create-schema.sql) povolují VŠEM —
-- včetně anonymního klíče, který je veřejně dostupný v klientském
-- bundle — číst, zapisovat i mazat data ve všech tabulkách
-- (USING (true) / WITH CHECK (true)). U nemocniční aplikace je to
-- kritická díra: kdokoli se znalostí URL projektu a anon klíče může
-- číst/měnit data včetně tabulky pacientů a uživatelských účtů.
--
-- TENTO SKRIPT (bezpečné minimum, nerozbije aplikaci):
--   1. Citlivé tabulky (app_users, patients, devices, notifications_log)
--      úplně uzavře pro anon/authenticated roli — přístup k nim má jen
--      server přes service_role (API routes), který RLS obchází.
--   2. U ostatních tabulek ponechá anon čtení (klient je čte přímo
--      a používá Realtime), ale ZÁPIS je téma k další fázi — viz
--      poznámka níže.
--
-- DALŠÍ FÁZE (doporučeno): přesunout klientské zápisy (staff,
-- operating_rooms, management_contacts, shift_schedules, …) z přímého
-- Supabase přístupu do autentizovaných API routes a poté odebrat
-- i write politiky těchto tabulek. Do té doby zápis těchto tabulek
-- zůstává otevřený, jinak by přestaly fungovat moduly Personál,
-- Timeline a Správa.
--
-- Spusťte v Supabase SQL editoru.
-- =====================================================================

-- ── 1. app_users: pouze service_role (přihlašování řeší server) ──────
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='app_users' LOOP
    EXECUTE format('DROP POLICY %I ON public.app_users', r.policyname);
  END LOOP;
END $$;
-- Žádná politika = anon/authenticated nemají přístup; service_role RLS obchází.
REVOKE ALL ON public.app_users FROM anon, authenticated;

-- ── 2. patients: pouze service_role (klient tabulku nepoužívá) ───────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='patients' LOOP
    EXECUTE format('DROP POLICY %I ON public.patients', r.policyname);
  END LOOP;
END $$;
REVOKE ALL ON public.patients FROM anon, authenticated;

-- ── 3. devices: pouze service_role (přístup jen přes /api/devices) ───
ALTER TABLE IF EXISTS public.devices ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='devices' LOOP
    EXECUTE format('DROP POLICY %I ON public.devices', r.policyname);
  END LOOP;
END $$;
REVOKE ALL ON public.devices FROM anon, authenticated;

-- ── 4. notifications_log: anon jen čtení (statistiky), zápis server ──
ALTER TABLE IF EXISTS public.notifications_log ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='notifications_log' LOOP
    EXECUTE format('DROP POLICY %I ON public.notifications_log', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "notifications_log_read" ON public.notifications_log
  FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.notifications_log FROM anon, authenticated;

-- ── 5. management_contacts: anon jen čtení (zápis jde přes API) ──────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
   WHERE schemaname='public' AND tablename='management_contacts'
     AND policyname NOT ILIKE '%read%' AND policyname NOT ILIKE '%select%' LOOP
    EXECUTE format('DROP POLICY %I ON public.management_contacts', r.policyname);
  END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE ON public.management_contacts FROM anon, authenticated;

-- ── Kontrola: vypiš zbývající politiky ───────────────────────────────
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
