-- Create app_settings table for storing global application settings like background
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  background_type TEXT DEFAULT 'gradient',
  background_colors JSONB DEFAULT '[{"color": "#0a0a12", "position": 0}, {"color": "#1a1a2e", "position": 100}]',
  background_direction TEXT DEFAULT 'to bottom',
  background_opacity INTEGER DEFAULT 100,
  background_image_url TEXT DEFAULT '',
  background_image_opacity INTEGER DEFAULT 0,
  background_image_blur INTEGER DEFAULT 0,
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
