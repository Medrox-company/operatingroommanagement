-- Přidat sloupce s informacemi o zdravotnickém zařízení (nemocnici) do app_settings
-- Tyto údaje se využívají pro identifikaci instance aplikace a v notifikacích/reportech.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS hospital_name           text,
  ADD COLUMN IF NOT EXISTS hospital_short_name     text,
  ADD COLUMN IF NOT EXISTS hospital_address        text,
  ADD COLUMN IF NOT EXISTS hospital_city           text,
  ADD COLUMN IF NOT EXISTS hospital_zip            text,
  ADD COLUMN IF NOT EXISTS hospital_country        text DEFAULT 'Česká republika',
  ADD COLUMN IF NOT EXISTS hospital_ico            text,
  ADD COLUMN IF NOT EXISTS hospital_contact_phone  text,
  ADD COLUMN IF NOT EXISTS hospital_contact_email  text,
  ADD COLUMN IF NOT EXISTS hospital_notes          text;

-- Zajistit, že existuje alespoň jeden řádek app_settings (default).
-- V kódu se čte podle id='default'.
INSERT INTO app_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
