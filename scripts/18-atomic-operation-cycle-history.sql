-- Atomický zápis historie operačního cyklu.
--
-- Změna operating_rooms.current_step_index a odpovídající události
-- room_status_history musí vzniknout v jedné databázové transakci. Tím se
-- odstraní mezera, kdy automatické ukončení úklidu změnilo stav sálu, ale
-- nezapsalo step_change / operation_end.
--
-- Skript je idempotentní a platí pro všechna nemocniční zařízení.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.record_operating_room_step_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_at timestamptz;
  lifecycle_at timestamptz;
  previous_name text;
  next_name text;
  phase_duration_seconds integer;
BEGIN
  IF NEW.current_step_index IS NOT DISTINCT FROM OLD.current_step_index THEN
    RETURN NEW;
  END IF;

  event_at := COALESCE(NEW.phase_started_at, clock_timestamp());
  lifecycle_at := event_at + interval '1 millisecond';
  phase_duration_seconds := CASE
    WHEN OLD.phase_started_at IS NULL THEN NULL
    ELSE GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (event_at - OLD.phase_started_at)))::integer
    )
  END;

  -- current_step_index je kompaktní pozice mezi aktivními nespeciálními
  -- workflow stavy. sort_order může obsahovat mezery kvůli vypnutým stavům.
  SELECT ws.name
    INTO previous_name
  FROM public.workflow_statuses ws
  WHERE ws.hospital_id = NEW.hospital_id
    AND ws.is_active = true
    AND COALESCE(ws.is_special, false) = false
  ORDER BY ws.sort_order
  OFFSET GREATEST(OLD.current_step_index, 0)
  LIMIT 1;

  SELECT ws.name
    INTO next_name
  FROM public.workflow_statuses ws
  WHERE ws.hospital_id = NEW.hospital_id
    AND ws.is_active = true
    AND COALESCE(ws.is_special, false) = false
  ORDER BY ws.sort_order
  OFFSET GREATEST(NEW.current_step_index, 0)
  LIMIT 1;

  INSERT INTO public.room_status_history (
    id,
    hospital_id,
    operating_room_id,
    event_type,
    step_index,
    step_name,
    duration_seconds,
    "timestamp",
    metadata
  )
  VALUES (
    gen_random_uuid(),
    NEW.hospital_id,
    NEW.id,
    'step_change',
    NEW.current_step_index,
    COALESCE(previous_name, 'Status'),
    phase_duration_seconds,
    event_at,
    jsonb_build_object(
      'previous_step', COALESCE(previous_name, 'Status'),
      'previous_step_index', OLD.current_step_index,
      'transition_source', 'database_trigger',
      'state_revision', NEW.state_revision
    )
  );

  IF OLD.current_step_index = 0 AND NEW.current_step_index = 1 THEN
    INSERT INTO public.room_status_history (
      id,
      hospital_id,
      operating_room_id,
      event_type,
      step_index,
      step_name,
      "timestamp",
      metadata
    )
    VALUES (
      gen_random_uuid(),
      NEW.hospital_id,
      NEW.id,
      'operation_start',
      NEW.current_step_index,
      COALESCE(next_name, 'Příjezd na sál'),
      lifecycle_at,
      jsonb_build_object(
        'transition_source', 'database_trigger',
        'state_revision', NEW.state_revision
      )
    );
  ELSIF NEW.current_step_index = 0 AND OLD.current_step_index > 0 THEN
    INSERT INTO public.room_status_history (
      id,
      hospital_id,
      operating_room_id,
      event_type,
      step_index,
      step_name,
      duration_seconds,
      "timestamp",
      metadata
    )
    VALUES (
      gen_random_uuid(),
      NEW.hospital_id,
      NEW.id,
      'operation_end',
      OLD.current_step_index,
      'Operation End',
      phase_duration_seconds,
      lifecycle_at,
      jsonb_build_object(
        'completed_step', COALESCE(previous_name, 'Status'),
        'previous_step', COALESCE(previous_name, 'Status'),
        'transition_source', 'database_trigger',
        'state_revision', NEW.state_revision
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_operating_room_step_transition() FROM PUBLIC;

DROP TRIGGER IF EXISTS operating_rooms_record_step_transition
  ON public.operating_rooms;

CREATE TRIGGER operating_rooms_record_step_transition
  AFTER UPDATE OF current_step_index ON public.operating_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.record_operating_room_step_transition();

COMMIT;
