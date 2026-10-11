-- Additive, server-only email protection. No clinical rows are changed.
-- Version matches the production migration recorded by Supabase MCP.
BEGIN;
CREATE SCHEMA IF NOT EXISTS email_security;
REVOKE ALL ON SCHEMA email_security FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA email_security TO service_role;

CREATE TABLE email_security.dispatches (
  hospital_id text NOT NULL REFERENCES public.hospitals(id),
  request_id uuid NOT NULL,
  user_id text NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  intent_hash text NOT NULL CHECK (intent_hash ~ '^[0-9a-f]{64}$'),
  recipient_count integer NOT NULL CHECK (recipient_count BETWEEN 1 AND 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hospital_id, request_id)
);
CREATE INDEX email_dispatch_intent_idx ON email_security.dispatches (hospital_id, intent_hash, created_at DESC);
CREATE INDEX email_dispatch_retention_idx ON email_security.dispatches (created_at);
CREATE TABLE email_security.deliveries (
  hospital_id text NOT NULL,
  request_id uuid NOT NULL,
  recipient_hash text NOT NULL CHECK (recipient_hash ~ '^[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'sending', 'sent', 'failed', 'unknown')),
  provider_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hospital_id, request_id, recipient_hash),
  FOREIGN KEY (hospital_id, request_id) REFERENCES email_security.dispatches(hospital_id, request_id) ON DELETE CASCADE
);
CREATE TABLE email_security.quotas (
  scope text NOT NULL,
  bucket timestamptz NOT NULL,
  used integer NOT NULL CHECK (used >= 0),
  PRIMARY KEY (scope, bucket)
);
CREATE INDEX email_quota_retention_idx ON email_security.quotas (bucket);
ALTER TABLE email_security.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_security.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_security.quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA email_security FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA email_security TO service_role;
-- service_role bypasses RLS. Clients have neither grants nor policies.

CREATE FUNCTION public.reserve_email_dispatch(
  p_hospital_id text, p_user_id text, p_request_id uuid,
  p_payload_hash text, p_intent_hash text, p_recipient_hashes text[],
  p_user_per_minute integer, p_hospital_per_day integer, p_global_per_day integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_minute timestamptz;
  v_day timestamptz;
  v_count integer;
  v_existing email_security.dispatches%ROWTYPE;
  v_scope text;
  v_bucket timestamptz;
  v_limit integer;
  v_used integer;
  v_i integer;
BEGIN
  v_count := cardinality(p_recipient_hashes);
  IF p_hospital_id IS NULL OR p_hospital_id = '' OR p_user_id IS NULL OR p_user_id = ''
    OR p_request_id IS NULL OR p_payload_hash IS NULL OR p_payload_hash !~ '^[0-9a-f]{64}$'
    OR p_intent_hash IS NULL OR p_intent_hash !~ '^[0-9a-f]{64}$'
    OR v_count IS NULL OR v_count NOT BETWEEN 1 AND 50
    OR p_user_per_minute IS NULL OR p_user_per_minute NOT BETWEEN 1 AND 1000
    OR p_hospital_per_day IS NULL OR p_hospital_per_day NOT BETWEEN 1 AND 10000
    OR p_global_per_day IS NULL OR p_global_per_day NOT BETWEEN 1 AND 10000
    OR EXISTS (SELECT 1 FROM unnest(p_recipient_hashes) AS h WHERE h IS NULL OR h !~ '^[0-9a-f]{64}$')
    OR (SELECT count(DISTINCT h) FROM unnest(p_recipient_hashes) AS h) <> v_count
  THEN RAISE EXCEPTION 'invalid email reservation' USING ERRCODE = '22023'; END IF;
  -- One shared, short transaction. No provider/network calls while locked.
  PERFORM pg_advisory_xact_lock(70110420261004::bigint);
  v_now := clock_timestamp();
  v_minute := date_trunc('minute', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_day := date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  SELECT * INTO v_existing FROM email_security.dispatches
    WHERE hospital_id = p_hospital_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.user_id <> p_user_id OR v_existing.payload_hash <> p_payload_hash THEN
      RETURN jsonb_build_object('status', 'conflict');
    END IF;
    RETURN jsonb_build_object('status', 'duplicate', 'recipientCount', v_existing.recipient_count,
      'sentCount', (SELECT count(*) FROM email_security.deliveries WHERE hospital_id = p_hospital_id AND request_id = p_request_id AND state = 'sent'));
  END IF;
  IF EXISTS (SELECT 1 FROM email_security.dispatches WHERE hospital_id = p_hospital_id
    AND intent_hash = p_intent_hash AND created_at > v_now - interval '60 seconds') THEN
    RETURN jsonb_build_object('status', 'cooldown', 'retryAfterSec', 60);
  END IF;
  FOR v_i IN 1..3 LOOP
    v_scope := CASE v_i WHEN 1 THEN 'global' WHEN 2 THEN 'hospital:' || p_hospital_id ELSE 'user:' || p_user_id END;
    v_bucket := CASE WHEN v_i = 3 THEN v_minute ELSE v_day END;
    v_limit := CASE v_i WHEN 1 THEN p_global_per_day WHEN 2 THEN p_hospital_per_day ELSE p_user_per_minute END;
    SELECT used INTO v_used FROM email_security.quotas WHERE scope = v_scope AND bucket = v_bucket;
    IF COALESCE(v_used, 0) + v_count > v_limit THEN
      RETURN jsonb_build_object('status', 'limited', 'retryAfterSec',
        greatest(1, ceil(extract(epoch FROM (v_bucket + CASE WHEN v_i = 3 THEN interval '1 minute' ELSE interval '1 day' END - v_now)))));
    END IF;
  END LOOP;
  FOR v_i IN 1..3 LOOP
    v_scope := CASE v_i WHEN 1 THEN 'global' WHEN 2 THEN 'hospital:' || p_hospital_id ELSE 'user:' || p_user_id END;
    v_bucket := CASE WHEN v_i = 3 THEN v_minute ELSE v_day END;
    INSERT INTO email_security.quotas(scope, bucket, used) VALUES (v_scope, v_bucket, v_count)
      ON CONFLICT (scope, bucket) DO UPDATE SET used = email_security.quotas.used + EXCLUDED.used;
  END LOOP;
  INSERT INTO email_security.dispatches(hospital_id, request_id, user_id, payload_hash, intent_hash, recipient_count, created_at)
    VALUES (p_hospital_id, p_request_id, p_user_id, p_payload_hash, p_intent_hash, v_count, v_now);
  INSERT INTO email_security.deliveries(hospital_id, request_id, recipient_hash)
    SELECT p_hospital_id, p_request_id, h FROM unnest(p_recipient_hashes) AS h;
  RETURN jsonb_build_object('status', 'reserved');
END $$;

CREATE FUNCTION public.claim_email_delivery(p_hospital_id text, p_request_id uuid, p_recipient_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE email_security.deliveries SET state = 'sending', updated_at = clock_timestamp()
    WHERE hospital_id = p_hospital_id AND request_id = p_request_id AND recipient_hash = p_recipient_hash AND state = 'reserved';
  RETURN FOUND;
END $$;
CREATE FUNCTION public.finish_email_delivery(
  p_hospital_id text, p_request_id uuid, p_recipient_hash text, p_outcome text, p_provider_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('sent', 'failed', 'unknown')
    OR (p_provider_id IS NOT NULL AND length(p_provider_id) > 200)
  THEN RAISE EXCEPTION 'invalid email outcome' USING ERRCODE = '22023'; END IF;
  UPDATE email_security.deliveries SET state = p_outcome, provider_id = p_provider_id, updated_at = clock_timestamp()
    WHERE hospital_id = p_hospital_id AND request_id = p_request_id AND recipient_hash = p_recipient_hash AND state = 'sending';
  RETURN FOUND;
END $$;
-- Explicit bounded maintenance; dedup UUIDs retained 30 days. No content/address storage.
CREATE FUNCTION public.prune_email_dispatch_history()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(70110420261004::bigint);
  DELETE FROM email_security.dispatches WHERE (hospital_id, request_id) IN (
    SELECT hospital_id, request_id FROM email_security.dispatches
      WHERE created_at < now() - interval '30 days' ORDER BY created_at LIMIT 500);
  DELETE FROM email_security.quotas WHERE (scope, bucket) IN (
    SELECT scope, bucket FROM email_security.quotas
      WHERE bucket < now() - interval '2 days' ORDER BY bucket LIMIT 5000);
END $$;
REVOKE ALL ON FUNCTION public.reserve_email_dispatch(text,text,uuid,text,text,text[],integer,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_email_delivery(text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_email_delivery(text,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_email_dispatch_history() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_email_dispatch(text,text,uuid,text,text,text[],integer,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_email_delivery(text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_email_delivery(text,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_email_dispatch_history() TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
