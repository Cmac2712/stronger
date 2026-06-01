create table session_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id text not null,
  "order" int not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

alter table session_exercises enable row level security;

create policy "own session_exercises read"   on session_exercises for select using (user_id = auth.uid());
create policy "own session_exercises insert" on session_exercises for insert with check (user_id = auth.uid());
create policy "own session_exercises update" on session_exercises for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own session_exercises delete" on session_exercises for delete using (user_id = auth.uid());
