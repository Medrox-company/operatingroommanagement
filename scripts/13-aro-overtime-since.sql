-- ============================================================================
-- 13 — Okamžik vstupu sálu do přesahu pracovní doby
--
-- Pořadové číslo u ikony ARO v Timeline má odpovídat tomu, který sál zaznamenal
-- přesah jako PRVNÍ. Dosud se pořadí odvozovalo z okamžiku, kdy si přesahu
-- všiml prohlížeč (uloženo jen v paměti záložky). Po obnovení stránky se
-- pořadí ztratilo a každé zařízení mohlo ukazovat jiné číslo.
--
-- Nový sloupec drží čas přechodu do přesahu v databázi, takže je pořadí
-- stabilní napříč obnovením stránky i mezi zařízeními.
-- ============================================================================

BEGIN;

ALTER TABLE public.operating_rooms
  ADD COLUMN IF NOT EXISTS aro_overtime_since timestamptz;

COMMENT ON COLUMN public.operating_rooms.aro_overtime_since IS
  'Okamžik, kdy odhad konce sálu poprvé překročil pracovní dobu. NULL = sál není v přesahu. Určuje pořadí čísel u ikony ARO.';

-- Rychlé řazení sálů v přesahu podle pořadí vstupu
CREATE INDEX IF NOT EXISTS operating_rooms_aro_overtime_idx
  ON public.operating_rooms (hospital_id, aro_overtime_since)
  WHERE aro_overtime_since IS NOT NULL;

COMMIT;

-- Kontrola:
--   SELECT name, aro_overtime_since FROM operating_rooms
--   WHERE aro_overtime_since IS NOT NULL ORDER BY aro_overtime_since;
