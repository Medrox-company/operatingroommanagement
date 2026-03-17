-- Insert default departments
INSERT INTO departments (id, name, description, is_active, accent_color) VALUES
  ('tra', 'Traumatologie', 'Léčba úrazů a poranění', true, '#00D8C1'),
  ('chir', 'Chirurgie', 'Chirurgické výkony', true, '#7C3AED'),
  ('neurochir', 'Neurochirurgie', 'Chirurgie nervové soustavy', true, '#06B6D4'),
  ('uro', 'Urologie', 'Léčba urogenitálního systému', true, '#EC4899'),
  ('gyn', 'Gynekologie', 'Gynekologické výkony', true, '#F59E0B'),
  ('orl', 'ORL', 'Otolaryngologie', true, '#3B82F6'),
  ('oftalmologie', 'Oftalmologie', 'Oční lékařství', true, '#8B5CF6'),
  ('ortopedicka', 'Ortopedická chirurgie', 'Ortopedické výkony', true, '#14B8A6')
ON CONFLICT (id) DO NOTHING;

-- Insert sub-departments for Chirurgie
INSERT INTO sub_departments (id, department_id, name, is_active) VALUES
  ('chir-hpb', 'chir', 'HPB (játra, pankreas, žlučník)', true),
  ('chir-cevni', 'chir', 'Cévní chirurgie', true),
  ('chir-detske', 'chir', 'Dětská chirurgie', true),
  ('chir-mammo', 'chir', 'Mammo chirurgie', true),
  ('chir-prokto', 'chir', 'Proktochirurgie', true)
ON CONFLICT (id) DO NOTHING;

-- Insert staff
INSERT INTO staff (id, name, role, is_active) VALUES
  ('doc-1', 'MUDr. Procházka', 'DOCTOR', true),
  ('doc-2', 'MUDr. Svoboda', 'DOCTOR', true),
  ('doc-3', 'MUDr. Kučera', 'DOCTOR', true),
  ('doc-4', 'MUDr. Zeman', 'DOCTOR', true),
  ('doc-5', 'MUDr. Novák', 'DOCTOR', true),
  ('doc-6', 'MUDr. Fiala', 'DOCTOR', true),
  ('doc-7', 'MUDr. Krátký', 'DOCTOR', true),
  ('doc-8', 'MUDr. Beneš', 'DOCTOR', true),
  ('doc-9', 'MUDr. Horáková', 'DOCTOR', true),
  ('doc-10', 'MUDr. Růžička', 'DOCTOR', true),
  ('nurse-1', 'Bc. Veselá', 'NURSE', true),
  ('nurse-2', 'Bc. Malá', 'NURSE', true),
  ('nurse-3', 'Bc. Horáková', 'NURSE', true),
  ('nurse-4', 'Bc. Králová', 'NURSE', true),
  ('nurse-5', 'Bc. Dvořáková', 'NURSE', true),
  ('nurse-6', 'Bc. Pokorná', 'NURSE', true),
  ('nurse-7', 'Bc. Jelínková', 'NURSE', true),
  ('nurse-8', 'Bc. Nová', 'NURSE', true),
  ('anes-1', 'MUDr. Jelínek', 'ANESTHESIOLOGIST', true),
  ('anes-2', 'MUDr. Černý', 'ANESTHESIOLOGIST', true),
  ('anes-3', 'MUDr. Kovář', 'ANESTHESIOLOGIST', true),
  ('anes-4', 'MUDr. Marek', 'ANESTHESIOLOGIST', true),
  ('anes-5', 'MUDr. Veselý', 'ANESTHESIOLOGIST', true)
ON CONFLICT (id) DO NOTHING;

-- Insert patients
INSERT INTO patients (id, name, age, blood_type) VALUES
  ('pat-1', 'Eva Nováková', 48, 'B-'),
  ('pat-2', 'Jan Novotný', 42, 'A+'),
  ('pat-3', 'Pavel Černý', 56, 'O+'),
  ('pat-4', 'Lucie Bílá', 33, 'A-'),
  ('pat-5', 'Karel Vorel', 69, 'AB+'),
  ('pat-6', 'Petr Veselý', 55, 'O-'),
  ('pat-7', 'Martin Dlouhý', 41, 'O-'),
  ('pat-8', 'Jana Malá', 18, 'A+'),
  ('pat-9', 'František Vlk', 74, 'B+'),
  ('pat-10', 'Jana Rychlá', 73, 'B+'),
  ('pat-11', 'Anna Poláková', 5, 'O+'),
  ('pat-12', 'Marie Kopecká', 58, 'A+')
ON CONFLICT (id) DO NOTHING;

-- Insert procedures
INSERT INTO procedures (id, name, start_time, estimated_duration, progress) VALUES
  ('proc-1', 'Artroskopie ramene', '08:00', 120, 75),
  ('proc-2', 'Laparoskopická cholecystektomie', '10:00', 90, 90),
  ('proc-3', 'Náhrada kyčelního kloubu', '09:30', 180, 0),
  ('proc-4', 'Operace štítné žlázy', '11:00', 150, 0),
  ('proc-5', 'Bypass koronární arterie', '07:45', 360, 0),
  ('proc-6', 'Robotická prostatektomie', '08:30', 240, 0),
  ('proc-7', 'Nefrektomie', '12:00', 200, 0),
  ('proc-8', 'Tonzilektomie', '13:00', 60, 0),
  ('proc-9', 'Endarterektomie karotidy', '10:30', 120, 0),
  ('proc-10', 'Resekce jater', '09:15', 300, 0),
  ('proc-11', 'Operace tříselné kýly', '14:00', 45, 0),
  ('proc-12', 'Lumpektomie', '08:45', 90, 0)
ON CONFLICT (id) DO NOTHING;

-- Insert operating rooms
INSERT INTO operating_rooms (id, name, department, status, queue_count, operations_24h, is_septic, is_emergency, is_locked, current_step_index, current_patient_id, current_procedure_id, estimated_end_time, doctor_id, nurse_id, anesthesiologist_id) VALUES
  ('room-1', 'Sál č. 1', 'TRA', 'BUSY', 0, 4, false, false, false, 2, 'pat-1', 'proc-1', NOW() + INTERVAL '2 hours', 'doc-1', 'nurse-1', 'anes-1'),
  ('room-2', 'Sál č. 2', 'CHIR', 'BUSY', 1, 6, false, false, false, 3, 'pat-2', 'proc-2', NOW() + INTERVAL '1 hour 30 minutes', 'doc-2', 'nurse-2', 'anes-2'),
  ('room-3', 'Sál č. 3', 'TRA', 'FREE', 0, 3, false, false, false, 6, 'pat-3', 'proc-3', NULL, 'doc-3', 'nurse-3', 'anes-2'),
  ('room-4', 'Sál č. 4', 'CHIR', 'FREE', 0, 5, false, false, false, 6, 'pat-4', 'proc-4', NULL, 'doc-4', 'nurse-4', 'anes-3'),
  ('room-5', 'Sál č. 5', 'CHIR', 'FREE', 0, 2, false, false, false, 6, 'pat-5', 'proc-5', NULL, 'doc-2', 'nurse-2', 'anes-4'),
  ('room-6', 'DaVinci', 'ROBOT', 'FREE', 0, 3, false, false, false, 6, 'pat-6', 'proc-6', NULL, 'doc-5', 'nurse-5', 'anes-3'),
  ('room-7', 'Sál č. 7', 'URO', 'FREE', 0, 4, false, false, false, 6, 'pat-7', 'proc-7', NULL, 'doc-6', 'nurse-6', 'anes-2'),
  ('room-8', 'Sál č. 8', 'ORL', 'FREE', 0, 8, false, false, false, 6, 'pat-8', 'proc-8', NULL, 'doc-7', 'nurse-7', 'anes-3'),
  ('room-9', 'Sál č. 9', 'CÉVNÍ', 'FREE', 0, 4, false, false, false, 6, 'pat-9', 'proc-9', NULL, 'doc-8', 'nurse-5', 'anes-5'),
  ('room-10', 'Sál č. 10', 'HPB + PLICNÍ', 'FREE', 0, 3, false, false, false, 6, 'pat-10', 'proc-10', NULL, 'doc-9', 'nurse-4', 'anes-3'),
  ('room-11', 'Sál č. 11', 'DĚTSKÉ', 'FREE', 0, 9, false, false, false, 6, 'pat-11', 'proc-11', NULL, 'doc-10', 'nurse-8', 'anes-4'),
  ('room-12', 'Sál č. 12', 'MAMMO', 'FREE', 0, 7, false, false, false, 6, 'pat-12', 'proc-12', NULL, 'doc-9', 'nurse-8', 'anes-1')
ON CONFLICT (id) DO NOTHING;
