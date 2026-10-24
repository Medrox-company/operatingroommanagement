-- Historical rows are append-only for hospital clients. Privileged import/reset
-- routes retain service-role maintenance after their existing authorization.
begin;

do $$
declare
  table_name text;
  policy_name text;
  column_names text;
begin
  foreach table_name in array array['room_status_history', 'notifications_log'] loop
    execute format('alter table public.%I enable row level security', table_name);
    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy %I on public.%I', policy_name, table_name);
    end loop;

    execute format('revoke all privileges on table public.%I from public, anon, authenticated', table_name);
    -- Table-level REVOKE alone does not remove independently granted columns.
    select string_agg(format('%I', attname), ', ' order by attnum)
      into column_names
    from pg_attribute
    where attrelid = format('public.%I', table_name)::regclass
      and attnum > 0 and not attisdropped;
    execute format('revoke all privileges (%s) on table public.%I from public, anon, authenticated', column_names, table_name);
    execute format('grant select, insert on table public.%I to authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format(
      'create policy history_tenant_read on public.%I for select to authenticated using (hospital_id = ((select auth.jwt()) ->> ''hospital_id''))',
      table_name
    );
  end loop;
end $$;

-- The hospital JWT issuer verifies the signed subject's hospital access. The
-- referenced room must also belong to that hospital. Do not authorize canonical
-- step/cycle boundaries here: the operating-room transition trigger owns them.
create policy history_client_append on public.room_status_history
  for insert to authenticated
  with check (
    hospital_id = ((select auth.jwt()) ->> 'hospital_id')
    and nullif((select auth.jwt()) ->> 'sub', '') is not null
    and event_type in (
      'pause', 'resume', 'patient_call', 'patient_arrival', 'patient_arrived',
      'emergency_on', 'emergency_off', 'lock', 'unlock',
      'enhanced_hygiene_on', 'enhanced_hygiene_off', 'staff_change'
    )
    and exists (
      select 1 from public.operating_rooms room
      where room.id = room_status_history.operating_room_id
        and room.hospital_id = room_status_history.hospital_id
    )
  );

-- Only the record-only hygiene event is appended by the browser. Delivery
-- records (notify_*) and their recipient counts belong to send-notification.
create policy history_client_append on public.notifications_log
  for insert to authenticated
  with check (
    hospital_id = ((select auth.jwt()) ->> 'hospital_id')
    and nullif((select auth.jwt()) ->> 'sub', '') is not null
    and notification_type = 'infectious_patient'
    and recipient_count = 0
    and exists (
      select 1 from public.operating_rooms room
      where room.id = notifications_log.room_id
        and room.hospital_id = notifications_log.hospital_id
    )
  );

commit;
