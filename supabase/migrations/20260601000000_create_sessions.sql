create table sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at bigint not null,
  ended_at bigint,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

alter table sessions enable row level security;

create policy "own sessions read"   on sessions for select using (user_id = auth.uid());
create policy "own sessions insert" on sessions for insert with check (user_id = auth.uid());
create policy "own sessions update" on sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sessions delete" on sessions for delete using (user_id = auth.uid());
