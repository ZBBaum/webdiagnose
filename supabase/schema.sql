create table audits (
  id           uuid        primary key default gen_random_uuid(),
  url          text        not null,
  overall_grade text       not null,
  pillar_scores jsonb      not null,
  user_id      uuid        references auth.users(id),
  created_at   timestamptz not null default now()
);

-- Run this if the table already exists:
-- alter table audits add column user_id uuid references auth.users(id);

create table rate_limits (
  identifier text primary key,
  count      integer     not null default 0,
  reset_at   timestamptz not null
);
