begin;

create index if not exists idx_room_specialty_allocations_hospital_department
  on public.room_specialty_allocations (department_id, hospital_id);

create index if not exists idx_room_specialty_allocations_hospital_room
  on public.room_specialty_allocations (operating_room_id, hospital_id);

drop policy if exists departments_tenant_select on public.departments;
create policy departments_tenant_select
  on public.departments
  for select
  to authenticated
  using (hospital_id = ((select auth.jwt()) ->> 'hospital_id'));

commit;
