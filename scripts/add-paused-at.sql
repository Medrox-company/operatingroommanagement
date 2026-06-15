-- Přidá sloupec paused_at pro zobrazení úseku pauzy na časové ose.
-- Spusť v Supabase SQL editoru.
ALTER TABLE operating_rooms
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;
