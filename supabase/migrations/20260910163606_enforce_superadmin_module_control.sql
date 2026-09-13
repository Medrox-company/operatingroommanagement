BEGIN;

-- app_modules se čtou v klientovi, ale jejich aktivaci a role smí měnit jen
-- superadministrátor. Původní tenant_isolation bylo FOR ALL a dovolovalo
-- změnu allowed_roles libovolné přihlášené roli stejného tenantu.
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.app_modules;
DROP POLICY IF EXISTS app_modules_tenant_select ON public.app_modules;
DROP POLICY IF EXISTS app_modules_superadmin_update ON public.app_modules;

CREATE POLICY app_modules_tenant_select
ON public.app_modules
FOR SELECT
TO authenticated
USING (hospital_id = ((SELECT auth.jwt()) ->> 'hospital_id'));

CREATE POLICY app_modules_superadmin_update
ON public.app_modules
FOR UPDATE
TO authenticated
USING (
  hospital_id = ((SELECT auth.jwt()) ->> 'hospital_id')
  AND ((SELECT auth.jwt()) ->> 'app_role') = 'superadmin'
)
WITH CHECK (
  hospital_id = ((SELECT auth.jwt()) ->> 'hospital_id')
  AND ((SELECT auth.jwt()) ->> 'app_role') = 'superadmin'
);

REVOKE ALL ON public.app_modules FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.app_modules FROM authenticated;
GRANT SELECT, UPDATE ON public.app_modules TO authenticated;

-- Stejný explicitní kontrakt platí pro podmoduly.
ALTER TABLE public.app_submodules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_submodules_tenant_select ON public.app_submodules;
DROP POLICY IF EXISTS app_submodules_superadmin_update ON public.app_submodules;

CREATE POLICY app_submodules_tenant_select
ON public.app_submodules
FOR SELECT
TO authenticated
USING (hospital_id = ((SELECT auth.jwt()) ->> 'hospital_id'));

CREATE POLICY app_submodules_superadmin_update
ON public.app_submodules
FOR UPDATE
TO authenticated
USING (
  hospital_id = ((SELECT auth.jwt()) ->> 'hospital_id')
  AND ((SELECT auth.jwt()) ->> 'app_role') = 'superadmin'
)
WITH CHECK (
  hospital_id = ((SELECT auth.jwt()) ->> 'hospital_id')
  AND ((SELECT auth.jwt()) ->> 'app_role') = 'superadmin'
);

REVOKE ALL ON public.app_submodules FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.app_submodules FROM authenticated;
GRANT SELECT, UPDATE ON public.app_submodules TO authenticated;

-- Doplnění chybějících nastavení podmodulů pro dříve vytvořená zařízení.
-- Správa modulů se administrátorovi zpřístupní pouze tam, kde už má povolen
-- nadřazený modul Nastavení. Ostatní citlivé panely zůstávají fail-closed.
INSERT INTO public.app_submodules (
  id,
  module_id,
  hospital_id,
  name,
  description,
  is_enabled,
  allowed_roles,
  sort_order
)
SELECT
  definition.id,
  'settings',
  module.hospital_id,
  definition.name,
  definition.description,
  true,
  CASE
    WHEN definition.id = 'settings.modules'
      AND 'admin' = ANY(COALESCE(module.allowed_roles, ARRAY[]::text[]))
      THEN ARRAY['admin']::text[]
    ELSE ARRAY[]::text[]
  END,
  definition.sort_order
FROM public.app_modules AS module
CROSS JOIN (VALUES
  ('settings.hospital', 'Zdravotnické zařízení', 'Údaje o nemocnici a její nastavení', 1),
  ('settings.modules', 'Správa modulů', 'Přístup rolí k modulům a podmodulům', 2),
  ('settings.diagnostics', 'Rychlost a připojení', 'Diagnostika výkonu a stavu spojení', 3),
  ('settings.database', 'Administrace databáze', 'Zálohy, export a obnova dat', 4),
  ('settings.access', 'Přihlášení a přístup', 'Účet, odhlášení a přehled oprávnění', 5)
) AS definition(id, name, description, sort_order)
WHERE module.id = 'settings'
ON CONFLICT (id, hospital_id) DO NOTHING;

INSERT INTO public.app_submodules (
  id,
  module_id,
  hospital_id,
  name,
  description,
  is_enabled,
  allowed_roles,
  sort_order
)
SELECT
  'dashboard.spatial',
  'dashboard',
  module.hospital_id,
  '3D dispozice',
  'Zobrazení prostorového modelu sálů a přístup k jeho editoru',
  true,
  COALESCE(module.allowed_roles, ARRAY[]::text[]),
  1
FROM public.app_modules AS module
WHERE module.id = 'dashboard'
ON CONFLICT (id, hospital_id) DO NOTHING;

COMMIT;
