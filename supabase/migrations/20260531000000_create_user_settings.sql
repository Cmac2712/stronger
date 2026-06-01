create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rest_duration_ms int not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
alter table user_settings enable row level security;
create policy "own row read"   on user_settings for select using (user_id = auth.uid());
create policy "own row insert" on user_settings for insert with check (user_id = auth.uid());
create policy "own row update" on user_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own row delete" on user_settings for delete using (user_id = auth.uid());
