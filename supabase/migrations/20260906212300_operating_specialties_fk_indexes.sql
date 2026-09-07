begin;

drop index if exists public.idx_room_specialty_allocations_hospital_department;
drop index if exists public.idx_room_specialty_allocations_hospital_room;

create index idx_room_specialty_allocations_hospital_department
  on public.room_specialty_allocations (department_id, hospital_id);

create index idx_room_specialty_allocations_hospital_room
  on public.room_specialty_allocations (operating_room_id, hospital_id);

drop policy if exists room_specialty_allocations_tenant_isolation
  on public.room_specialty_allocations;
create policy room_specialty_allocations_tenant_isolation
  on public.room_specialty_allocations
  for all
  to authenticated
  using (hospital_id = ((select auth.jwt()) ->> 'hospital_id'))
  with check (hospital_id = ((select auth.jwt()) ->> 'hospital_id'));

commit;
