-- Informační zpráva administrátora cílená na konkrétní operační sál.
-- Zobrazí se jako popup v detailu daného sálu; zavřením se zpráva smaže.
-- Bezpečné spustit opakovaně (IF NOT EXISTS).
ALTER TABLE operating_rooms ADD COLUMN IF NOT EXISTS notice_message text;
ALTER TABLE operating_rooms ADD COLUMN IF NOT EXISTS notice_at timestamptz;
ALTER TABLE operating_rooms ADD COLUMN IF NOT EXISTS notice_sender text;
