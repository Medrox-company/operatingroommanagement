-- =====================================================================
-- Přidání sloupce is_enhanced_hygiene do operating_rooms
-- =====================================================================
-- Aplikace (App.tsx → handleEnhancedHygieneToggle → updateOperatingRoom)
-- zapisuje příznak „zvýšený hygienický režim", ale sloupec v DB chyběl,
-- takže každý zápis selhal s chybou PostgREST (v konzoli „Error updating
-- operating room: {}").
--
-- Spusťte v Supabase SQL editoru.
-- =====================================================================

ALTER TABLE operating_rooms
  ADD COLUMN IF NOT EXISTS is_enhanced_hygiene BOOLEAN DEFAULT false;

-- Volitelné: aby se změna ihned propisovala přes Realtime, je tabulka
-- už nastavená přes scripts/enable-realtime.sql (REPLICA IDENTITY FULL).
