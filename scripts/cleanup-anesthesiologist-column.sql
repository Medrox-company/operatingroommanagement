-- ════════════════════════════════════════════════════════════════════════
-- Odstranění pozůstatku operating_rooms.anesthesiologist_id
--
-- Rozhodnuto: anesteziolog a lékař jsou na sále tatáž role. Jediné platné
-- pole je doctor_id; anesthesiologist_id je pozůstatek vývoje aplikace a
-- jména v něm (na 11 sálech) jsou zastaralá, nikoli aktuální přiřazení.
-- Nepřenášejí se tedy nikam — sloupec se pouze odstraní.
--
-- POŘADÍ JE ZÁVAZNÉ:
--   1. Nasadit verzi aplikace, která sloupec nečte ani do něj nezapisuje
--      (větev zlepseni/rychle-vyhry — lib/db.ts, App.tsx,
--      hooks/useOperatingRoomsData.ts).
--   2. Teprve pak spustit tento skript.
-- Obráceně by běžící produkce dostala chybu „column does not exist".
--
-- POZNÁMKA K MIGRACÍM: sloupec je jmenovitě uveden ve column-level grantu
-- v supabase/migrations/20260910171139_restrict_settings_direct_writes.sql
-- a v scripts/01-create-schema.sql. Postgres přidružené oprávnění při DROP
-- COLUMN zruší sám, takže na běžící databázi nic nerozbije — ale při
-- zakládání databáze od nuly je nutné sloupec vyřadit i z těchto souborů,
-- jinak se rovnou vytvoří znovu.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Záloha ──────────────────────────────────────────────────────────────
-- Data sice považujeme za zastaralá, ale smazání sloupce je nevratné.
-- Tabulku lze po ověření kdykoli odstranit (viz konec skriptu).
CREATE TABLE IF NOT EXISTS operating_rooms_anesthesiologist_backup AS
SELECT
  r.id,
  r.name,
  r.hospital_id,
  r.doctor_id,
  r.anesthesiologist_id,
  s.name AS anesthesiologist_name,
  now()  AS backed_up_at
FROM operating_rooms r
LEFT JOIN staff s ON s.id = r.anesthesiologist_id
WHERE r.anesthesiologist_id IS NOT NULL;

-- ── Kontrolní výpis ─────────────────────────────────────────────────────
-- Kolik řádků se zálohovalo. Mělo by odpovídat počtu sálů s vyplněným
-- anesteziologem (při posledním zjištění 11).
DO $$
DECLARE
  zaloha integer;
BEGIN
  SELECT count(*) INTO zaloha FROM operating_rooms_anesthesiologist_backup;
  RAISE NOTICE 'Zálohováno % řádků s anesthesiologist_id.', zaloha;
END $$;

-- ── Odstranění sloupce ──────────────────────────────────────────────────
ALTER TABLE operating_rooms DROP COLUMN IF EXISTS anesthesiologist_id;

COMMIT;

-- Zálohu lze po ověření, že přiřazení personálu v aplikaci sedí, odstranit:
--   DROP TABLE operating_rooms_anesthesiologist_backup;
