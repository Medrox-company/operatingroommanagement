BEGIN;

ALTER TABLE public.app_submodules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_submodules_tenant_select ON public.app_submodules;
CREATE POLICY app_submodules_tenant_select
ON public.app_submodules
FOR SELECT
TO authenticated
USING (hospital_id = ((SELECT auth.jwt()) ->> 'hospital_id'));

DROP POLICY IF EXISTS app_submodules_superadmin_update ON public.app_submodules;
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

COMMIT;
