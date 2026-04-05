-- Add leave and absence attributes to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS sick_leave_days INTEGER DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS vacation_days INTEGER DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comment for clarity
COMMENT ON COLUMN staff.sick_leave_days IS 'Počet dní pracovní neschopnosti (PN)';
COMMENT ON COLUMN staff.vacation_days IS 'Počet dní dovolené (D)';
COMMENT ON COLUMN staff.notes IS 'Poznámky k zaměstnanci';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'staff' AND column_name IN ('sick_leave_days', 'vacation_days', 'notes');
