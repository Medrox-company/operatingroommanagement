BEGIN;

-- This is a request queue, not a clinical schedule or a capacity reservation.
CREATE TABLE public.acute_request_queues (
  hospital_id text PRIMARY KEY REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acute_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id text NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  reference text NOT NULL DEFAULT '' CHECK (length(reference) <= 80),
  procedure_name text NOT NULL CHECK (length(btrim(procedure_name)) BETWEEN 1 AND 160),
  department text NOT NULL CHECK (length(btrim(department)) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  urgency text NOT NULL CHECK (urgency IN ('emergent', 'urgent', 'expedited')),
  estimated_duration_minutes integer NOT NULL CHECK (estimated_duration_minutes BETWEEN 1 AND 1440),
  clinical_decision_at timestamptz,
  latest_start_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  proposed_room_id text REFERENCES public.operating_rooms(id) ON DELETE RESTRICT,
  proposed_start_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),
  queue_position integer,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  CONSTRAINT acute_request_queue_position_unique UNIQUE (hospital_id, queue_position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT acute_request_id_hospital_unique UNIQUE (id, hospital_id),
  CONSTRAINT acute_request_active_position CHECK (
    (status IN ('pending', 'acknowledged') AND queue_position > 0 AND queue_position IS NOT NULL)
    OR (status IN ('completed', 'cancelled') AND queue_position IS NULL)
  ),
  CONSTRAINT acute_request_proposal_requires_room CHECK (proposed_start_at IS NULL OR proposed_room_id IS NOT NULL),
  CONSTRAINT acute_request_deadline_after_decision CHECK (latest_start_at IS NULL OR clinical_decision_at IS NULL OR latest_start_at >= clinical_decision_at)
);

CREATE TABLE public.acute_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id text NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'acknowledge', 'reorder', 'cancel', 'complete')),
  actor_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  actor_name text NOT NULL CHECK (length(actor_name) <= 160),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT '' CHECK (length(reason) <= 500),
  previous_position integer,
  new_position integer,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(changes) = 'object'),
  FOREIGN KEY (request_id, hospital_id) REFERENCES public.acute_requests(id, hospital_id) ON DELETE RESTRICT
);
CREATE INDEX acute_requests_active_hospital_position_idx ON public.acute_requests (hospital_id, queue_position) WHERE status IN ('pending', 'acknowledged');
CREATE INDEX acute_requests_history_hospital_updated_idx ON public.acute_requests (hospital_id, updated_at DESC) WHERE status IN ('completed', 'cancelled');
CREATE INDEX acute_requests_proposed_room_idx ON public.acute_requests (proposed_room_id) WHERE proposed_room_id IS NOT NULL;
CREATE INDEX acute_requests_created_by_idx ON public.acute_requests (created_by);
CREATE INDEX acute_requests_acknowledged_by_idx ON public.acute_requests (acknowledged_by) WHERE acknowledged_by IS NOT NULL;
CREATE INDEX acute_events_hospital_time_idx ON public.acute_request_events (hospital_id, occurred_at DESC, id DESC);
CREATE INDEX acute_events_request_time_idx ON public.acute_request_events (request_id, occurred_at DESC);
CREATE INDEX acute_events_actor_idx ON public.acute_request_events (actor_id);

ALTER TABLE public.acute_request_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acute_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acute_request_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.acute_request_queues, public.acute_requests, public.acute_request_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.acute_request_queues, public.acute_requests TO service_role;
GRANT SELECT, INSERT ON public.acute_request_events TO service_role;

-- Immutable even when called directly by a privileged operational service.
CREATE FUNCTION public.prevent_acute_event_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Acute request audit events are immutable' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_acute_event_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER acute_event_immutable BEFORE UPDATE OR DELETE ON public.acute_request_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_acute_event_mutation();

-- Always includes every open request. History is bounded and explicitly labelled;
-- no record is deleted. A separate request-id history query can retrieve more later.
CREATE FUNCTION public.get_acute_requests_snapshot(p_hospital_id text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH visible_requests AS (
    SELECT * FROM public.acute_requests WHERE hospital_id = p_hospital_id AND status IN ('pending', 'acknowledged')
    UNION ALL
    SELECT * FROM (
      SELECT * FROM public.acute_requests WHERE hospital_id = p_hospital_id AND status IN ('completed', 'cancelled')
      ORDER BY updated_at DESC, id DESC LIMIT 200
    ) history
  ), recent_events AS (
    SELECT * FROM public.acute_request_events WHERE hospital_id = p_hospital_id ORDER BY occurred_at DESC, id DESC LIMIT 1000
  ), latest_active_reorders AS (
    SELECT DISTINCT ON (event.request_id) event.*
    FROM public.acute_request_events event
    JOIN public.acute_requests request ON request.id = event.request_id AND request.hospital_id = event.hospital_id
    WHERE event.hospital_id = p_hospital_id AND event.action = 'reorder' AND request.status IN ('pending', 'acknowledged')
    ORDER BY event.request_id, event.occurred_at DESC, event.id DESC
  ), visible_events AS (
    SELECT * FROM recent_events
    UNION
    SELECT * FROM latest_active_reorders
  )
  SELECT jsonb_build_object(
    'revision', coalesce((SELECT revision FROM public.acute_request_queues WHERE hospital_id = p_hospital_id), 0),
    'requests', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY queue_position NULLS LAST, updated_at DESC, id) FROM visible_requests r), '[]'::jsonb),
    'events', coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY occurred_at DESC, id DESC) FROM visible_events e), '[]'::jsonb),
    'historyLimited', (SELECT count(*) > 200 FROM public.acute_requests WHERE hospital_id = p_hospital_id AND status IN ('completed', 'cancelled'))
      OR (SELECT count(*) > 1000 FROM public.acute_request_events WHERE hospital_id = p_hospital_id)
  );
$$;
REVOKE ALL ON FUNCTION public.get_acute_requests_snapshot(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_acute_requests_snapshot(text) TO service_role;

CREATE FUNCTION public.apply_acute_request_command(
  p_hospital_id text, p_actor_id uuid, p_expected_revision bigint, p_command jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_role text;
  v_actor_name text;
  v_module public.app_modules%ROWTYPE;
  v_revision bigint;
  v_action text := p_command ->> 'action';
  v_input jsonb := p_command -> 'input';
  v_reason text := btrim(coalesce(p_command ->> 'reason', ''));
  v_request_id uuid;
  v_old public.acute_requests%ROWTYPE;
  v_new public.acute_requests%ROWTYPE;
  v_other public.acute_requests%ROWTYPE;
  v_order uuid[];
  v_count integer;
  v_position integer;
  v_room text;
  v_now timestamptz := now();
BEGIN
  -- Row lock is a real queue version, not only a dummy locking record.
  INSERT INTO public.acute_request_queues (hospital_id) VALUES (p_hospital_id) ON CONFLICT DO NOTHING;
  SELECT revision INTO v_revision FROM public.acute_request_queues WHERE hospital_id = p_hospital_id FOR UPDATE;

  SELECT role, left(coalesce(name, 'Uživatel'), 160) INTO v_role, v_actor_name
  FROM public.app_users WHERE id = p_actor_id AND is_active = true FOR SHARE;
  IF v_role IS NULL OR v_role NOT IN ('superadmin', 'admin', 'aro', 'cos', 'primar') THEN
    RAISE EXCEPTION 'ACUTE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_module FROM public.app_modules WHERE id = 'acute-requests' AND hospital_id = p_hospital_id FOR SHARE;
  IF NOT FOUND OR v_module.is_enabled IS DISTINCT FROM true
    OR (v_role <> 'superadmin' AND NOT (v_role = ANY(coalesce(v_module.allowed_roles, ARRAY[]::text[])))) THEN
    RAISE EXCEPTION 'ACUTE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF v_role <> 'superadmin' THEN
    PERFORM 1 FROM public.hospital_user_memberships WHERE hospital_id = p_hospital_id AND user_id::text = p_actor_id::text FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision <> v_revision THEN
    RAISE EXCEPTION 'ACUTE_CONFLICT' USING ERRCODE = '40001';
  END IF;
  IF v_action IS NULL OR v_action NOT IN ('create', 'update', 'acknowledge', 'reorder', 'cancel', 'complete')
    OR jsonb_typeof(p_command) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'ACUTE_INVALID' USING ERRCODE = '22023';
  END IF;
  IF v_action IN ('update', 'reorder', 'cancel', 'complete') AND (length(v_reason) NOT BETWEEN 1 AND 500) THEN
    RAISE EXCEPTION 'ACUTE_INVALID reason' USING ERRCODE = '22023';
  END IF;

  IF v_action IN ('create', 'update') THEN
    IF jsonb_typeof(v_input) IS DISTINCT FROM 'object' OR v_input ->> 'urgency' NOT IN ('emergent', 'urgent', 'expedited')
      OR v_input ->> 'urgency' IS NULL OR length(btrim(coalesce(v_input ->> 'procedureName', ''))) NOT BETWEEN 1 AND 160
      OR length(btrim(coalesce(v_input ->> 'department', ''))) NOT BETWEEN 1 AND 100
      OR length(coalesce(v_input ->> 'reference', '')) > 80 OR length(coalesce(v_input ->> 'description', '')) > 2000
      OR coalesce(v_input ->> 'estimatedDurationMinutes', '') !~ '^[0-9]{1,4}$'
      OR (v_input ->> 'estimatedDurationMinutes')::integer NOT BETWEEN 1 AND 1440 THEN
      RAISE EXCEPTION 'ACUTE_INVALID input' USING ERRCODE = '22023';
    END IF;
    IF (v_input ->> 'clinicalDecisionAt')::timestamptz > v_now + interval '1 minute' THEN
      RAISE EXCEPTION 'ACUTE_INVALID clinical decision' USING ERRCODE = '22023';
    END IF;
    v_room := nullif(v_input ->> 'proposedRoomId', '');
    IF v_room IS NOT NULL THEN
      PERFORM 1 FROM public.operating_rooms WHERE id = v_room AND hospital_id = p_hospital_id FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_INVALID room' USING ERRCODE = '22023'; END IF;
    END IF;
  END IF;

  IF v_action = 'create' THEN
    SELECT count(*) INTO v_count FROM public.acute_requests WHERE hospital_id = p_hospital_id AND status IN ('pending', 'acknowledged');
    IF v_count >= 500 THEN RAISE EXCEPTION 'ACUTE_INVALID queue full' USING ERRCODE = '22023'; END IF;
    INSERT INTO public.acute_requests (
      hospital_id, reference, procedure_name, department, description, urgency, estimated_duration_minutes,
      clinical_decision_at, latest_start_at, proposed_room_id, proposed_start_at, queue_position, created_by, received_at, updated_at
    ) VALUES (
      p_hospital_id, coalesce(v_input ->> 'reference', ''), v_input ->> 'procedureName', v_input ->> 'department', coalesce(v_input ->> 'description', ''),
      v_input ->> 'urgency', (v_input ->> 'estimatedDurationMinutes')::integer, (v_input ->> 'clinicalDecisionAt')::timestamptz,
      (v_input ->> 'latestStartAt')::timestamptz, v_room, (v_input ->> 'proposedStartAt')::timestamptz, v_count + 1, p_actor_id, v_now, v_now
    ) RETURNING * INTO v_new;
    INSERT INTO public.acute_request_events (hospital_id, request_id, action, actor_id, actor_name, new_position, changes, occurred_at)
    VALUES (p_hospital_id, v_new.id, 'create', p_actor_id, v_actor_name, v_new.queue_position, jsonb_build_object('after', to_jsonb(v_new)), v_now);
  ELSIF v_action = 'reorder' THEN
    IF jsonb_typeof(p_command -> 'orderedIds') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'ACUTE_INVALID order' USING ERRCODE = '22023'; END IF;
    SELECT array_agg(value::uuid ORDER BY ordinality) INTO v_order FROM jsonb_array_elements_text(p_command -> 'orderedIds') WITH ORDINALITY;
    SELECT count(*) INTO v_count FROM public.acute_requests WHERE hospital_id = p_hospital_id AND status IN ('pending', 'acknowledged');
    IF coalesce(array_length(v_order, 1), 0) <> v_count OR v_count = 0
      OR (SELECT count(DISTINCT id) FROM unnest(v_order) id) <> v_count
      OR (SELECT count(*) FROM public.acute_requests WHERE hospital_id = p_hospital_id AND status IN ('pending', 'acknowledged') AND id = ANY(v_order)) <> v_count THEN
      RAISE EXCEPTION 'ACUTE_INVALID order membership' USING ERRCODE = '22023';
    END IF;
    FOR v_other IN SELECT * FROM public.acute_requests WHERE hospital_id = p_hospital_id AND status IN ('pending', 'acknowledged') ORDER BY queue_position LOOP
      v_position := array_position(v_order, v_other.id);
      IF v_position <> v_other.queue_position THEN
        UPDATE public.acute_requests SET queue_position = v_position, revision = revision + 1, updated_at = v_now WHERE id = v_other.id;
        INSERT INTO public.acute_request_events (hospital_id, request_id, action, actor_id, actor_name, reason, previous_position, new_position, changes, occurred_at)
        VALUES (p_hospital_id, v_other.id, 'reorder', p_actor_id, v_actor_name, v_reason, v_other.queue_position, v_position, '{}'::jsonb, v_now);
      END IF;
    END LOOP;
  ELSE
    v_request_id := (p_command ->> 'requestId')::uuid;
    SELECT * INTO v_old FROM public.acute_requests WHERE id = v_request_id AND hospital_id = p_hospital_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ACUTE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
    IF v_old.status NOT IN ('pending', 'acknowledged') THEN RAISE EXCEPTION 'ACUTE_INVALID closed request' USING ERRCODE = '22023'; END IF;
    IF v_action = 'update' THEN
      UPDATE public.acute_requests SET
        reference = coalesce(v_input ->> 'reference', ''), procedure_name = v_input ->> 'procedureName', department = v_input ->> 'department',
        description = coalesce(v_input ->> 'description', ''), urgency = v_input ->> 'urgency', estimated_duration_minutes = (v_input ->> 'estimatedDurationMinutes')::integer,
        clinical_decision_at = (v_input ->> 'clinicalDecisionAt')::timestamptz, latest_start_at = (v_input ->> 'latestStartAt')::timestamptz,
        proposed_room_id = v_room, proposed_start_at = (v_input ->> 'proposedStartAt')::timestamptz, updated_at = v_now, revision = revision + 1
      WHERE id = v_request_id RETURNING * INTO v_new;
    ELSIF v_action = 'acknowledge' THEN
      IF v_old.status <> 'pending' THEN RAISE EXCEPTION 'ACUTE_INVALID already acknowledged' USING ERRCODE = '22023'; END IF;
      UPDATE public.acute_requests SET status = 'acknowledged', acknowledged_at = v_now, acknowledged_by = p_actor_id, updated_at = v_now, revision = revision + 1
      WHERE id = v_request_id RETURNING * INTO v_new;
    ELSE
      UPDATE public.acute_requests SET status = CASE WHEN v_action = 'complete' THEN 'completed' ELSE 'cancelled' END,
        queue_position = NULL, updated_at = v_now, revision = revision + 1 WHERE id = v_request_id RETURNING * INTO v_new;
      -- Every changed rank is recorded, even a gap closed after cancellation.
      FOR v_other IN SELECT * FROM public.acute_requests WHERE hospital_id = p_hospital_id AND queue_position > v_old.queue_position ORDER BY queue_position LOOP
        UPDATE public.acute_requests SET queue_position = queue_position - 1, revision = revision + 1, updated_at = v_now WHERE id = v_other.id;
        INSERT INTO public.acute_request_events (hospital_id, request_id, action, actor_id, actor_name, reason, previous_position, new_position, changes, occurred_at)
        VALUES (p_hospital_id, v_other.id, 'reorder', p_actor_id, v_actor_name, 'Posun po uzavření předchozího požadavku: ' || left(v_reason, 430), v_other.queue_position, v_other.queue_position - 1,
          jsonb_build_object('closedRequestId', v_request_id), v_now);
      END LOOP;
    END IF;
    INSERT INTO public.acute_request_events (hospital_id, request_id, action, actor_id, actor_name, reason, previous_position, new_position, changes, occurred_at)
    VALUES (p_hospital_id, v_request_id, v_action, p_actor_id, v_actor_name, v_reason, v_old.queue_position, v_new.queue_position,
      jsonb_build_object('before', to_jsonb(v_old), 'after', to_jsonb(v_new)), v_now);
  END IF;
  UPDATE public.acute_request_queues SET revision = revision + 1, updated_at = v_now WHERE hospital_id = p_hospital_id;
  RETURN public.get_acute_requests_snapshot(p_hospital_id);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_acute_request_command(text, uuid, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_acute_request_command(text, uuid, bigint, jsonb) TO service_role;

-- OFF by default in all existing hospitals; new hospitals clone default modules.
-- Conservative clinical roles are inherited only from the actual timeline access.
INSERT INTO public.app_modules (id, hospital_id, name, description, is_enabled, icon, accent_color, sort_order, allowed_roles)
SELECT 'acute-requests', hospital.id, 'Akutní výkony', 'Požadavky akutních výkonů, klinická naléhavost, pořadník a audit změn',
  false, 'Siren', '#FF5560', 3,
  ARRAY(SELECT role FROM unnest(coalesce(module.allowed_roles, ARRAY[]::text[])) role
    WHERE role IN ('admin', 'aro', 'cos', 'primar') ORDER BY role)
FROM public.hospitals hospital LEFT JOIN public.app_modules module ON module.hospital_id = hospital.id AND module.id = 'timeline'
ON CONFLICT (id, hospital_id) DO NOTHING;

COMMENT ON TABLE public.acute_requests IS 'Clinician-selected acute requests; proposals never reserve a room or change actual cycle statistics.';
COMMENT ON COLUMN public.acute_requests.estimated_duration_minutes IS 'Estimated surgical duration only; excludes unrecorded anesthesia, departure and cleaning.';
COMMENT ON COLUMN public.acute_requests.received_at IS 'Server-recorded receipt; operational waiting runs 24/7 and is not a working-time metric.';
COMMENT ON TABLE public.acute_request_events IS 'Append-only audited mutations; module disable never deletes history.';

COMMIT;
