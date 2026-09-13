BEGIN;

-- Tok pacienta byl historicky v klientovi přístupný napevno a proto neměl
-- vlastní řádek v app_modules. Doplněním tenantového záznamu ho superadmin
-- může zapínat, vypínat a přidělovat rolím stejně jako ostatní moduly.
INSERT INTO public.app_modules (
  id,
  hospital_id,
  name,
  description,
  is_enabled,
  icon,
  accent_color,
  sort_order,
  allowed_roles
)
SELECT
  'flow',
  hospital.id,
  'Tok pacienta',
  'Živý přehled toku pacientů operačním traktem',
  true,
  'Workflow',
  '#22D3EE',
  2,
  ARRAY['admin', 'aro', 'cos', 'management', 'primar']::text[]
FROM public.hospitals AS hospital
ON CONFLICT (id, hospital_id) DO NOTHING;

COMMIT;
