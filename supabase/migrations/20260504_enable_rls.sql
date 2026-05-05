-- Add full_result column to store the complete AuditResultV2 for cache lookups
alter table audits add column if not exists full_result jsonb;

-- Enable Row Level Security on all tables
alter table profiles enable row level security;
alter table audits enable row level security;
alter table rate_limits enable row level security;

-- profiles: authenticated users can read/update their own row only
create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- audits: authenticated users can read/insert their own audits only
create policy "audits_select_own"
  on audits for select
  to authenticated
  using (auth.uid() = user_id);

create policy "audits_insert_own"
  on audits for insert
  to authenticated
  with check (auth.uid() = user_id);

-- rate_limits: no policies = service role only (service role bypasses RLS)
-- anon and authenticated roles have zero access to rate_limits
