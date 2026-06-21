-- Přidá sloupce pro animované pozadí do app_settings.
-- Bezpečné spustit opakovaně (IF NOT EXISTS).
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS background_animation text DEFAULT 'none';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS background_animation_speed integer DEFAULT 3;
