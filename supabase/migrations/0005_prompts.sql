-- The questions the editor shows while writing, as reminders of what to say
-- more about. One row per user; no row means the app's default questions.
create table public.prompts (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  questions text[] not null default '{}',
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.prompts to authenticated;

alter table public.prompts enable row level security;

create policy "Users manage their own prompts" on public.prompts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
