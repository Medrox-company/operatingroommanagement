BEGIN;

-- Jednotlivé dlaždice rozcestníku Nastavení jsou samostatné podmoduly.
-- Tím získá superadministrátor stejnou tenantovou kontrolu nad jejich
-- viditelností jako nad hlavními moduly a panely Nastavení systému.
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
  COALESCE(module.allowed_roles, ARRAY[]::text[]),
  definition.sort_order
FROM public.app_modules AS module
CROSS JOIN (VALUES
  ('settings.rooms', 'Operační sály', 'Správa a konfigurace operačních sálů', 10),
  ('settings.specialties', 'Operační obory', 'Správa oborů používaných v rozpisu sálů', 11),
  ('settings.schedule', 'Rozpis sálů', 'Plánování a správa rozpisu sálů', 12),
  ('settings.staff', 'Personál', 'Správa zaměstnanců a jejich přiřazení', 13),
  ('settings.staff-overview', 'Přehled personálu', 'Přehled dostupnosti personálu', 14),
  ('settings.statuses', 'Statusy', 'Konfigurace workflow statusů operací', 15),
  ('settings.calendar', 'Kalendář', 'Správa kalendáře a událostí', 16),
  ('settings.notifications', 'Notifikace', 'Správa upozornění a oznámení', 17),
  ('settings.statistics', 'Statistiky', 'Přehled metrik a výkonu systému', 18),
  ('settings.management', 'Management', 'Správa kontaktů na management', 19),
  ('settings.devices', 'Správa zařízení', 'Přehled registrovaných zařízení a jejich správa', 20)
) AS definition(id, name, description, sort_order)
WHERE module.id = 'settings'
ON CONFLICT (id, hospital_id) DO NOTHING;

COMMIT;
