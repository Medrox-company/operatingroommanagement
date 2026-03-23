-- Add weekly_schedule column to operating_rooms table
-- This column stores the working hours schedule for each day of the week as JSONB

ALTER TABLE operating_rooms 
ADD COLUMN IF NOT EXISTS weekly_schedule JSONB DEFAULT '{
  "monday": {"enabled": true, "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30},
  "tuesday": {"enabled": true, "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30},
  "wednesday": {"enabled": true, "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30},
  "thursday": {"enabled": true, "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30},
  "friday": {"enabled": true, "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30},
  "saturday": {"enabled": false, "startHour": 7, "startMinute": 0, "endHour": 12, "endMinute": 0},
  "sunday": {"enabled": false, "startHour": 7, "startMinute": 0, "endHour": 12, "endMinute": 0}
}'::jsonb;
