-- Allocation configuration is written through the admin settings.schedule API.
-- Hospital membership permits reads, but cannot authorize configuration writes
-- or relationships to another hospital's rooms and departments.
begin;

-- Keep the preflight and constraint installation atomic with parent/child writes.
lock table public.departments, public.operating_rooms,
  public.room_specialty_allocations in share row exclusive mode;

do $$
declare
  invalid_count bigint;
begin
  select count(*) into invalid_count
  from public.room_specialty_allocations allocation
  left join public.operating_rooms room
    on room.id = allocation.operating_room_id
    and room.hospital_id = allocation.hospital_id
  left join public.departments department
    on department.id = allocation.department_id
    and department.hospital_id = allocation.hospital_id
  where room.id is null
    or (allocation.department_id is not null and department.id is null);

  if invalid_count > 0 then
    raise exception 'Allocation tenant integrity: % inconsistent rows', invalid_count
      using errcode = '23503',
      hint = 'Review and repair room_specialty_allocations parent/hospital mismatches, then rerun this migration. No schedule rows were changed.';
  end if;
end $$;

alter table public.departments
  add constraint departments_id_hospital_key unique (id, hospital_id);
alter table public.operating_rooms
  add constraint operating_rooms_id_hospital_key unique (id, hospital_id);

alter table public.room_specialty_allocations
  drop constraint room_specialty_allocations_department_id_fkey,
  drop constraint room_specialty_allocations_operating_room_id_fkey,
  add constraint room_specialty_allocations_department_hospital_fkey
    foreign key (department_id, hospital_id)
    references public.departments (id, hospital_id) on delete restrict,
  add constraint room_specialty_allocations_room_hospital_fkey
    foreign key (operating_room_id, hospital_id)
    references public.operating_rooms (id, hospital_id) on delete cascade;

-- MATCH SIMPLE (the default) preserves null departments for CLOSED/SERVICE.
-- Existing indexes already cover both composite child keys.
revoke all privileges on table public.room_specialty_allocations
  from public, anon, authenticated;
grant select on table public.room_specialty_allocations to authenticated;
grant select, insert, update, delete on table public.room_specialty_allocations
  to service_role;

drop policy room_specialty_allocations_tenant_isolation
  on public.room_specialty_allocations;
create policy room_specialty_allocations_tenant_isolation
  on public.room_specialty_allocations for select to authenticated
  using (hospital_id = ((select auth.jwt()) ->> 'hospital_id'));

commit;
