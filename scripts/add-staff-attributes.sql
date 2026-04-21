-- Add new attributes to staff table for skill level, availability, external status, and recommendations
-- Based on the design: L3, L2, L1, A (Absolvent), SR (Senior Rezident), N (Nováček), S (Stážista)

-- skill_level: L3 (highest), L2, L1, A (Absolvent), SR (Senior Rezident), N (Nováček/Newbie), S (Stážista/Intern)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'L1';

-- availability: percentage of workload availability (0-100)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS availability INTEGER DEFAULT 100;

-- is_external: whether the staff member is external (not internal)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;

-- is_recommended: whether the staff member is recommended (shown with crown icon)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;

-- Update existing doctors with varied skill levels for demo
UPDATE staff SET skill_level = 'L3', availability = 100, is_recommended = true WHERE name LIKE '%Novák%' AND role = 'DOCTOR';
UPDATE staff SET skill_level = 'L3', availability = 100, is_recommended = true WHERE name LIKE '%Černá%' AND role = 'DOCTOR';
UPDATE staff SET skill_level = 'L2', availability = 20, is_external = true, is_recommended = true WHERE name LIKE '%Novotný%' AND role = 'DOCTOR';
UPDATE staff SET skill_level = 'L2', availability = 100 WHERE name LIKE '%Svobodová%' AND role = 'DOCTOR';
UPDATE staff SET skill_level = 'L1', availability = 80 WHERE name LIKE '%Dvořák%' AND role = 'DOCTOR';
UPDATE staff SET skill_level = 'N', availability = 50 WHERE name LIKE '%Veselý%' AND role = 'DOCTOR';
UPDATE staff SET skill_level = 'A', availability = 100 WHERE name LIKE '%Procházka%' AND role = 'DOCTOR';
UPDATE staff SET skill_level = 'S', availability = 100 WHERE name LIKE '%Horák%' AND role = 'DOCTOR';

-- Update nurses with varied skill levels
UPDATE staff SET skill_level = 'L2', availability = 100 WHERE role = 'NURSE' AND skill_level IS NULL;
