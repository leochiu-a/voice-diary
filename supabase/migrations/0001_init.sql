-- Diary entries: one per journal moment, written as text and/or voice.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  entry_date date not null default current_date,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entries_user_date_idx on public.entries (user_id, entry_date desc, created_at desc);

-- Voice attachments. The audio lives in R2; this row holds its key and transcript.
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  object_key text not null unique,
  mime_type text not null,
  duration_ms integer,
  transcript text,
  transcript_status text not null default 'pending'
    check (transcript_status in ('pending', 'done', 'failed')),
  created_at timestamptz not null default now()
);

create index recordings_entry_idx on public.recordings (entry_id, created_at);

-- Signed-in users reach these tables through the Data API; RLS below limits them to their own rows.
grant select, insert, update, delete on public.entries, public.recordings to authenticated;

alter table public.entries enable row level security;
alter table public.recordings enable row level security;

create policy "Users manage their own entries" on public.entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage recordings on their own entries" on public.recordings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = (select auth.uid())
    )
  );
