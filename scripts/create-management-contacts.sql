-- Create management_contacts table for storing management notification recipients
CREATE TABLE IF NOT EXISTS management_contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  notify_emergencies BOOLEAN DEFAULT true,
  notify_daily_reports BOOLEAN DEFAULT false,
  notify_statistics BOOLEAN DEFAULT false,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_management_contacts_active ON management_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_management_contacts_sort ON management_contacts(sort_order);

-- Enable Row Level Security
ALTER TABLE management_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "management_contacts_read" ON management_contacts FOR SELECT USING (true);
CREATE POLICY "management_contacts_write" ON management_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "management_contacts_update" ON management_contacts FOR UPDATE USING (true);
CREATE POLICY "management_contacts_delete" ON management_contacts FOR DELETE USING (true);
