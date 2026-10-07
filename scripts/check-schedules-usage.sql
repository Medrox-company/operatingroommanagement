-- ════════════════════════════════════════════════════════════════════════
-- Ověření, jestli se rozpis sálů (tabulka schedules) v praxi vyplňuje.
--
-- POUZE ČTENÍ. Žádný UPDATE, INSERT ani DELETE — dotazy nic nemění
-- a lze je bezpečně spustit i na produkci.
--
-- Spuštění: Supabase → SQL Editor → vložit → Run.
-- Pošlete mi výstup všech pěti dotazů; podle nich se rozhodne, jestli má
-- smysl stavět report „Spolehlivost rozpisu" (plán proti realitě, přetažení,
-- zrušené a odložené výkony).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Je tam vůbec něco, a za jaké období? ─────────────────────────────
-- Klíčová otázka. Pokud je celkem 0 řádků, report nemá z čeho vzniknout.
SELECT
  count(*)                                    AS zaznamu_celkem,
  count(DISTINCT hospital_id)                 AS zarizeni,
  count(DISTINCT operating_room_id)           AS salu,
  min(scheduled_date)                         AS nejstarsi_den,
  max(scheduled_date)                         AS nejnovejsi_den,
  count(*) FILTER (WHERE scheduled_date >= current_date - 90) AS za_poslednich_90_dni
FROM schedules;

-- ── 2) Jak jsou záznamy úplné? ──────────────────────────────────────────
-- Plán proti realitě potřebuje čas i předpokládanou délku. Pokud je
-- duration_minutes převážně NULL, přetažení se spočítat nedá.
SELECT
  count(*)                                               AS zaznamu,
  count(scheduled_time)                                  AS ma_cas,
  count(duration_minutes)                                AS ma_delku,
  count(*) FILTER (WHERE duration_minutes > 0)           AS ma_kladnou_delku,
  count(patient_id)                                      AS ma_pacienta,
  count(procedure_id)                                    AS ma_vykon,
  round(100.0 * count(duration_minutes) / nullif(count(*), 0), 1) AS procent_s_delkou
FROM schedules
WHERE scheduled_date >= current_date - 180;

-- ── 3) Jaké stavy se používají? ─────────────────────────────────────────
-- Zrušené a odložené výkony jde vykázat jen tehdy, když se stav opravdu
-- mění. Pokud je tu jediná hodnota 'PLANNED', nikdo stavy nepřepíná.
SELECT
  coalesce(status, '(NULL)')  AS stav,
  count(*)                    AS pocet,
  min(scheduled_date)         AS od,
  max(scheduled_date)         AS do
FROM schedules
GROUP BY 1
ORDER BY pocet DESC;

-- ── 4) Plní se průběžně, nebo to byl jednorázový import? ────────────────
-- Dvanáct měsíců zpět. Rovnoměrná čísla = rozpis se používá.
-- Jeden měsíc s vysokým číslem a pak nic = zkušební import.
SELECT
  to_char(scheduled_date, 'YYYY-MM')  AS mesic,
  count(*)                            AS naplanovano,
  count(DISTINCT operating_room_id)   AS salu,
  count(DISTINCT scheduled_date)      AS dnu
FROM schedules
WHERE scheduled_date >= date_trunc('month', current_date) - interval '12 months'
GROUP BY 1
ORDER BY 1 DESC;

-- ── 5) Dá se plán spárovat se skutečností? ──────────────────────────────
-- Report stojí na tom, že k naplánovanému výkonu existuje v historii
-- odpovídající skutečný start téhož sálu v týž den. Tohle ukáže, u kolika
-- procent plánů takový záznam existuje.
WITH plan AS (
  SELECT id, hospital_id, operating_room_id, scheduled_date
  FROM schedules
  WHERE scheduled_date BETWEEN current_date - 90 AND current_date
),
skutecnost AS (
  SELECT DISTINCT operating_room_id, (timestamp AT TIME ZONE 'Europe/Prague')::date AS den
  FROM room_status_history
  WHERE event_type IN ('operation_start', 'step_change')
    AND timestamp >= current_date - 90
)
SELECT
  count(*)                                        AS planu_za_90_dni,
  count(s.operating_room_id)                      AS s_dohledanou_skutecnosti,
  round(100.0 * count(s.operating_room_id) / nullif(count(*), 0), 1) AS procent_sparovanych
FROM plan p
LEFT JOIN skutecnost s
  ON s.operating_room_id = p.operating_room_id
 AND s.den = p.scheduled_date;

-- ════════════════════════════════════════════════════════════════════════
-- Jak výsledek čtu:
--
--   Dotaz 1 vrátí 0 záznamů          → rozpis se nepoužívá, report vynechám.
--   Dotaz 2: procent_s_delkou < 50   → přetažení nespočítám, zbytek ano.
--   Dotaz 3: jediný stav 'PLANNED'   → zrušené výkony vykázat nelze.
--   Dotaz 4 nerovnoměrný             → jednorázový import, ne provozní data.
--   Dotaz 5: procent_sparovanych < 60 → párování plánu a skutečnosti
--                                       potřebuje jiný klíč než sál + den.
-- ════════════════════════════════════════════════════════════════════════
