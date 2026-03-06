-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  accent_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sub_departments table
CREATE TABLE IF NOT EXISTS sub_departments (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('DOCTOR', 'NURSE', 'ANESTHESIOLOGIST')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  blood_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create procedures table
CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT,
  estimated_duration INTEGER, -- in minutes
  progress INTEGER DEFAULT 0, -- 0-100
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create operating_rooms table
CREATE TABLE IF NOT EXISTS operating_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'FREE' CHECK (status IN ('FREE', 'BUSY', 'CLEANING', 'MAINTENANCE')),
  queue_count INTEGER DEFAULT 0,
  operations_24h INTEGER DEFAULT 0,
  is_septic BOOLEAN DEFAULT false,
  is_emergency BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  current_step_index INTEGER DEFAULT 0,
  current_patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  current_procedure_id TEXT REFERENCES procedures(id) ON DELETE SET NULL,
  estimated_end_time TIMESTAMP WITH TIME ZONE,
  doctor_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  nurse_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  anesthesiologist_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  operating_room_id TEXT NOT NULL REFERENCES operating_rooms(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  procedure_id TEXT REFERENCES procedures(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER,
  priority TEXT DEFAULT 'NORMAL',
  status TEXT DEFAULT 'PLANNED',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shift_schedules table
CREATE TABLE IF NOT EXISTS shift_schedules (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  operating_room_id TEXT REFERENCES operating_rooms(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('MORNING', 'AFTERNOON', 'NIGHT')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  operating_room_id TEXT REFERENCES operating_rooms(id) ON DELETE SET NULL,
  is_available BOOLEAN DEFAULT true,
  last_maintenance TIMESTAMP WITH TIME ZONE,
  next_maintenance TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_operating_rooms_status ON operating_rooms(status);
CREATE INDEX idx_operating_rooms_department ON operating_rooms(department);
CREATE INDEX idx_schedules_operating_room ON schedules(operating_room_id);
CREATE INDEX idx_schedules_date ON schedules(scheduled_date);
CREATE INDEX idx_shift_schedules_staff ON shift_schedules(staff_id);
CREATE INDEX idx_shift_schedules_date ON shift_schedules(shift_date);
CREATE INDEX idx_equipment_operating_room ON equipment(operating_room_id);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now - adjust based on auth strategy)
CREATE POLICY "departments_read" ON departments FOR SELECT USING (true);
CREATE POLICY "departments_write" ON departments FOR INSERT WITH CHECK (true);
CREATE POLICY "departments_update" ON departments FOR UPDATE USING (true);
CREATE POLICY "departments_delete" ON departments FOR DELETE USING (true);

CREATE POLICY "sub_departments_read" ON sub_departments FOR SELECT USING (true);
CREATE POLICY "sub_departments_write" ON sub_departments FOR INSERT WITH CHECK (true);
CREATE POLICY "sub_departments_update" ON sub_departments FOR UPDATE USING (true);
CREATE POLICY "sub_departments_delete" ON sub_departments FOR DELETE USING (true);

CREATE POLICY "staff_read" ON staff FOR SELECT USING (true);
CREATE POLICY "staff_write" ON staff FOR INSERT WITH CHECK (true);
CREATE POLICY "staff_update" ON staff FOR UPDATE USING (true);
CREATE POLICY "staff_delete" ON staff FOR DELETE USING (true);

CREATE POLICY "patients_read" ON patients FOR SELECT USING (true);
CREATE POLICY "patients_write" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "patients_update" ON patients FOR UPDATE USING (true);
CREATE POLICY "patients_delete" ON patients FOR DELETE USING (true);

CREATE POLICY "procedures_read" ON procedures FOR SELECT USING (true);
CREATE POLICY "procedures_write" ON procedures FOR INSERT WITH CHECK (true);
CREATE POLICY "procedures_update" ON procedures FOR UPDATE USING (true);
CREATE POLICY "procedures_delete" ON procedures FOR DELETE USING (true);

CREATE POLICY "operating_rooms_read" ON operating_rooms FOR SELECT USING (true);
CREATE POLICY "operating_rooms_write" ON operating_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "operating_rooms_update" ON operating_rooms FOR UPDATE USING (true);
CREATE POLICY "operating_rooms_delete" ON operating_rooms FOR DELETE USING (true);

CREATE POLICY "schedules_read" ON schedules FOR SELECT USING (true);
CREATE POLICY "schedules_write" ON schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "schedules_update" ON schedules FOR UPDATE USING (true);
CREATE POLICY "schedules_delete" ON schedules FOR DELETE USING (true);

CREATE POLICY "shift_schedules_read" ON shift_schedules FOR SELECT USING (true);
CREATE POLICY "shift_schedules_write" ON shift_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "shift_schedules_update" ON shift_schedules FOR UPDATE USING (true);
CREATE POLICY "shift_schedules_delete" ON shift_schedules FOR DELETE USING (true);

CREATE POLICY "equipment_read" ON equipment FOR SELECT USING (true);
CREATE POLICY "equipment_write" ON equipment FOR INSERT WITH CHECK (true);
CREATE POLICY "equipment_update" ON equipment FOR UPDATE USING (true);
CREATE POLICY "equipment_delete" ON equipment FOR DELETE USING (true);
