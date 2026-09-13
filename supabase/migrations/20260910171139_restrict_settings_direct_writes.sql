-- Configuration writes are performed by server routes that validate both the
-- signed hospital session and the relevant settings submodule. A browser JWT
-- must not be able to bypass those checks through PostgREST.

revoke all privileges on table public.staff from anon, authenticated;
grant select on table public.staff to authenticated;

-- Operating-room runtime state is intentionally written by room clients, but
-- structural settings (identity, department, order and weekly schedule) are
-- reserved for the settings.rooms server route.
revoke all privileges on table public.operating_rooms from anon, authenticated;
grant select on table public.operating_rooms to authenticated;
grant update (
  status,
  queue_count,
  operations_24h,
  is_emergency,
  is_locked,
  current_step_index,
  current_patient_id,
  current_procedure_id,
  estimated_end_time,
  doctor_id,
  nurse_id,
  anesthesiologist_id,
  updated_at,
  is_paused,
  patient_called_at,
  patient_arrived_at,
  phase_started_at,
  operation_started_at,
  status_history,
  completed_operations,
  hourly_operating_cost,
  is_enhanced_hygiene,
  enhanced_hygiene_at,
  paused_at,
  notice_message,
  notice_at,
  notice_sender,
  state_revision,
  aro_overtime_since
) on table public.operating_rooms to authenticated;
