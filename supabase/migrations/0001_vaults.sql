create table if not exists public.vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  schema_version text not null,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

create policy "Users can view own vault" on public.vaults for select using (auth.uid() = user_id);
create policy "Users can insert own vault" on public.vaults for insert with check (auth.uid() = user_id);
create policy "Users can update own vault" on public.vaults for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own vault" on public.vaults for delete using (auth.uid() = user_id);
