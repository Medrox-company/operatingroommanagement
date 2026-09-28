-- ════════════════════════════════════════════════════════════════════════
-- Pročištění pozůstatku sloupce operating_rooms.anesthesiologist_id
--
-- POZOR — NESPOUŠTĚT BEZ ROZHODNUTÍ. Kontrola živých dat ukázala, že sloupec
-- NENÍ prázdný pozůstatek: na 11 sálech drží jediné přiřazení lékaře, které
-- tam je (doctor_id je u nich NULL):
--
--   ORTOPEDIE, Sál č. 7, PCHO SÁL Č.2, NEUROCHIRURGIE - 1, TRAUMATOLOGIE - 1,
--   COS NO SÁL Č.3, DaVinci, SÁL Č. 4, Sál č. 5, ORL - ÚČOCH - OČNÍ,
--   TRAUMATOLOGIE - 3
--
-- Prosté DROP COLUMN by tedy o tato přiřazení připravilo.
--
-- Krok 1 níž je proto povinný: přesune anesteziologa do doctor_id tam, kde
-- žádný lékař není. Teprve pak má smysl sloupec odstranit.
--
-- Před spuštěním je nutné rozhodnout: je anesteziolog v dnešním rozhraní
-- totéž co dlaždice „Lékař"? Pokud ne, přiřazení se nesmí slučovat a sloupec
-- musí zůstat i s podporou v kódu.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Krok 0: záloha dotčených řádků ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS operating_rooms_anesthesiologist_backup AS
SELECT id, name, hospital_id, doctor_id, anesthesiologist_id, now() AS backed_up_at
FROM operating_rooms
WHERE anesthesiologist_id IS NOT NULL;

-- ── Krok 1: převzít anesteziologa jako lékaře tam, kde lékař chybí ──────
UPDATE operating_rooms
SET doctor_id = anesthesiologist_id
WHERE anesthesiologist_id IS NOT NULL
  AND doctor_id IS NULL;

-- ── Kontrola: nesmí zůstat sál, kde by se přiřazení ztratilo ────────────
DO $$
DECLARE
  zbyva integer;
BEGIN
  SELECT count(*) INTO zbyva
  FROM operating_rooms
  WHERE anesthesiologist_id IS NOT NULL
    AND doctor_id IS DISTINCT FROM anesthesiologist_id;

  IF zbyva > 0 THEN
    RAISE EXCEPTION
      'Na % sálech je anesteziolog odlišný od lékaře. Sloupec nelze odstranit bez rozhodnutí, co s těmito přiřazeními.', zbyva;
  END IF;
END $$;

-- ── Krok 2: odstranit sloupec ───────────────────────────────────────────
-- Odkomentovat teprve po nasazení verze aplikace, která sloupec nečte
-- (lib/db.ts, hooks/useOperatingRoomsData.ts, App.tsx).
--
-- ALTER TABLE operating_rooms DROP COLUMN IF EXISTS anesthesiologist_id;

COMMIT;

-- Zálohu lze po ověření odstranit:
--   DROP TABLE operating_rooms_anesthesiologist_backup;
