create extension if not exists pgcrypto;

create type public.participant_role as enum ('candidate', 'director');

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  candidate_code text unique not null,
  name text not null,
  branch text not null,
  semester text not null,
  instagram text not null,
  favorite_movie text not null,
  favorite_genre text not null,
  favorite_music text not null,
  match_intent text not null default 'either',
  gender text not null check (gender in ('Male', 'Female', 'Other')),
  role public.participant_role not null,
  status text not null default 'IN REVIEW' check (status in ('IN REVIEW', 'MATCHED')),
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.directors (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants (id) on delete cascade,
  name text not null,
  branch text not null,
  semester text not null,
  instagram text not null,
  favorite_movie text not null,
  favorite_genre text not null,
  favorite_music text not null,
  gender text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  candidate_a_id uuid not null references public.participants (id) on delete restrict,
  candidate_b_id uuid not null references public.participants (id) on delete restrict,
  score numeric not null,
  sub_scores jsonb,
  costume_set_id integer not null check (costume_set_id between 1 and 4),
  costume_theme text not null,
  serial text unique not null,
  status text not null default 'matched' check (status in ('matched', 'dissolved')),
  created_at timestamptz not null default now(),
  constraint matches_must_be_distinct check (candidate_a_id <> candidate_b_id)
);

create unique index if not exists participants_candidate_code_idx on public.participants (candidate_code);
create index if not exists participants_role_idx on public.participants (role);
create index if not exists participants_status_idx on public.participants (status);
create index if not exists matches_candidate_pair_idx on public.matches (candidate_a_id, candidate_b_id);
create index if not exists matches_created_at_idx on public.matches (created_at desc);

alter table public.participants enable row level security;
alter table public.directors enable row level security;
alter table public.matches enable row level security;

create policy "participants_are_publicly_readable" on public.participants
for select
using (true);

create policy "participants_can_insert_candidate_or_director" on public.participants
for insert
with check (
  (role = 'candidate' and name is not null and instagram is not null and favorite_movie is not null and favorite_music is not null) or
  (role = 'director' and name is not null and instagram is not null)
);

create policy "participants_are_not_publicly_updated" on public.participants
for update
using (false)
with check (false);

create policy "participants_are_not_publicly_deleted" on public.participants
for delete
using (false);

create policy "directors_are_publicly_readable" on public.directors
for select
using (true);

create policy "directors_are_not_publicly_modified" on public.directors
for insert
with check (false);

create policy "directors_are_not_publicly_updated" on public.directors
for update
using (false)
with check (false);

create policy "directors_are_not_publicly_deleted" on public.directors
for delete
using (false);

create policy "matches_are_publicly_readable" on public.matches
for select
using (true);

create policy "matches_are_not_publicly_modified" on public.matches
for insert
with check (false);

create policy "matches_are_not_publicly_updated" on public.matches
for update
using (false)
with check (false);

create policy "matches_are_not_publicly_deleted" on public.matches
for delete
using (false);

create or replace function public.create_match_if_eligible(
  candidate_a_id uuid,
  candidate_b_id uuid,
  score_value numeric,
  costume_set_id integer default 1
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_a public.participants;
  candidate_b public.participants;
  set_id integer;
  selected_theme text;
  insert_result public.matches;
begin
  if candidate_a_id is null or candidate_b_id is null then
    raise exception 'Both candidates are required.';
  end if;

  if candidate_a_id = candidate_b_id then
    raise exception 'A candidate cannot be matched with themselves.';
  end if;

  select * into candidate_a
  from public.participants
  where id = candidate_a_id
  for update;

  select * into candidate_b
  from public.participants
  where id = candidate_b_id
  for update;

  if candidate_a is null or candidate_b is null then
    raise exception 'Candidate records were not found.';
  end if;

  if candidate_a.role <> 'candidate' or candidate_b.role <> 'candidate' then
    raise exception 'Only candidate records may be matched.';
  end if;

  if candidate_a.status <> 'IN REVIEW' or candidate_b.status <> 'IN REVIEW' then
    raise exception 'Only pending candidates can be matched.';
  end if;

  if lower(candidate_a.gender) <> 'male' or lower(candidate_b.gender) <> 'female' then
    raise exception 'Only Male + Female pairs are allowed.';
  end if;

  if exists (
    select 1
    from public.matches
    where (
      (candidate_a_id = candidate_a_id and candidate_b_id = candidate_b_id) or
      (candidate_a_id = candidate_b_id and candidate_b_id = candidate_a_id)
    )
  ) then
    raise exception 'This candidate pair already exists.';
  end if;

  set_id := coalesce(costume_set_id, 1);
  if set_id not between 1 and 4 then
    set_id := 1;
  end if;

  selected_theme := case set_id
    when 1 then 'Midnight Black'
    when 2 then 'Burgundy Romance'
    when 3 then 'Ivory & Brown'
    else 'Midnight Blue'
  end;

  insert into public.matches (
    candidate_a_id,
    candidate_b_id,
    score,
    sub_scores,
    costume_set_id,
    costume_theme,
    serial,
    status
  ) values (
    candidate_a_id,
    candidate_b_id,
    coalesce(score_value, 0),
    jsonb_build_object('movie', 0, 'genre', 0, 'music', 0),
    set_id,
    selected_theme,
    'MATCH-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || candidate_a.candidate_code,
    'matched'
  ) returning * into insert_result;

  update public.participants
  set status = 'MATCHED', updated_at = now()
  where id in (candidate_a_id, candidate_b_id);

  return insert_result;
end;
$$;

create or replace function public.ensure_director_record(p_data jsonb)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  director_row public.participants;
  director_profile jsonb := p_data;
begin
  select * into director_row
  from public.participants
  where role = 'director'
  limit 1;

  if director_row is null then
    insert into public.participants (
      candidate_code,
      name,
      branch,
      semester,
      instagram,
      favorite_movie,
      favorite_genre,
      favorite_music,
      match_intent,
      gender,
      role,
      status
    ) values (
      coalesce(director_profile->>'candidate_code', 'DIR-001'),
      director_profile->>'name',
      director_profile->>'branch',
      director_profile->>'semester',
      director_profile->>'instagram',
      director_profile->>'favorite_movie',
      director_profile->>'favorite_genre',
      director_profile->>'favorite_music',
      coalesce(director_profile->>'match_intent', 'either'),
      coalesce(director_profile->>'gender', 'Female'),
      'director',
      'MATCHED'
    ) returning * into director_row;

    insert into public.directors (
      participant_id,
      name,
      branch,
      semester,
      instagram,
      favorite_movie,
      favorite_genre,
      favorite_music,
      gender
    ) values (
      director_row.id,
      director_row.name,
      director_row.branch,
      director_row.semester,
      director_row.instagram,
      director_row.favorite_movie,
      director_row.favorite_genre,
      director_row.favorite_music,
      director_row.gender
    );
  end if;

  return director_row;
end;
$$;

create or replace function public.next_candidate_code()
returns text
language sql
security definer
set search_path = public
as $$
  select 'PL-' || lpad(cast(coalesce(max(cast(split_part(candidate_code, '-', 2) as integer)), 0) + 1 as text), 3, '0')
  from public.participants
  where candidate_code ~ '^PL-[0-9]+$';
$$;

alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.matches;
