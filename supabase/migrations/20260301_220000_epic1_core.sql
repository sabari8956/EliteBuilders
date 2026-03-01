-- Epic 1 core schema for auth profiles, challenges, and submissions.

create sequence if not exists user_profile_id_seq start 1;
create sequence if not exists challenge_id_seq start 1;
create sequence if not exists submission_id_seq start 1;

create or replace function public.next_prefixed_id(prefix text, seq_name text)
returns text
language plpgsql
as $$
declare
  next_number bigint;
begin
  execute format('select nextval(%L)', seq_name) into next_number;
  return prefix || '_' || lpad(next_number::text, 6, '0');
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id text primary key default public.next_prefixed_id('usr', 'user_profile_id_seq'),
  github_handle text not null unique,
  role text not null check (role in ('builder', 'sponsor', 'evaluator', 'admin')) default 'builder',
  github_url text,
  portfolio_url text,
  cv_metadata text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.challenges (
  id text primary key default public.next_prefixed_id('chl', 'challenge_id_seq'),
  title text not null,
  brief text not null,
  rubric jsonb not null,
  deadline timestamptz not null,
  prize text,
  sponsor_id text not null references public.user_profiles(id),
  status text not null check (status in ('draft', 'published')) default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.submissions (
  id text primary key default public.next_prefixed_id('sub', 'submission_id_seq'),
  challenge_id text not null references public.challenges(id),
  builder_id text not null references public.user_profiles(id),
  snapshot_ref text not null,
  status text not null check (
    status in (
      'draft',
      'submitted',
      'queued',
      'running',
      'ai_scored',
      'awaiting_human_review',
      'finalized',
      'failed',
      'disqualified'
    )
  ) default 'queued',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_profiles_github_handle on public.user_profiles(github_handle);
create index if not exists idx_challenges_status_deadline on public.challenges(status, deadline);
create index if not exists idx_submissions_challenge_id on public.submissions(challenge_id);
create index if not exists idx_submissions_builder_id on public.submissions(builder_id);

create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.touch_updated_at();

create trigger trg_challenges_updated_at
before update on public.challenges
for each row execute function public.touch_updated_at();

create trigger trg_submissions_updated_at
before update on public.submissions
for each row execute function public.touch_updated_at();

alter table public.user_profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.submissions enable row level security;

-- Hackathon permissive policies (tighten after MVP)
drop policy if exists user_profiles_open_select on public.user_profiles;
create policy user_profiles_open_select on public.user_profiles
for select
using (true);

drop policy if exists user_profiles_open_write on public.user_profiles;
create policy user_profiles_open_write on public.user_profiles
for all
using (true)
with check (true);

drop policy if exists challenges_open_select on public.challenges;
create policy challenges_open_select on public.challenges
for select
using (true);

drop policy if exists challenges_open_write on public.challenges;
create policy challenges_open_write on public.challenges
for all
using (true)
with check (true);

drop policy if exists submissions_open_select on public.submissions;
create policy submissions_open_select on public.submissions
for select
using (true);

drop policy if exists submissions_open_write on public.submissions;
create policy submissions_open_write on public.submissions
for all
using (true)
with check (true);
