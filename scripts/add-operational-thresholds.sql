-- ════════════════════════════════════════════════════════════════════════
-- Provozní prahy upozornění do nastavení zařízení
--
-- Do teď byly zadrátované v kódu:
--   • 5 minut  — dotaz při potvrzení podezřele krátké fáze
--   • 30 minut — varování, že úklid sálu přesahuje obvyklou dobu
--   • 5 minut  — banner „podezřele rychlý výkon"
--   • 15 minut — tolerance pozdního startu prvního výkonu dne
--
-- Každý operační trakt má jiné normály, proto patří do konfigurace.
-- Aplikace sloupce nevyžaduje: když chybí, použije stejné výchozí hodnoty
-- jako dosud (viz hooks/useOperationalThresholds.ts).
--
-- SPUSTIT RUČNĚ v Supabase → SQL Editor. Skript je idempotentní.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS threshold_short_phase_minutes     integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS threshold_cleaning_warning_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS threshold_rapid_surgery_minutes   integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS threshold_first_case_grace_minutes integer NOT NULL DEFAULT 15;

-- Nesmyslné hodnoty by upozornění potichu vypnuly.
ALTER TABLE app_settings
  DROP CONSTRAINT IF EXISTS app_settings_thresholds_positive;

ALTER TABLE app_settings
  ADD CONSTRAINT app_settings_thresholds_positive CHECK (
    threshold_short_phase_minutes      BETWEEN 1 AND 240
    AND threshold_cleaning_warning_minutes BETWEEN 1 AND 240
    AND threshold_rapid_surgery_minutes    BETWEEN 1 AND 240
    AND threshold_first_case_grace_minutes BETWEEN 1 AND 240
  );

COMMENT ON COLUMN app_settings.threshold_short_phase_minutes IS
  'Kratší fáze vyvolá dotaz při potvrzení přechodu.';
COMMENT ON COLUMN app_settings.threshold_cleaning_warning_minutes IS
  'Úklid delší než tato doba hlásí varování v detailu sálu.';
COMMENT ON COLUMN app_settings.threshold_rapid_surgery_minutes IS
  'Výkon kratší než tato doba označí banner podezřele rychlého výkonu.';
COMMENT ON COLUMN app_settings.threshold_first_case_grace_minutes IS
  'Tolerance pozdního startu prvního výkonu dne ve statistikách.';
