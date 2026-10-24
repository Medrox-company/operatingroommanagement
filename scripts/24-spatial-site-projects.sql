-- Mapa areálu (3D) — jedna mapa na zařízení. Stejný model ukládání jako
-- 3D dispozice operačního bloku (scripts/23-spatial-projects.sql): celý
-- projekt jako JSON, optimistické zamykání přes revizi, přístup jen přes
-- service role na serveru. Skript spouští správce databáze ručně.
BEGIN;

CREATE TABLE IF NOT EXISTS public.spatial_site_projects (
  hospital_id text PRIMARY KEY REFERENCES public.hospitals(id) ON DELETE CASCADE,
  project jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  CONSTRAINT spatial_site_projects_object_check CHECK (jsonb_typeof(project) = 'object'),
  CONSTRAINT spatial_site_projects_kind_check CHECK (project ->> 'kind' = 'site'),
  CONSTRAINT spatial_site_projects_schema_check CHECK ((project ->> 'schemaVersion')::integer = 1),
  CONSTRAINT spatial_site_projects_units_check CHECK (project ->> 'units' = 'm')
);

CREATE INDEX IF NOT EXISTS spatial_site_projects_updated_at_idx
  ON public.spatial_site_projects(updated_at DESC);

ALTER TABLE public.spatial_site_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spatial_site_projects FROM anon, authenticated;
GRANT ALL ON public.spatial_site_projects TO service_role;

COMMIT;
