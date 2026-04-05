-- Migration: Merge ANESTHESIOLOGIST role into DOCTOR role
-- This script updates all staff records with role 'ANESTHESIOLOGIST' to 'DOCTOR'

UPDATE staff 
SET role = 'DOCTOR', 
    updated_at = NOW() 
WHERE role = 'ANESTHESIOLOGIST';

-- Verify the update
SELECT role, COUNT(*) as count FROM staff GROUP BY role;
