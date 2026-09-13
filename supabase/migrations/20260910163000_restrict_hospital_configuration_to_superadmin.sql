BEGIN;

-- Zdravotnická zařízení jsou globální konfigurace a nejsou přidělitelným
-- podmodulem. Superadministrátor má přístup z pevné aplikační role.
UPDATE public.app_submodules
SET
  allowed_roles = array_remove(COALESCE(allowed_roles, ARRAY[]::text[]), 'admin'),
  updated_at = now()
WHERE id = 'settings.hospital';

-- Tyto sloupce byly pouze přechodnou kopií při zavedení multi-hospital režimu.
-- Autoritativní data jsou v public.hospitals, která není dostupná rolím
-- authenticated. Odstranění kopií zabraňuje jejich čtení přes tenant RLS na
-- app_settings i opětovnému naplnění klientem.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_settings'
      AND column_name = 'hospital_notes'
  ) THEN
    EXECUTE $backfill$
      WITH legacy AS (
        SELECT DISTINCT ON (hospital_id)
          hospital_id,
          hospital_short_name,
          hospital_address,
          hospital_city,
          hospital_zip,
          hospital_country,
          hospital_ico,
          hospital_contact_phone,
          hospital_contact_email,
          hospital_notes
        FROM public.app_settings
        ORDER BY hospital_id, updated_at DESC NULLS LAST
      )
      UPDATE public.hospitals AS hospital
      SET
        hospital_short_name = COALESCE(hospital.hospital_short_name, legacy.hospital_short_name),
        hospital_address = COALESCE(hospital.hospital_address, legacy.hospital_address),
        hospital_city = COALESCE(hospital.hospital_city, legacy.hospital_city),
        hospital_zip = COALESCE(hospital.hospital_zip, legacy.hospital_zip),
        hospital_country = COALESCE(hospital.hospital_country, legacy.hospital_country),
        hospital_ico = COALESCE(hospital.hospital_ico, legacy.hospital_ico),
        hospital_contact_phone = COALESCE(hospital.hospital_contact_phone, legacy.hospital_contact_phone),
        hospital_contact_email = COALESCE(hospital.hospital_contact_email, legacy.hospital_contact_email),
        hospital_notes = COALESCE(hospital.hospital_notes, legacy.hospital_notes)
      FROM legacy
      WHERE hospital.id = legacy.hospital_id
    $backfill$;
  END IF;
END $$;

ALTER TABLE public.app_settings
  DROP COLUMN IF EXISTS hospital_name,
  DROP COLUMN IF EXISTS hospital_short_name,
  DROP COLUMN IF EXISTS hospital_address,
  DROP COLUMN IF EXISTS hospital_city,
  DROP COLUMN IF EXISTS hospital_zip,
  DROP COLUMN IF EXISTS hospital_country,
  DROP COLUMN IF EXISTS hospital_ico,
  DROP COLUMN IF EXISTS hospital_contact_phone,
  DROP COLUMN IF EXISTS hospital_contact_email,
  DROP COLUMN IF EXISTS hospital_notes;

COMMIT;
