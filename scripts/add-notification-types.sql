-- Add new notification type columns to management_contacts table
-- These correspond to room detail notification types

ALTER TABLE management_contacts
ADD COLUMN IF NOT EXISTS notify_late_surgeon BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_late_anesthesiologist BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_patient_not_ready BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_late_arrival BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_other BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN management_contacts.notify_late_surgeon IS 'Receive notifications for late surgeon arrivals';
COMMENT ON COLUMN management_contacts.notify_late_anesthesiologist IS 'Receive notifications for late anesthesiologist arrivals';
COMMENT ON COLUMN management_contacts.notify_patient_not_ready IS 'Receive notifications when patient is not ready';
COMMENT ON COLUMN management_contacts.notify_late_arrival IS 'Receive notifications for late arrivals';
COMMENT ON COLUMN management_contacts.notify_other IS 'Receive other/custom notifications';
