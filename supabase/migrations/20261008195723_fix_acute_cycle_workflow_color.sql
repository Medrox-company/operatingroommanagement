BEGIN;

-- workflow_statuses stores its configured color in accent_color only.
-- Replace the lookup without changing authorization, cycle timing or grants.
CREATE OR REPLACE FUNCTION public.start_acute_request_cycle(
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
  SELECT accent_color, name INTO v_color, v_name FROM public.workflow_statuses
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

COMMIT;
