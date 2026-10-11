BEGIN;

-- A frozen association to a recorded, real operative cycle. It does not reserve
-- capacity, infer clinical events, or close/reorder the acute request queue.
CREATE TABLE public.acute_request_cycle_links (
  request_id uuid PRIMARY KEY,
  hospital_id text NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  operating_room_id text NOT NULL REFERENCES public.operating_rooms(id) ON DELETE RESTRICT,
  operation_started_at timestamptz NOT NULL,
  started_at timestamptz NOT NULL,
  start_event_id uuid NOT NULL UNIQUE REFERENCES public.room_status_history(id) ON DELETE RESTRICT,
  start_state_revision bigint NOT NULL CHECK (start_state_revision > 0),
  end_event_id uuid UNIQUE REFERENCES public.room_status_history(id) ON DELETE RESTRICT,
  ended_at timestamptz,
  procedure_name text NOT NULL CHECK (length(btrim(procedure_name)) BETWEEN 1 AND 160),
  urgency text NOT NULL CHECK (urgency IN ('emergent', 'urgent', 'expedited')),
  submission_position integer CHECK (submission_position > 0),
  bound_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  bound_by_name text NOT NULL CHECK (length(bound_by_name) <= 160),
  bound_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (request_id, hospital_id) REFERENCES public.acute_requests(id, hospital_id) ON DELETE RESTRICT,
  UNIQUE (hospital_id, operating_room_id, operation_started_at),
  CHECK ((end_event_id IS NULL AND ended_at IS NULL) OR (end_event_id IS NOT NULL AND ended_at IS NOT NULL AND ended_at > started_at))
);
CREATE UNIQUE INDEX acute_cycle_one_live_room_idx ON public.acute_request_cycle_links (hospital_id, operating_room_id) WHERE ended_at IS NULL;
CREATE INDEX acute_cycle_hospital_started_idx ON public.acute_request_cycle_links (hospital_id, started_at);
CREATE INDEX acute_cycle_hospital_ended_idx ON public.acute_request_cycle_links (hospital_id, ended_at) WHERE ended_at IS NOT NULL;
CREATE INDEX acute_cycle_actor_idx ON public.acute_request_cycle_links (bound_by);
ALTER TABLE public.acute_request_cycle_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.acute_request_cycle_links FROM PUBLIC, anon, authenticated;
-- Supabase may default-grant ALL on new public tables to service_role.
REVOKE ALL ON public.acute_request_cycle_links FROM service_role;
GRANT SELECT, INSERT ON public.acute_request_cycle_links TO service_role;

CREATE SCHEMA IF NOT EXISTS acute_cycle_internal;
REVOKE ALL ON SCHEMA acute_cycle_internal FROM PUBLIC, anon, authenticated;

-- No actor, urgency, room, start, submission number or finished boundary can be
-- rewritten. Completion is permitted only as a nested room-transition trigger.
CREATE FUNCTION acute_cycle_internal.protect_cycle_link() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' OR pg_trigger_depth() < 2
    OR OLD.ended_at IS NOT NULL
    OR (to_jsonb(NEW) - 'end_event_id' - 'ended_at') IS DISTINCT FROM (to_jsonb(OLD) - 'end_event_id' - 'ended_at')
    OR NEW.end_event_id IS NULL OR NEW.ended_at IS NULL THEN
    RAISE EXCEPTION 'Acute cycle evidence is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION acute_cycle_internal.protect_cycle_link() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER acute_cycle_link_immutable BEFORE UPDATE OR DELETE ON public.acute_request_cycle_links
FOR EACH ROW EXECUTE FUNCTION acute_cycle_internal.protect_cycle_link();

-- Privilege elevation is confined to an internal trigger, because ordinary
-- authenticated room clients cannot read/write the service-only link table.
-- Only the exact OLD cycle and newly recorded final history event are eligible.
CREATE FUNCTION acute_cycle_internal.finish_room_cycle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_end public.room_status_history%ROWTYPE;
BEGIN
  IF NEW.hospital_id IS DISTINCT FROM OLD.hospital_id OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.current_step_index <> 0 OR OLD.current_step_index <= 0 OR OLD.operation_started_at IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.acute_request_cycle_links
    WHERE hospital_id = OLD.hospital_id AND operating_room_id = OLD.id AND operation_started_at = OLD.operation_started_at AND ended_at IS NULL) THEN RETURN NEW; END IF;
  SELECT * INTO v_end FROM public.room_status_history
  WHERE hospital_id = NEW.hospital_id AND operating_room_id = NEW.id AND event_type = 'operation_end'
    AND metadata ->> 'transition_source' = 'database_trigger'
    AND metadata ->> 'state_revision' = NEW.state_revision::text
    AND "timestamp" = NEW.phase_started_at + interval '1 millisecond'
  ORDER BY "timestamp" DESC, id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_HISTORY_REQUIRED' USING ERRCODE = '55000'; END IF;
  UPDATE public.acute_request_cycle_links SET end_event_id = v_end.id, ended_at = v_end."timestamp"
  WHERE hospital_id = OLD.hospital_id AND operating_room_id = OLD.id AND operation_started_at = OLD.operation_started_at
    AND ended_at IS NULL AND started_at < v_end."timestamp";
  IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_HISTORY_REQUIRED' USING ERRCODE = '55000'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION acute_cycle_internal.finish_room_cycle() FROM PUBLIC, anon, authenticated, service_role;
-- PostgreSQL orders same-kind triggers by name: the standard history trigger
-- operating_rooms_record_step_transition therefore executes before this one.
CREATE TRIGGER operating_rooms_zz_finish_acute_cycle AFTER UPDATE OF current_step_index ON public.operating_rooms
FOR EACH ROW EXECUTE FUNCTION acute_cycle_internal.finish_room_cycle();

CREATE FUNCTION public.start_acute_request_cycle(
  p_hospital_id text, p_actor_id uuid, p_request_id uuid, p_room_id text, p_expected_state_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_actor public.app_users%ROWTYPE;
  v_module public.app_modules%ROWTYPE;
  v_room public.operating_rooms%ROWTYPE;
  v_request public.acute_requests%ROWTYPE;
  v_link public.acute_request_cycle_links%ROWTYPE;
  v_start public.room_status_history%ROWTYPE;
  v_now timestamptz;
  v_color text;
  v_name text;
  v_position integer;
  v_module_id text;
BEGIN
  IF p_expected_state_revision IS NULL OR p_expected_state_revision < 0 OR p_request_id IS NULL OR p_room_id IS NULL THEN
    RAISE EXCEPTION 'ACUTE_CYCLE_CONFLICT' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO v_actor FROM public.app_users WHERE id = p_actor_id AND is_active = true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  FOREACH v_module_id IN ARRAY ARRAY['acute-requests', 'dashboard'] LOOP
    SELECT * INTO v_module FROM public.app_modules WHERE id = v_module_id AND hospital_id = p_hospital_id FOR SHARE;
    IF NOT FOUND OR v_module.is_enabled IS DISTINCT FROM true OR (v_actor.role <> 'superadmin'
      AND NOT (v_actor.role = ANY(coalesce(v_module.allowed_roles, ARRAY[]::text[])))) THEN
      RAISE EXCEPTION 'ACUTE_CYCLE_FORBIDDEN' USING ERRCODE = '42501';
    END IF;
  END LOOP;
  IF v_actor.role <> 'superadmin' THEN
    PERFORM 1 FROM public.hospital_user_memberships WHERE hospital_id = p_hospital_id AND user_id::text = p_actor_id::text FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  END IF;
  -- Match the existing queue-command room-before-request lock order. Never
  -- acquire a queue lock here or from the final-completion trigger.
  SELECT * INTO v_room FROM public.operating_rooms WHERE id = p_room_id AND hospital_id = p_hospital_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_request FROM public.acute_requests WHERE id = p_request_id AND hospital_id = p_hospital_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_link FROM public.acute_request_cycle_links WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_link.hospital_id = p_hospital_id AND v_link.operating_room_id = p_room_id AND v_link.ended_at IS NULL
      AND v_room.current_step_index > 0 AND v_room.operation_started_at = v_link.operation_started_at THEN
      RETURN jsonb_build_object('link', to_jsonb(v_link), 'room', to_jsonb(v_room));
    END IF;
    RAISE EXCEPTION 'ACUTE_CYCLE_CONFLICT already linked' USING ERRCODE = '40001';
  END IF;
  IF v_request.status NOT IN ('pending', 'acknowledged') OR v_request.proposed_room_id IS DISTINCT FROM p_room_id
    OR v_room.state_revision IS DISTINCT FROM p_expected_state_revision OR v_room.current_step_index IS DISTINCT FROM 0 OR v_room.operation_started_at IS NOT NULL
    OR v_room.is_locked IS TRUE OR v_room.is_paused IS TRUE THEN
    RAISE EXCEPTION 'ACUTE_CYCLE_CONFLICT' USING ERRCODE = '40001';
  END IF;
  SELECT coalesce(accent_color, color), name INTO v_color, v_name FROM public.workflow_statuses
  WHERE hospital_id = p_hospital_id AND is_active = true AND coalesce(is_special, false) = false
  ORDER BY sort_order OFFSET 1 LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_HISTORY_REQUIRED workflow' USING ERRCODE = '55000'; END IF;
  SELECT new_position INTO v_position FROM public.acute_request_events
  WHERE request_id = p_request_id AND hospital_id = p_hospital_id AND action = 'create'
  ORDER BY occurred_at, id LIMIT 1;
  v_now := clock_timestamp();
  UPDATE public.operating_rooms SET current_step_index = 1, phase_started_at = v_now, operation_started_at = v_now,
    status_history = jsonb_build_array(jsonb_build_object('stepIndex', 1, 'startedAt', v_now, 'color', coalesce(v_color, '#6B7280')))
  WHERE id = p_room_id AND hospital_id = p_hospital_id AND state_revision = p_expected_state_revision AND current_step_index = 0
  RETURNING * INTO v_room;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_CONFLICT' USING ERRCODE = '40001'; END IF;
  SELECT * INTO v_start FROM public.room_status_history
  WHERE operating_room_id = p_room_id AND hospital_id = p_hospital_id AND event_type = 'operation_start'
    AND metadata ->> 'transition_source' = 'database_trigger' AND metadata ->> 'state_revision' = v_room.state_revision::text
    AND "timestamp" = v_now + interval '1 millisecond'
  ORDER BY "timestamp" DESC, id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_CYCLE_HISTORY_REQUIRED' USING ERRCODE = '55000'; END IF;
  INSERT INTO public.acute_request_cycle_links (request_id, hospital_id, operating_room_id, operation_started_at, started_at,
    start_event_id, start_state_revision, procedure_name, urgency, submission_position, bound_by, bound_by_name)
  VALUES (p_request_id, p_hospital_id, p_room_id, v_now, v_start."timestamp", v_start.id, v_room.state_revision,
    v_request.procedure_name, v_request.urgency, v_position, p_actor_id, left(coalesce(v_actor.name, 'Uživatel'), 160))
  RETURNING * INTO v_link;
  RETURN jsonb_build_object('link', to_jsonb(v_link), 'room', to_jsonb(v_room));
END;
$$;
REVOKE ALL ON FUNCTION public.start_acute_request_cycle(text, uuid, uuid, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_acute_request_cycle(text, uuid, uuid, text, bigint) TO service_role;

-- All overlapping completed cycles plus live links, without the queue's bounded
-- history snapshot. Window validation lives at the authenticated API boundary.
CREATE FUNCTION public.get_acute_cycle_links(p_hospital_id text, p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(link) ORDER BY link.started_at, link.request_id), '[]'::jsonb)
  FROM public.acute_request_cycle_links link
  WHERE link.hospital_id = p_hospital_id AND (link.ended_at IS NULL OR (link.started_at < p_to AND link.ended_at >= p_from));
$$;
REVOKE ALL ON FUNCTION public.get_acute_cycle_links(text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_acute_cycle_links(text, timestamptz, timestamptz) TO service_role;

COMMENT ON TABLE public.acute_request_cycle_links IS 'Immutable selected acute request association to an actual standard recorded room cycle; completion only follows final room-ready transition.';
COMMIT;
