-- ════════════════════════════════════════════════════════════════════════
-- Kontrola databázových práv a RLS politik (bezpečnostní audit 2026-10).
--
-- POUZE ČTENÍ. Žádný UPDATE, INSERT, DELETE, GRANT ani REVOKE — dotazy nic
-- nemění a lze je bezpečně spustit i na produkci.
--
-- Spuštění: Supabase → SQL Editor → vložit → Run (každý dotaz zvlášť).
-- Výstup pošlete zpět; podle něj se připraví zpřísňující skript. Repozitář
-- obsahuje SQL skripty i migrace, ale ne informaci, které z nich a v jakém
-- pořadí na produkci skutečně proběhly.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Tabulky bez zapnutého RLS ───────────────────────────────────────
-- Očekávání: prázdný výsledek. Každý řádek je tabulka, kterou čte nebo
-- mění kdokoli s anon/authenticated klíčem bez omezení na zařízení.
SELECT c.relname AS tabulka
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
ORDER BY 1;

-- ── 2) Co smí role anon (veřejný klíč z prohlížeče) ────────────────────
-- Očekávání: prázdný výsledek. Anon klíč je veřejný; nesmí mít žádné právo.
SELECT table_name AS tabulka, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS prava
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee = 'anon'
GROUP BY table_name
ORDER BY 1;

-- ── 3) Zápisová práva přihlášeného klienta (authenticated) ─────────────
-- Klient z prohlížeče dostává JWT se zařízením a rolí. Tady je vidět, které
-- tabulky může měnit přímo, bez serverové kontroly role (správce/sestra…).
-- Pozor hlavně na: room_status_history (historie a statistiky), patients,
-- workflow_statuses, app_settings, management_contacts, notifications_log.
SELECT table_name AS tabulka, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS prava
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee = 'authenticated'
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
GROUP BY table_name
ORDER BY 1;

-- ── 4) Sloupcová práva UPDATE (operating_rooms a další) ────────────────
SELECT table_name AS tabulka, string_agg(column_name, ', ' ORDER BY column_name) AS sloupce
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
GROUP BY table_name
ORDER BY 1;

-- ── 5) Všechny RLS politiky ────────────────────────────────────────────
-- Hledáme USING (true) / WITH CHECK (true) a politiky FOR ALL, které
-- nekontrolují roli v JWT (app_role).
SELECT tablename AS tabulka, policyname AS politika, cmd AS prikaz, roles,
       qual AS podminka_using, with_check AS podminka_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── 6) Funkce volatelné z prohlížeče (SECURITY DEFINER) ────────────────
-- Funkce s SECURITY DEFINER běží s právy vlastníka. Smí je volat jen
-- service_role (server), pokud nejsou výslovně určené pro klienta.
SELECT p.proname AS funkce,
       pg_get_function_identity_arguments(p.oid) AS argumenty,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_smi,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_smi
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY 1;
