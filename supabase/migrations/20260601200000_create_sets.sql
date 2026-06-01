create table sets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_exercise_id uuid not null references session_exercises(id) on delete cascade,
  set_number int not null,
  reps int not null,
  weight numeric not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

alter table sets enable row level security;

create policy "own sets read"   on sets for select using (user_id = auth.uid());
create policy "own sets insert" on sets for insert with check (user_id = auth.uid());
create policy "own sets update" on sets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sets delete" on sets for delete using (user_id = auth.uid());
