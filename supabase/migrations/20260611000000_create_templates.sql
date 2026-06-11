create table templates (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exercise_ids text[] not null, -- ordered
  updated_at timestamptz not null,
  deleted_at timestamptz
);

alter table templates enable row level security;

create policy "own templates read"   on templates for select using (user_id = auth.uid());
create policy "own templates insert" on templates for insert with check (user_id = auth.uid());
create policy "own templates update" on templates for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own templates delete" on templates for delete using (user_id = auth.uid());
