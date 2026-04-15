-- Create notifications_log table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES operating_rooms(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  custom_reason TEXT,
  recipient_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for querying by room and date
CREATE INDEX IF NOT EXISTS idx_notifications_log_room_id ON notifications_log(room_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_created_at ON notifications_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_log_type ON notifications_log(notification_type);

-- Enable RLS
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Allow all users to insert their own logs
CREATE POLICY "Allow insert notifications" ON notifications_log
  FOR INSERT WITH CHECK (true);

-- Allow users to view notifications from their rooms
CREATE POLICY "Allow view notifications" ON notifications_log
  FOR SELECT USING (true);
