-- Add breakMinutes (default 30) to every day in every room's weekly_schedule.
-- Uses jsonb_set only when the key is missing, so it's idempotent and safe to re-run.

UPDATE operating_rooms
SET weekly_schedule = (
  SELECT jsonb_object_agg(
    day_key,
    CASE
      WHEN (day_value ? 'breakMinutes') THEN day_value
      ELSE day_value || jsonb_build_object('breakMinutes', 30)
    END
  )
  FROM jsonb_each(weekly_schedule) AS t(day_key, day_value)
)
WHERE weekly_schedule IS NOT NULL;

-- Also update the column default so newly created rooms get the break field.
ALTER TABLE operating_rooms
ALTER COLUMN weekly_schedule SET DEFAULT '{
  "monday":    {"enabled": true,  "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30, "breakMinutes": 30},
  "tuesday":   {"enabled": true,  "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30, "breakMinutes": 30},
  "wednesday": {"enabled": true,  "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30, "breakMinutes": 30},
  "thursday":  {"enabled": true,  "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30, "breakMinutes": 30},
  "friday":    {"enabled": true,  "startHour": 7, "startMinute": 0, "endHour": 15, "endMinute": 30, "breakMinutes": 30},
  "saturday":  {"enabled": false, "startHour": 7, "startMinute": 0, "endHour": 12, "endMinute": 0,  "breakMinutes": 30},
  "sunday":    {"enabled": false, "startHour": 7, "startMinute": 0, "endHour": 12, "endMinute": 0,  "breakMinutes": 30}
}'::jsonb;
