BEGIN;

-- Remove inherited Supabase default table grants from the installed migration.
-- Finishing evidence remains writable only by its internal transition trigger.
REVOKE ALL ON public.acute_request_cycle_links FROM service_role;
GRANT SELECT, INSERT ON public.acute_request_cycle_links TO service_role;

COMMIT;
