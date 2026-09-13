BEGIN;

-- 3D dispozice je alternativní pohled uvnitř dashboardu, proto má vlastní
-- oprávnění jako podmodul. Výchozí role kopírují přístup k dashboardu,
-- takže nasazení samo o sobě nikomu nezmění dosavadní chování.
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
  coalesce(module.allowed_roles, ARRAY[]::text[]),
  1
FROM public.app_modules AS module
WHERE module.id = 'dashboard'
ON CONFLICT (id, hospital_id) DO UPDATE
SET module_id   = EXCLUDED.module_id,
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    is_enabled  = EXCLUDED.is_enabled,
    sort_order  = EXCLUDED.sort_order,
    updated_at  = now();

COMMIT;
