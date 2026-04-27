-- WHO Surgical Safety Checklist table
-- Standard 3-phase safety checklist used worldwide in operating rooms
-- Reduces surgical mortality by ~47% and complications by ~36% per WHO study

CREATE TABLE IF NOT EXISTS public.safety_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operating_room_id TEXT NOT NULL REFERENCES public.operating_rooms(id) ON DELETE CASCADE,
  
  -- Operation context (snapshot for record keeping)
  patient_name TEXT,
  patient_id_external TEXT,
  procedure_name TEXT,
  surgeon_name TEXT,
  anesthesiologist_name TEXT,
  nurse_name TEXT,
  
  -- Phase 1: SIGN IN (před úvodem do anestezie / Before induction of anesthesia)
  sign_in_completed BOOLEAN DEFAULT FALSE,
  sign_in_completed_at TIMESTAMPTZ,
  sign_in_completed_by TEXT,
  sign_in_data JSONB DEFAULT '{}'::jsonb,
  
  -- Phase 2: TIME OUT (před řezem / Before skin incision)
  time_out_completed BOOLEAN DEFAULT FALSE,
  time_out_completed_at TIMESTAMPTZ,
  time_out_completed_by TEXT,
  time_out_data JSONB DEFAULT '{}'::jsonb,
  
  -- Phase 3: SIGN OUT (před odjezdem ze sálu / Before patient leaves OR)
  sign_out_completed BOOLEAN DEFAULT FALSE,
  sign_out_completed_at TIMESTAMPTZ,
  sign_out_completed_by TEXT,
  sign_out_data JSONB DEFAULT '{}'::jsonb,
  
  -- General
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_safety_checklists_room ON public.safety_checklists(operating_room_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklists_active ON public.safety_checklists(is_active);
CREATE INDEX IF NOT EXISTS idx_safety_checklists_created ON public.safety_checklists(created_at DESC);

-- RLS - same pattern as other tables in this app
ALTER TABLE public.safety_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS safety_checklists_read ON public.safety_checklists;
DROP POLICY IF EXISTS safety_checklists_write ON public.safety_checklists;
DROP POLICY IF EXISTS safety_checklists_update ON public.safety_checklists;
DROP POLICY IF EXISTS safety_checklists_delete ON public.safety_checklists;

CREATE POLICY safety_checklists_read ON public.safety_checklists FOR SELECT USING (true);
CREATE POLICY safety_checklists_write ON public.safety_checklists FOR INSERT WITH CHECK (true);
CREATE POLICY safety_checklists_update ON public.safety_checklists FOR UPDATE USING (true);
CREATE POLICY safety_checklists_delete ON public.safety_checklists FOR DELETE USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_safety_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_safety_checklists_updated_at ON public.safety_checklists;
CREATE TRIGGER trigger_safety_checklists_updated_at
  BEFORE UPDATE ON public.safety_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_checklists_updated_at();

-- Enable realtime for live updates across all clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_checklists;
