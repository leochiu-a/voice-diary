-- Local development only: Supabase applies this to the database in Docker
-- (on first start and on `supabase db reset`), never to a hosted project.
-- `pnpm bootstrap` runs it again for a database that predates it.
--
-- The demo account, which `pnpm bootstrap` fills with invented entries.
insert into public.allowed_emails (email) values ('demo@voice-diary.test')
on conflict do nothing;
