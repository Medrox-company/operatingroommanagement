-- Create workflow_statuses table for managing operation workflow statuses
CREATE TABLE IF NOT EXISTS workflow_statuses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  default_duration_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  show_in_timeline BOOLEAN DEFAULT true,
  show_in_room_detail BOOLEAN DEFAULT true,
  include_in_statistics BOOLEAN DEFAULT true,
  is_special BOOLEAN DEFAULT false,
  special_type TEXT, -- 'hygiene' for hygienic mode, null for normal statuses
  accent_color TEXT DEFAULT '#60A5FA',
  icon TEXT DEFAULT 'activity',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workflow_statuses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "workflow_statuses_read" ON workflow_statuses FOR SELECT USING (true);
CREATE POLICY "workflow_statuses_write" ON workflow_statuses FOR INSERT WITH CHECK (true);
CREATE POLICY "workflow_statuses_update" ON workflow_statuses FOR UPDATE USING (true);
CREATE POLICY "workflow_statuses_delete" ON workflow_statuses FOR DELETE USING (true);

-- Insert default workflow statuses
INSERT INTO workflow_statuses (id, name, description, sort_order, default_duration_minutes, is_active, show_in_timeline, show_in_room_detail, include_in_statistics, is_special, special_type, accent_color, icon) VALUES
  ('sal_pripraven', 'Sál připraven', 'Operační sál je připraven k použití', 1, 0, true, true, true, false, false, NULL, '#5EEAD4', 'check-circle'),
  ('prijezd_na_sal', 'Příjezd na sál', 'Pacient přijíždí na operační sál', 2, 15, true, true, true, true, false, NULL, '#C4B5FD', 'truck'),
  ('zacatek_anestezie', 'Začátek anestezie', 'Zahájení anesteziologického výkonu', 3, 30, true, true, true, true, false, NULL, '#FCA5A5', 'heart-pulse'),
  ('chirurgicky_vykon', 'Chirurgický výkon', 'Probíhající operační zákrok', 4, 60, true, true, true, true, false, NULL, '#FDE047', 'scissors'),
  ('ukonceni_vykonu', 'Ukončení výkonu', 'Dokončení chirurgického zákroku', 5, 15, true, true, true, true, false, NULL, '#A5B4FC', 'check'),
  ('ukonceni_anestezie', 'Ukončení anestezie', 'Ukončení anesteziologického výkonu', 6, 30, true, true, true, true, false, NULL, '#F0ABFC', 'heart'),
  ('uklid_salu', 'Úklid sálu', 'Úklid a dezinfekce operačního sálu', 7, 20, true, true, true, true, false, NULL, '#FDBA74', 'sparkles'),
  ('sal_pripraven_po_uklidu', 'Sál připraven (po úklidu)', 'Operační sál je opět připraven', 8, 0, true, true, true, false, false, NULL, '#5EEAD4', 'check-circle-2'),
  ('volani_pacienta', 'Volání pacienta', 'Pacient je volán na operaci', 9, 10, true, true, true, true, false, NULL, '#67E8F9', 'phone-call'),
  ('prijezd_do_traktu', 'Příjezd pacienta do operačního traktu', 'Pacient dorazil do operačního traktu', 10, 15, true, true, true, true, false, NULL, '#86EFAC', 'user-check'),
  ('pauza', 'Pauza', 'Přerušení operačního programu', 11, 30, true, true, true, true, false, NULL, '#FCD34D', 'pause-circle'),
  ('hygienicky_rezim', 'Hygienický režim', 'Speciální hygienický režim - nepočítá se do statistik využití', 12, 60, true, true, true, false, true, 'hygiene', '#F87171', 'shield-alert')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  default_duration_minutes = EXCLUDED.default_duration_minutes,
  accent_color = EXCLUDED.accent_color,
  icon = EXCLUDED.icon,
  is_special = EXCLUDED.is_special,
  special_type = EXCLUDED.special_type,
  updated_at = NOW();
