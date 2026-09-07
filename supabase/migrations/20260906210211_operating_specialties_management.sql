-- Operační obory jsou konfigurační data konkrétního zdravotnického zařízení.
-- Historická přiřazení zůstávají navázána přes stabilní ID i po přejmenování
-- nebo deaktivaci oboru.

begin;

alter table public.departments
  add column if not exists sort_order integer not null default 0;

-- Sjednotí mezery ve starších názvech ještě před zavedením unikátnosti.
update public.departments
set name = regexp_replace(btrim(name), '\s+', ' ', 'g')
where name is distinct from regexp_replace(btrim(name), '\s+', ' ', 'g');

-- Případné starší duplicity sloučí bez ztráty rozpisu. Nejstarší ID zůstane
-- kanonické a všechny vazby se na něj před smazáním duplicity převedou.
create temporary table duplicate_department_map on commit drop as
select duplicate_id, keep_id
from (
  select
    id as duplicate_id,
    first_value(id) over (
      partition by hospital_id, lower(name)
      order by created_at nulls last, id
    ) as keep_id,
    row_number() over (
      partition by hospital_id, lower(name)
      order by created_at nulls last, id
    ) as duplicate_rank
  from public.departments
) ranked
where duplicate_rank > 1;

update public.room_specialty_allocations allocation
set department_id = duplicate.keep_id
from duplicate_department_map duplicate
where allocation.department_id = duplicate.duplicate_id;

update public.sub_departments sub_department
set department_id = duplicate.keep_id
from duplicate_department_map duplicate
where sub_department.department_id = duplicate.duplicate_id;

delete from public.departments department
using duplicate_department_map duplicate
where department.id = duplicate.duplicate_id;

with ranked as (
  select
    id,
    row_number() over (
      partition by hospital_id
      order by lower(name), id
    ) - 1 as position
  from public.departments
)
update public.departments department
set sort_order = ranked.position
from ranked
where department.id = ranked.id
  and department.sort_order = 0;

create unique index if not exists departments_hospital_normalized_name_key
  on public.departments (hospital_id, lower(name));

create index if not exists idx_departments_hospital_sort_name
  on public.departments (hospital_id, sort_order, name);

create index if not exists idx_room_specialty_allocations_hospital_department
  on public.room_specialty_allocations (department_id, hospital_id);

create index if not exists idx_room_specialty_allocations_hospital_room
  on public.room_specialty_allocations (operating_room_id, hospital_id);

do $$
begin
  alter table public.departments
    add constraint departments_name_format_check
    check (
      char_length(name) between 2 and 100
      and name = regexp_replace(btrim(name), '\s+', ' ', 'g')
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.departments
    add constraint departments_accent_color_check
    check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$');
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.departments
    add constraint departments_sort_order_check
    check (sort_order >= 0);
exception when duplicate_object then null;
end $$;

alter table public.departments enable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'departments'
  loop
    execute format('drop policy %I on public.departments', policy_name);
  end loop;
end $$;

create policy departments_tenant_select
  on public.departments
  for select
  to authenticated
  using (hospital_id = ((select auth.jwt()) ->> 'hospital_id'));

revoke all on table public.departments from anon, authenticated;
grant select on table public.departments to authenticated;
grant select, insert, update, delete on table public.departments to service_role;

alter table public.departments replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'departments'
     ) then
    alter publication supabase_realtime add table public.departments;
  end if;
end $$;

commit;
