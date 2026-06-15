-- Přidá sloupec enhanced_hygiene_at — čas aktivace zvýšeného hygienického režimu
-- (infekční pacient), aby šlo na časové ose umístit marker v daný čas.
-- Spusť v Supabase SQL editoru.
ALTER TABLE operating_rooms
  ADD COLUMN IF NOT EXISTS enhanced_hygiene_at timestamptz;
