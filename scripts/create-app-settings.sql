-- Create app_settings table for hospital-wide application settings.
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for app_settings
CREATE POLICY "app_settings_read" ON app_settings FOR SELECT USING (true);
CREATE POLICY "app_settings_write" ON app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "app_settings_update" ON app_settings FOR UPDATE USING (true);
CREATE POLICY "app_settings_delete" ON app_settings FOR DELETE USING (true);

-- Insert default settings
INSERT INTO app_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;
