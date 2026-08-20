-- ============================================================================
-- 12 — Podmoduly a omezitelný administrátor
--
-- 1) Nová tabulka app_submodules — části uvnitř modulu, kterým jde nastavit
--    přístup zvlášť. Zatím pokrývá pět panelů modulu Nastavení.
-- 2) Role 'admin' se doplňuje do allowed_roles všech stávajících modulů, aby
--    ji superadministrátor mohl odebírat. Do teď měl administrátor přístup
--    ke všemu napevno z aplikace.
--
-- Superadministrátora se to netýká — ten má přístup ke všemu z principu
-- a v allowed_roles se nevede.
--
-- Skript je idempotentní.
-- ============================================================================

BEGIN;

-- ── 1) Tabulka podmodulů ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_submodules (
  id            text        NOT NULL,
  module_id     text        NOT NULL,
  hospital_id   text        NOT NULL DEFAULT 'default',
  name          text        NOT NULL,
  description   text,
  is_enabled    boolean     NOT NULL DEFAULT true,
  allowed_roles text[],
  sort_order    integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, hospital_id)
);

CREATE INDEX IF NOT EXISTS app_submodules_module_idx
  ON public.app_submodules (hospital_id, module_id, sort_order);

-- ── 2) Naplnění: panely modulu Nastavení, pro každou nemocnici ──────────────
INSERT INTO public.app_submodules (id, module_id, hospital_id, name, description, allowed_roles, sort_order)
SELECT s.id, 'settings', h.id, s.name, s.description, s.roles, s.sort_order
FROM (VALUES
  ('settings.hospital',    'Zdravotnické zařízení',  'Údaje o nemocnici a její nastavení',        ARRAY['admin']::text[], 1),
  ('settings.modules',     'Správa modulů',          'Přístup rolí k modulům a podmodulům',       ARRAY['admin']::text[], 2),
  ('settings.diagnostics', 'Rychlost a připojení',   'Diagnostika výkonu a stavu spojení',        ARRAY['admin']::text[], 3),
  ('settings.database',    'Administrace databáze',  'Zálohy, export a obnova dat',               ARRAY['admin']::text[], 4),
  ('settings.access',      'Přihlášení a přístup',   'Účet, odhlášení a přehled oprávnění',       ARRAY['admin']::text[], 5)
) AS s(id, name, description, roles, sort_order)
CROSS JOIN (SELECT DISTINCT hospital_id AS id FROM public.app_modules) AS h
ON CONFLICT (id, hospital_id) DO NOTHING;

-- ── 3) Administrátor se stává omezitelnou rolí ──────────────────────────────
-- Dosud měl přístup ke všemu napevno, takže v allowed_roles nebyl. Doplníme
-- ho všude, kde chybí — výchozí stav tedy odpovídá dosavadnímu chování
-- a superadministrátor mu může přístup odebrat.
UPDATE public.app_modules
SET allowed_roles = coalesce(allowed_roles, ARRAY[]::text[]) || ARRAY['admin'],
    updated_at    = now()
WHERE NOT ('admin' = ANY(coalesce(allowed_roles, ARRAY[]::text[])));

COMMIT;

-- Kontrola:
--   SELECT id, allowed_roles FROM app_modules ORDER BY hospital_id, sort_order;
--   SELECT id, module_id, name, allowed_roles FROM app_submodules ORDER BY hospital_id, sort_order;
