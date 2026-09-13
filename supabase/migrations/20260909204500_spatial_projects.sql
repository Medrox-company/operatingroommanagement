BEGIN;

CREATE TABLE IF NOT EXISTS public.spatial_projects (
  hospital_id text PRIMARY KEY REFERENCES public.hospitals(id) ON DELETE CASCADE,
  project jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  CONSTRAINT spatial_projects_object_check CHECK (jsonb_typeof(project) = 'object'),
  CONSTRAINT spatial_projects_schema_check CHECK ((project ->> 'schemaVersion')::integer = 1),
  CONSTRAINT spatial_projects_units_check CHECK (project ->> 'units' = 'm')
);

CREATE INDEX IF NOT EXISTS spatial_projects_updated_at_idx
  ON public.spatial_projects(updated_at DESC);

ALTER TABLE public.spatial_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spatial_projects FROM anon, authenticated;
GRANT ALL ON public.spatial_projects TO service_role;

COMMENT ON TABLE public.spatial_projects IS
  'Verzovaný 3D model operačního traktu pro každé zdravotnické zařízení.';
COMMENT ON COLUMN public.spatial_projects.project IS
  'Kanonický ORMS Spatial JSON; vazba místnosti na operating_rooms je v externalId.';

COMMIT;
