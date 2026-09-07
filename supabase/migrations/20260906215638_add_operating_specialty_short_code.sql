alter table public.departments
  add column if not exists short_code text;

with normalized as (
  select
    id,
    hospital_id,
    coalesce(
      nullif(
        upper(
          left(
            regexp_replace(
              translate(
                name,
                'ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž',
                'ACDEEINORSTUUYZACDEEINORSTUUYZ'
              ),
              '[^A-Za-z0-9]+',
              '',
              'g'
            ),
            6
          )
        ),
        ''
      ),
      'OBOR'
    ) as base_code,
    row_number() over (
      partition by hospital_id, upper(
        left(
          regexp_replace(
            translate(
              name,
              'ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž',
              'ACDEEINORSTUUYZACDEEINORSTUUYZ'
            ),
            '[^A-Za-z0-9]+',
            '',
            'g'
          ),
          6
        )
      )
      order by sort_order, name, id
    ) as duplicate_number
  from public.departments
  where short_code is null
)
update public.departments as departments
set short_code = case
  when duplicate_number = 1 then left(base_code, 10)
  else left(base_code, 7) || '-' || duplicate_number::text
end
from normalized
where departments.id = normalized.id;

alter table public.departments
  alter column short_code set not null;

alter table public.departments
  drop constraint if exists departments_short_code_format_check;

alter table public.departments
  add constraint departments_short_code_format_check
  check (
    char_length(short_code) between 2 and 10
    and short_code = btrim(short_code)
    and short_code = upper(short_code)
    and position('.' in short_code) = 0
  );

create unique index if not exists departments_hospital_short_code_unique
  on public.departments (hospital_id, lower(short_code));
